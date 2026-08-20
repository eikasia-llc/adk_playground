"""The HITL (Human-in-the-Loop) gate.

Intercepts mutating tool calls and pauses the loop to ask the human for 
approval. If refused, short-circuits the tool. If approved, allows it to run.
"""

from .tools import MUTATING_TOOLS


def before_tool_callback(tool, args: dict, tool_context) -> dict | None:
    name = getattr(tool, "name", "")
    if name not in MUTATING_TOOLS:
        return None

    confirmation = getattr(tool_context, "tool_confirmation", None)
    
    if not confirmation:
        args_str = ", ".join(f"{k}={v!r}" for k, v in args.items())
        # Truncate string if it's too long
        if len(args_str) > 160:
            args_str = args_str[:157] + "..."
            
        tool_context.request_confirmation(
            hint=f"Agent wants to run {name}({args_str}). Allow?",
            payload={"approved": True}
        )
        # Returning a dict short-circuits the tool. The runner intercepts this
        # because of the request_confirmation flag.
        return {"result": f"[Paused waiting for human approval to run {name}]"}

    if not confirmation.payload.get("approved"):
        return {"result": "REFUSED by human operator. The tool was not executed."}
        
    return None
