import pytest
from adk_harness.core.session import build_session_service, start_or_resume, list_session_ids, end_session
from adk_harness.core.imports import InMemorySessionService

@pytest.mark.asyncio
async def test_build_session_service_non_persistent():
    service, is_db = build_session_service(persistent=False)
    assert isinstance(service, InMemorySessionService)
    assert is_db is False

@pytest.mark.asyncio
async def test_start_or_resume_new_session():
    service, _ = build_session_service(persistent=False)
    session, resumed = await start_or_resume(service, None)
    assert not resumed
    assert session.id is not None

@pytest.mark.asyncio
async def test_start_or_resume_existing_session():
    service, _ = build_session_service(persistent=False)
    session1, _ = await start_or_resume(service, "my_session")
    session2, resumed = await start_or_resume(service, "my_session")
    assert resumed
    assert session2.id == "my_session"

@pytest.mark.asyncio
async def test_list_and_end_session():
    service, _ = build_session_service(persistent=False)
    session, _ = await start_or_resume(service, "test_session")
    ids = await list_session_ids(service)
    assert "test_session" in ids
    
    await end_session(service, "test_session")
    ids_after = await list_session_ids(service)
    assert "test_session" not in ids_after
