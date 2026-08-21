"""The `bash` tool — one of the harness's four native capabilities.

This is the tool that makes the harness genuinely capable and genuinely
dangerous. Everything Pi reaches through the shell — listing, searching,
running tests, invoking other programs — arrives here rather than as a
dedicated tool. See README.md for why v1 makes that trade.

Note what this module does NOT do: it does not decide whether a command is
allowed. That judgement lives in guardrails.py, so the whole safety boundary
is readable in one file instead of being spread across four tools.
"""

import subprocess

from ..core.config import BASH_TIMEOUT_SECONDS, WORKSPACE_DIR


def run_bash(command: str) -> str:
    """Run a shell command inside the workspace and return its output.

    The working directory is always the workspace root; cd does not persist.
    Standard output and standard error come back combined. Long output is
    truncated.

    Args:
        command: The shell command to execute.

    Returns:
        The command's combined output plus its exit status, or a message
        explaining why it could not be run.
    """
    if not command.strip():
        return "Cannot run an empty command."

    try:
        completed = subprocess.run(
            command,
            shell=True,
            cwd=WORKSPACE_DIR,
            capture_output=True,
            text=True,
            timeout=BASH_TIMEOUT_SECONDS,
            errors="replace",
        )
    except subprocess.TimeoutExpired:
        return (
            f"Command timed out after {BASH_TIMEOUT_SECONDS}s and was killed. "
            f"If it was meant to be long-running, that will not work here."
        )
    except OSError as exc:
        return f"Could not run the command: {exc}"

    output = (completed.stdout or "") + (completed.stderr or "")
    output = output.strip()

    if completed.returncode == 0:
        return output if output else "(command succeeded with no output)"

    # Returning the failure as a *string* rather than raising: a raised
    # exception ends the turn, whereas a returned error lets the model read
    # what went wrong and try something else.
    return f"Command exited with status {completed.returncode}.\n{output}".strip()
