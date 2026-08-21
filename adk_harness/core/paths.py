"""
Path resolution shared by the tools and the guardrails.

The tools resolve a model-supplied path so they can act on it; the guardrails
resolve the same path so they can decide whether acting on it is allowed.
Those two must agree exactly, or the check is validating a different string
than the one that gets opened — a classic TOCTOU-shaped hole, except the two
sides diverge by construction rather than by timing. Hence one function, used
by both.
"""

import os

from .config import WORKSPACE_DIR


def resolve(path: str) -> str:
    """Resolve a model-supplied path to a canonical absolute path.

    Relative paths are interpreted against the workspace root, so the model can
    say `notes.md` and mean `workspace/notes.md`. Absolute paths are left
    absolute — deliberately, because the guardrail must see the escape attempt
    in order to refuse it. Silently re-rooting `/etc/passwd` into the workspace
    would turn a refusal into a confusing "file not found".

    `~` is expanded before resolution, and symlinks are followed, so the
    returned path is what the filesystem will actually operate on.
    """
    expanded = os.path.expanduser(path)
    if not os.path.isabs(expanded):
        expanded = os.path.join(WORKSPACE_DIR, expanded)
    return os.path.realpath(expanded)


def is_inside_workspace(resolved_path: str) -> bool:
    """True when a *already-resolved* path lies inside the workspace root.

    Uses `os.path.commonpath` rather than `str.startswith`: a prefix test
    accepts `/tmp/workspace-evil` as being inside `/tmp/workspace`, because the
    string genuinely does start with it. Path-component comparison does not.
    """
    try:
        return os.path.commonpath([resolved_path, WORKSPACE_DIR]) == WORKSPACE_DIR
    except ValueError:
        # Raised when the paths are on different drives (Windows) and therefore
        # share no common component at all.
        return False


def display(resolved_path: str) -> str:
    """Render a resolved path relative to the workspace, for messages."""
    try:
        return os.path.relpath(resolved_path, WORKSPACE_DIR)
    except ValueError:
        return resolved_path
