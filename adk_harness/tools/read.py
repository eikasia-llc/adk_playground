"""The `read` tool — one of the harness's four native capabilities."""

import os

from ..core.paths import resolve, display


def read_file(path: str) -> str:
    """Read a text file from the workspace and return its contents.

    The contents come back with line numbers prefixed (e.g., "   1\ttext").
    Do NOT include these numbers in the `old` argument of edit_file.

    Args:
        path: Path to the file, relative to the workspace root.

    Returns:
        The numbered contents of the file, or a message explaining why it
        could not be read.
    """
    resolved = resolve(path)

    if not os.path.exists(resolved):
        return f"Cannot read '{path}': no such file."
    if os.path.isdir(resolved):
        return (
            f"Cannot read '{path}': it is a directory, not a file. "
            f"Use run_bash with `ls` to list it."
        )

    try:
        with open(resolved, "r", encoding="utf-8", errors="replace") as fh:
            content = fh.read()
    except OSError as exc:
        return f"Cannot read '{path}': {exc}"

    if not content:
        return f"'{display(resolved)}' exists but is empty."

    lines = content.splitlines()
    numbered = "\n".join(f"{i:>4}\t{line}" for i, line in enumerate(lines, 1))
    return f"{display(resolved)} ({len(lines)} lines):\n{numbered}"
