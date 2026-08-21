"""The safety layer — the first thing this harness has that Pi does not.

Per ADK_HARNESS_REF.md § "Callback-Based Guardrails", `before_tool_callback`
is *the primary mechanism for tool-level safety*: it fires before any tool
executes, sees the arguments, and can return a replacement result to
short-circuit the call entirely. That is a genuine capability boundary rather
than an instruction the model may or may not follow, and it is why the whole
sandbox lives in this one file instead of being scattered across four tools.

## What this layer does and does not promise

The path sandbox is a real boundary. Every filesystem tool takes its target as
a named argument, the guardrail resolves that argument exactly as the tool
will, and refuses anything landing outside the workspace. There is no path a
`read_file`/`write_file`/`edit_file` call can name that gets around it.

The bash denylist is **not** a real boundary, and this file should not pretend
otherwise. `run_bash` takes an opaque shell string; deciding what that string
will do requires interpreting the shell, and pattern-matching over it is
defeatable by an adversarial model with modest effort (`r''m`, base64, a
here-doc, an env var holding the path). It raises the cost of an accident and
catches the obvious destructive shapes. It does not contain a determined
attacker.

That gap is exactly why the reference names container-level isolation as the
final layer of defence rather than an optional extra. Until `adk_harness` runs
in an ephemeral non-root container, `run_bash` should be pointed at code you
would be willing to run yourself.

## Two tiers, deliberately separate

  guardrails  — categorically forbidden. No human asked; the call never runs.
  HITL gate   — allowed but consequential. Pause and ask. See the gate module.

Collapsing them makes one of the two useless: if everything prompts, the
operator clicks through without reading; if nothing does, the boundary is
advisory.
"""

import re

from ..core.config import MAX_TOOL_OUTPUT_CHARS, WORKSPACE_DIR
from ..core.paths import display, is_inside_workspace, resolve

# Which argument carries a filesystem path, per tool. Tools absent from this
# map take no path argument and are skipped by the path check.
PATH_ARGS = {
    "read_file": "path",
    "write_file": "path",
    "edit_file": "path",
    "grep_search": "path",
    "glob_search": "path",
}

# Shell shapes that are refused outright. Each entry is (pattern, reason).
# Kept small and readable on purpose — a sprawling denylist invites the belief
# that it is comprehensive, which it is not and cannot be.
BASH_DENYLIST = [
    (r"\brm\s+(-[a-zA-Z]*\s+)*-?[a-zA-Z]*[rf]", "recursive or forced deletion"),
    (r"\bsudo\b|\bdoas\b", "privilege escalation"),
    (r"\b(curl|wget)\b[^|;&]*\|\s*(ba|z|fi|)sh", "piping a download into a shell"),
    (r"\b(chmod|chown)\s+(-[a-zA-Z]+\s+)*(777|-R\b)", "broad permission change"),
    (r"~/\.(ssh|aws|gnupg|config/gcloud)|\$HOME/\.(ssh|aws)", "access to credential directories"),
    (r"\bgit\s+(push|commit|reset\s+--hard|clean\s+-[a-z]*f)", "repository mutation"),
    (r">\s*/dev/(sd|nvme|disk)", "raw device write"),
    (r"\b(shutdown|reboot|halt|mkfs|dd\s+if=)", "destructive system operation"),
    (r":\(\)\s*\{.*\}\s*;\s*:", "fork bomb"),
]

# Path-escape heuristics for the bash string. Weaker than the real path check
# above — see the module docstring — but it catches the honest mistakes.
BASH_ESCAPE_PATTERNS = [
    (r"(^|[\s'\"=])\.\.($|[/\s'\"])", "a parent-directory reference (`..`)"),
    (r"(^|[\s'\"=])(/|~)", "an absolute or home-relative path"),
]


def _refuse(message: str) -> dict:
    """Short-circuit the tool call with a refusal the model can read.

    Returning a dict from before_tool_callback replaces the tool's result
    entirely — the function is never invoked. The `result` key matches how ADK
    wraps a string-returning FunctionTool, so the model sees a refusal in the
    same shape as an ordinary tool response and can adapt to it.
    """
    return {"result": f"REFUSED by harness guardrail: {message}"}


def check_path_argument(tool_name: str, args: dict) -> dict | None:
    """Refuse a filesystem tool whose target lands outside the workspace."""
    arg_name = PATH_ARGS.get(tool_name)
    if arg_name is None:
        return None

    raw = args.get(arg_name)
    if not isinstance(raw, str) or not raw:
        return None

    # Resolved with the same function the tool uses, so the string checked is
    # the string opened. Symlinks are followed here, which is what makes a
    # symlink planted inside the workspace and pointing out of it fail.
    resolved = resolve(raw)
    if is_inside_workspace(resolved):
        return None

    # Exception for read-only access to extensions/skills
    if tool_name == "read_file":
        import os
        from ..core.config import PACKAGE_DIR
        skills_dir = os.path.join(PACKAGE_DIR, "extensions", "skills")
        try:
            if os.path.commonpath([resolved, skills_dir]) == skills_dir:
                return None
        except ValueError:
            pass

    return _refuse(
        f"'{raw}' resolves to {resolved}, which is outside the workspace "
        f"({WORKSPACE_DIR}). Only paths inside the workspace may be accessed."
    )


def check_bash_command(args: dict) -> dict | None:
    """Refuse shell commands matching a destructive or escaping shape."""
    command = args.get("command")
    if not isinstance(command, str) or not command.strip():
        return None

    for pattern, reason in BASH_DENYLIST:
        if re.search(pattern, command):
            return _refuse(f"the command matches a blocked pattern ({reason}).")

    for pattern, reason in BASH_ESCAPE_PATTERNS:
        if re.search(pattern, command):
            return _refuse(
                f"the command contains {reason}, which may reach outside the "
                f"workspace. Use paths relative to the workspace root."
            )

    return None


def before_tool_callback(tool, args: dict, tool_context) -> dict | None:
    """The safety boundary. Returns None to allow, or a dict to short-circuit.

    THE PARAMETER NAMES ARE PART OF THE CONTRACT. google-adk 1.27.0 invokes
    this purely by keyword — `callback(tool=..., args=..., tool_context=...)`
    — so renaming `tool_context` to anything else raises TypeError at the
    first tool call, not at import. The published type annotation says the
    third argument is `Context`, which is the same class as `ToolContext`, but
    the *keyword* is `tool_context`; the two do not have to agree and here
    they do not.
    """
    name = getattr(tool, "name", "")

    refusal = check_path_argument(name, args)
    if refusal is not None:
        return refusal

    if name == "run_bash":
        return check_bash_command(args)

    return None


def after_tool_callback(tool, args: dict, tool_context, tool_response) -> dict | None:
    """Truncate oversized tool output before it enters conversation history.

    Context-window management is a harness responsibility per the reference.
    Without this, one `cat` of a large file permanently occupies the context
    for the rest of the session — the model cannot un-see it, and every
    subsequent turn pays for it.
    """
    if not isinstance(tool_response, dict):
        return None

    result = tool_response.get("result")
    if not isinstance(result, str) or len(result) <= MAX_TOOL_OUTPUT_CHARS:
        return None

    kept = result[:MAX_TOOL_OUTPUT_CHARS]
    dropped = len(result) - MAX_TOOL_OUTPUT_CHARS
    return {
        "result": (
            f"{kept}\n\n[harness: truncated — {dropped} more characters were "
            f"dropped to protect the context window. Narrow the request if you "
            f"need the rest.]"
        )
    }
