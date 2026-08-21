"""The harness proper: the conversation loop.

This is the module that justifies the project. Per ADK_HARNESS_REF.md, "a
harness is the application that runs the AI agent loop... the only program in
the stack that talks directly to the LLM API." Here that program is `Runner`,
and this file is the thing that drives it.

Every other project in this playground is launched with `adk run` or `adk web`,
which means the CLI owns the loop and the project only supplies a `root_agent`.
This one owns the loop itself. That is the entire difference, and it is the
reason the file exists.

One deliberate choice: tool calls are printed as they happen. Watching dispatch
occur — the model asking for `read_file`, the harness executing it locally,
the result going back — is most of what this project is for. A silent harness
would work identically and teach nothing.
"""

import asyncio
import os
import sys

from .agent import build_agent
from .config import APP_NAME, DEFAULT_USER_ID
from .imports import Runner, types
from .session import build_session_service, end_session, list_session_ids, start_or_resume
from ..extensions.commands.registry import load_commands

BANNER = """\
adk_harness — a minimal agent harness built on ADK
  /help      commands        /sessions  list sessions
  /new       fresh session   /reset     delete this session
  /quit      exit (Ctrl-D also works)
"""

HELP = """\
Type a request and the agent will work in the workspace directory.
Tool calls are printed as they are dispatched.

  /sessions   list every stored session id
  /new        start a fresh session
  /reset      delete the current session and start a fresh one
  /quit       exit
"""


def _print_tool_calls(event) -> None:
    """Surface dispatch as it happens."""
    for call in event.get_function_calls():
        if call.name == "adk_request_confirmation":
            continue
        args = ", ".join(f"{k}={v!r}" for k, v in (call.args or {}).items())
        if len(args) > 160:
            args = args[:157] + "..."
        print(f"  \033[2m→ {call.name}({args})\033[0m", flush=True)

    for response in event.get_function_responses():
        if getattr(response, "name", "") == "adk_request_confirmation":
            continue
        result = response.response
        if isinstance(result, dict):
            result = result.get("result", result)
        text = str(result).replace("\n", " ")
        if len(text) > 160:
            text = text[:157] + "..."
        print(f"  \033[2m← {text}\033[0m", flush=True)


async def _run_turn(
    runner: Runner, 
    session_id: str, 
    message: str | None = None,
    function_responses: list[types.FunctionResponse] | None = None
) -> None:
    """One user turn: send it, stream the events, print the answer.

    This is the loop the harness owns. The `async for` is the agent loop —
    ADK calls the model, hands us tool-call events, executes the tools through
    our callbacks, and comes back with more events until the turn is final.
    """
    content = types.Content(role="user", parts=[types.Part(text=message)]) if message else None

    final_text: list[str] = []
    
    while True:
        pending_confirmations = []
        
        async for event in runner.run_async(
            user_id=DEFAULT_USER_ID, 
            session_id=session_id, 
            new_message=content,
            function_responses=function_responses
        ):
            _print_tool_calls(event)
            
            for call in event.get_function_calls():
                if call.name == "adk_request_confirmation":
                    pending_confirmations.append(call)

            if event.is_final_response() and event.content and event.content.parts:
                for part in event.content.parts:
                    if part.text:
                        final_text.append(part.text)
                        
        content = None
        function_responses = None
        
        if pending_confirmations:
            responses = []
            for call in pending_confirmations:
                hint = (call.args or {}).get("hint", "Confirm?")
                ans = input(f"\n\033[33m[HITL Gate] {hint}\033[0m [y/N]: ").strip().lower()
                approved = ans in ("y", "yes")
                responses.append(
                    types.FunctionResponse(
                        id=call.id,
                        name=call.name,
                        response={"approved": approved}
                    )
                )
            function_responses = responses
        else:
            break

    print("\n" + ("".join(final_text).strip() or "(no reply)") + "\n", flush=True)


def _require_key() -> bool:
    if os.environ.get("GEMINI_API_KEY"):
        return True
    print(
        "GEMINI_API_KEY is not set. Copy adk_harness/.env.example to "
        "adk_harness/.env and fill it in, or export the variable.",
        file=sys.stderr,
    )
    return False


async def once(message: str, persistent: bool = False, session_id: str | None = None) -> int:
    """Run a single turn and exit. Non-interactive; used for smoke tests."""
    if not _require_key():
        return 1

    service, _ = build_session_service(persistent=persistent)
    session, _ = await start_or_resume(service, session_id)
    runner = Runner(app_name=APP_NAME, agent=build_agent(), session_service=service)
    await _run_turn(runner, session.id, message)
    return 0


async def repl(persistent: bool = True, session_id: str | None = None) -> int:
    if not os.environ.get("GEMINI_API_KEY"):
        print(
            "GEMINI_API_KEY is not set. Copy adk_harness/.env.example to "
            "adk_harness/.env and fill it in, or export the variable.",
            file=sys.stderr,
        )
        return 1

    service, is_persistent = build_session_service(persistent=persistent)
    session, resumed = await start_or_resume(service, session_id)

    runner = Runner(
        app_name=APP_NAME,
        agent=build_agent(),
        session_service=service,
    )

    print(BANNER)
    store = "persistent" if is_persistent else "in-memory (this session will not survive exit)"
    print(f"session {session.id} — {'resumed' if resumed else 'new'}, {store}\n")

    dynamic_commands = load_commands()
    if dynamic_commands:
        print("Dynamic Commands:")
        for cmd in dynamic_commands:
            print(f"  {cmd:<10} (frozen prompt)")
        print()

    while True:
        try:
            line = input("\033[1m› \033[0m").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nbye")
            return 0

        if not line:
            continue

        if line in ("/quit", "/exit"):
            print("bye")
            return 0
        if line == "/help":
            print(HELP)
            if dynamic_commands:
                print("Dynamic Commands:")
                for cmd in dynamic_commands:
                    print(f"  {cmd:<10} (frozen prompt)")
                print()
            continue
        if line == "/sessions":
            ids = await list_session_ids(service)
            print("  " + ("\n  ".join(ids) if ids else "(none)") + "\n")
            continue
        if line in ("/new", "/reset"):
            if line == "/reset":
                await end_session(service, session.id)
                print(f"deleted {session.id}")
            session, _ = await start_or_resume(service, None)
            print(f"session {session.id} — new\n")
            continue
            
        if line in dynamic_commands:
            print(f"\033[36m[Command Expanded]\033[0m {dynamic_commands[line]}")
            line = dynamic_commands[line]

        try:
            await _run_turn(runner, session.id, line)
        except KeyboardInterrupt:
            # Interrupting a turn should abandon that turn, not the process.
            print("\n(turn interrupted)\n")
        except Exception as exc:  # noqa: BLE001 - a REPL must survive its turns
            print(f"\n\033[31mturn failed: {exc}\033[0m\n", file=sys.stderr)


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    session_id = None
    persistent = True
    one_shot = None

    for i, arg in enumerate(argv):
        if arg == "--ephemeral":
            persistent = False
        elif arg == "--session" and i + 1 < len(argv):
            session_id = argv[i + 1]
        elif arg == "--once" and i + 1 < len(argv):
            one_shot = argv[i + 1]

    try:
        if one_shot is not None:
            return asyncio.run(
                once(one_shot, persistent=persistent, session_id=session_id)
            )
        return asyncio.run(repl(persistent=persistent, session_id=session_id))
    except KeyboardInterrupt:
        return 130
