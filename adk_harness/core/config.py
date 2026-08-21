"""
Single source of truth for the harness sandbox boundary.

Both the tools (which run inside the workspace) and the guardrails (which
enforce that nothing escapes it) need to agree on exactly one path. Deriving
it in two places is how sandboxes develop holes, so it is derived here once.

`realpath` matters more than it looks. On macOS the system temp directory is a
symlink (`/tmp` -> `/private/tmp`), so a boundary check that compares a
resolved candidate path against an *unresolved* base will reject legitimate
paths — or, worse, accept illegitimate ones. Both sides of the comparison are
resolved: the base here, the candidate in guardrails.py.
"""

import os

# `adk run` loads a project's .env automatically. This harness does not use
# `adk run`, so it has to do that itself — otherwise GEMINI_API_KEY sitting in
# adk_harness/.env would be silently ignored, which is a confusing first-run
# failure. python-dotenv ships as a google-adk dependency.
try:
    from dotenv import load_dotenv

    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
except ImportError:  # pragma: no cover - dotenv is an ADK dependency
    pass

# adk_harness/
PACKAGE_DIR = os.path.realpath(os.path.dirname(__file__))

# adk_harness/workspace/ — the only directory the agent may read or write.
# Override with HARNESS_WORKSPACE to point the agent at a different tree.
WORKSPACE_DIR = os.path.realpath(
    os.environ.get("HARNESS_WORKSPACE", os.path.join(PACKAGE_DIR, "workspace"))
)

# Where DatabaseSessionService persists conversations. Gitignored via the
# repo-level `session.db` rule.
#
# The `+aiosqlite` driver is required, not cosmetic: ADK 1.27.0 builds the
# store with SQLAlchemy's `create_async_engine`, and a plain `sqlite://` URL
# resolves to the synchronous pysqlite driver and raises "The asyncio
# extension requires an async driver to be used". aiosqlite ships as a
# google-adk dependency.
SESSION_DB_URL = os.environ.get(
    "HARNESS_SESSION_DB",
    f"sqlite+aiosqlite:///{os.path.join(PACKAGE_DIR, 'session.db')}",
)

APP_NAME = "adk_harness"
DEFAULT_USER_ID = "local"

# Model. ADK_HARNESS_REF.md recommends gemini-2.5-flash as the default for
# orchestration and tool-calling work, but that guidance has expired: as of
# 2026-08-20 the API returns 404 for it — "no longer available to new users" —
# while still listing it from models.list(). Pinning an explicit version string
# is what caused that breakage, so this defaults to the rolling alias instead.
# gemini-3.6-flash also works (and is what the 404 message recommends), despite
# not appearing in models.list() either. Override with HARNESS_MODEL.
MODEL = os.environ.get("HARNESS_MODEL", "gemini-flash-latest")

# Cap on how much a single tool result may contribute to the conversation
# history. Context-window management is a harness responsibility; one runaway
# `bash` call would otherwise poison the whole session.
MAX_TOOL_OUTPUT_CHARS = int(os.environ.get("HARNESS_MAX_TOOL_OUTPUT", "8000"))

# Wall-clock ceiling on a single bash invocation, in seconds.
BASH_TIMEOUT_SECONDS = int(os.environ.get("HARNESS_BASH_TIMEOUT", "60"))
