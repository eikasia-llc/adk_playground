"""The agent definition — model, system prompt, tool list, guardrail hooks.

Note how little is here. That is deliberate: ADK_HARNESS_REF.md observes that
Pi keeps "one of the shortest system prompts among major agents" and that low
context overhead is a real property, not an aesthetic one. Every sentence
added below is paid for on every single turn, so the prompt says what the
model cannot infer from the tool docstrings and stops.

The `build_agent` indirection exists because the guardrails are installed as
callbacks *on the agent*. Keeping construction in a function means the loop
can build an agent with them, and a test can build one without.
"""

from . import guardrails
from .config import MODEL
from .imports import LlmAgent
from .tools import ALL_TOOLS

# Sentinel distinguishing "caller said nothing" (install the guardrails) from
# "caller explicitly passed None" (build an unguarded agent, for tests that
# want to observe raw tool behaviour). Defaulting to None directly would make
# the unsafe configuration the one you get by forgetting.
_DEFAULT = object()

INSTRUCTION = """You are a coding agent working inside a sandboxed workspace \
directory. You have four tools: read_file, write_file, edit_file, and run_bash.

Everything you can reach lives under the workspace root. Paths are relative to \
it. You have no tools beyond these four — use run_bash for anything else you \
need, including listing directories and searching file contents.

Read a file before you edit it. Prefer edit_file over write_file when changing \
part of an existing file. If a tool refuses a request, read what it says and \
adjust rather than retrying the same call.
"""


def build_agent(
    before_tool_callback=_DEFAULT,
    after_tool_callback=_DEFAULT,
    name: str = "harness_agent",
) -> LlmAgent:
    """Construct the harness's LlmAgent, guarded by default.

    Args:
        before_tool_callback: Fires before any tool runs. This is the primary
            tool-level safety mechanism — it sees the arguments and can return
            a dict to short-circuit the call entirely. Defaults to the
            workspace sandbox in guardrails.py; pass None to disable it.
        after_tool_callback: Fires after a tool returns, before the result
            enters conversation history. Defaults to output truncation.
        name: Agent name, surfaced in event authorship.
    """
    if before_tool_callback is _DEFAULT:
        before_tool_callback = guardrails.before_tool_callback
    if after_tool_callback is _DEFAULT:
        after_tool_callback = guardrails.after_tool_callback

    return LlmAgent(
        name=name,
        model=MODEL,
        instruction=INSTRUCTION,
        tools=ALL_TOOLS,
        before_tool_callback=before_tool_callback,
        after_tool_callback=after_tool_callback,
    )
