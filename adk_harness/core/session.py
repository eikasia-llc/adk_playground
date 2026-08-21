"""Session lifecycle — the third thing a harness owns.

Per ADK_HARNESS_REF.md, the harness "creates, maintains, and tears down the
session. It owns state persistence, context window management, and any
cross-turn memory." This module is that responsibility, isolated.

The choice of service is the whole story here:

  InMemorySessionService  — state dies with the process.
  DatabaseSessionService  — state survives a restart.

A minimal harness like Pi has only the first, structurally. Being able to
close the terminal, reopen it, and still have the conversation is one of the
concrete things ADK adds, so the harness defaults to the persistent service
and treats in-memory as the fallback.

All four service methods are async in google-adk 1.27.0, including
create_session — which is easy to miss, because the signature returns
`Session` rather than a coroutine annotation.
"""

import uuid

from .config import APP_NAME, DEFAULT_USER_ID, SESSION_DB_URL
from .imports import DatabaseSessionService, InMemorySessionService


def build_session_service(persistent: bool = True):
    """Return a session service, falling back to in-memory if the DB fails.

    A broken SQLite file should degrade the harness to a forgetful one, not
    prevent it from starting at all.
    """
    if not persistent:
        return InMemorySessionService(), False
    try:
        return DatabaseSessionService(db_url=SESSION_DB_URL), True
    except Exception as exc:  # noqa: BLE001 - any driver failure is a fallback
        print(f"[harness] session store unavailable ({exc}); using in-memory.")
        return InMemorySessionService(), False


async def start_or_resume(service, session_id: str | None, user_id: str = DEFAULT_USER_ID):
    """Resume the named session if it exists, otherwise create it.

    Returns (session, resumed) so the caller can tell the user which happened —
    silently starting a fresh conversation when someone expected continuity is
    a bad surprise.
    """
    if session_id:
        existing = await service.get_session(
            app_name=APP_NAME, user_id=user_id, session_id=session_id
        )
        if existing is not None:
            return existing, True

    created = await service.create_session(
        app_name=APP_NAME,
        user_id=user_id,
        session_id=session_id or uuid.uuid4().hex[:12],
    )
    return created, False


async def list_session_ids(service, user_id: str = DEFAULT_USER_ID) -> list[str]:
    """Every session id this user has, most useful for `/sessions` in the REPL."""
    response = await service.list_sessions(app_name=APP_NAME, user_id=user_id)
    return [s.id for s in response.sessions]


async def end_session(service, session_id: str, user_id: str = DEFAULT_USER_ID) -> None:
    """Tear a session down permanently."""
    await service.delete_session(
        app_name=APP_NAME, user_id=user_id, session_id=session_id
    )
