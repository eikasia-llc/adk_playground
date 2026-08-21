"""The `edit` tool — one of the harness's four native capabilities."""

import os

from ..core.paths import resolve, display


def edit_file(path: str, old: str, new: str) -> str:
    """Replace an exact string in a workspace file with a new one.

    Read the file first. `old` must match the file's text EXACTLY — including
    indentation and whitespace, and WITHOUT the line-number prefixes that
    read_file adds for display.

    `old` must appear exactly once. If it appears several times the edit is
    refused rather than guessed at: include more surrounding context to make
    the match unique. To create a new file, use write_file.

    Args:
        path: Path to the file, relative to the workspace root.
        old: The exact text to find.
        new: The text to replace it with.

    Returns:
        A short confirmation, or a message explaining why the edit failed.
    """
    resolved = resolve(path)

    if not os.path.exists(resolved):
        return f"Cannot edit '{path}': no such file. Use write_file to create it."
    if os.path.isdir(resolved):
        return f"Cannot edit '{path}': it is a directory."
    if old == new:
        return f"Cannot edit '{path}': `old` and `new` are identical — nothing to do."
    if not old:
        return (
            f"Cannot edit '{path}': `old` is empty. To replace the whole file, "
            f"use write_file."
        )

    try:
        with open(resolved, "r", encoding="utf-8") as fh:
            content = fh.read()
    except (OSError, UnicodeDecodeError) as exc:
        return f"Cannot edit '{path}': {exc}"

    occurrences = content.count(old)
    if occurrences == 0:
        # Failing loudly here is the point. A "helpful" fuzzy match would let
        # the model believe an edit landed where it did not.
        return (
            f"Cannot edit '{path}': the text to replace was not found. "
            f"Re-read the file and match its exact characters, without the "
            f"line-number prefixes."
        )
    if occurrences > 1:
        return (
            f"Cannot edit '{path}': the text to replace appears {occurrences} "
            f"times. Include more surrounding context so the match is unique."
        )

    try:
        with open(resolved, "w", encoding="utf-8") as fh:
            fh.write(content.replace(old, new, 1))
    except OSError as exc:
        return f"Cannot edit '{path}': {exc}"

    return f"Edited {display(resolved)} (1 replacement)."
