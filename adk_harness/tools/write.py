"""The `write` tool — one of the harness's four native capabilities."""

import os

from ..paths import resolve, display


def write_file(path: str, content: str) -> str:
    """Write text to a file in the workspace, creating or overwriting it.

    This replaces the ENTIRE file. To change part of an existing file, use
    edit_file instead — it is safer and cheaper than rewriting the whole thing.
    Parent directories are created automatically.

    Args:
        path: Path to the file, relative to the workspace root.
        content: The complete new contents of the file.

    Returns:
        A short confirmation, or a message explaining why the write failed.
    """
    resolved = resolve(path)

    if os.path.isdir(resolved):
        return f"Cannot write '{path}': it is an existing directory."

    existed = os.path.exists(resolved)
    try:
        os.makedirs(os.path.dirname(resolved), exist_ok=True)
        with open(resolved, "w", encoding="utf-8") as fh:
            fh.write(content)
    except OSError as exc:
        return f"Cannot write '{path}': {exc}"

    verb = "Overwrote" if existed else "Created"
    line_count = len(content.splitlines())
    # Deliberately not echoing the content back: it is already in the
    # conversation, and repeating it doubles the token cost of every write.
    return f"{verb} {display(resolved)} ({line_count} lines, {len(content)} chars)."
