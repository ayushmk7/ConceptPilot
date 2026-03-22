"""Chat API smoke tests (session create) and router wiring."""

import pytest
import pytest_asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.database import Base, _build_connect_args, _clean_async_url, get_db
from app.models import canvas as _canvas_models  # noqa: F401 — register canvas_projects FK
from app.models import models as _orm_models  # noqa: F401 — register StudentWorkspace etc.
from app.routers import chat as chat_router


def _build_chat_test_app() -> FastAPI:
    app = FastAPI(title="ConceptPilot Chat Test")
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
    app.include_router(chat_router.router)
    return app


_chat_test_app = _build_chat_test_app()


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def _chat_test_engine():
    from app.config import settings

    url = _clean_async_url(settings.DATABASE_URL)
    engine = create_async_engine(
        url,
        echo=False,
        pool_size=2,
        max_overflow=0,
        connect_args=_build_connect_args(),
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("ALTER TABLE exams ADD COLUMN IF NOT EXISTS state VARCHAR(20)"))
        await conn.execute(text("ALTER TABLE study_content ADD COLUMN IF NOT EXISTS project_id UUID"))
        await conn.execute(
            text(
                "ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS surface VARCHAR(20) "
                "NOT NULL DEFAULT 'instructor'"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS student_id_external VARCHAR(255)"
            )
        )
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture(loop_scope="session")
async def chat_db_session(_chat_test_engine):
    async with _chat_test_engine.connect() as conn:
        trans = await conn.begin()
        session = AsyncSession(bind=conn, expire_on_commit=False)
        try:
            yield session
        finally:
            await trans.rollback()
            await session.close()


@pytest_asyncio.fixture(loop_scope="session")
async def chat_client(chat_db_session):
    async def _override_get_db():
        yield chat_db_session

    _chat_test_app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=_chat_test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    _chat_test_app.dependency_overrides.clear()


@pytest.mark.asyncio(loop_scope="session")
async def test_create_chat_session_returns_id(chat_client):
    from app.config import settings

    res = await chat_client.post("/chat/sessions", json={})
    assert res.status_code == 200
    data = res.json()
    assert "id" in data
    assert data.get("created_by") == settings.CHAT_DEFAULT_CREATED_BY
    assert data.get("surface") == "instructor"


@pytest.mark.asyncio(loop_scope="session")
async def test_create_student_session_open_workspace(chat_client, chat_db_session):
    """Student surface without report_token uses X-Student-Exam-Id + student_workspaces row."""
    from app.services.student_workspace_service import bootstrap_student_workspace

    ws = await bootstrap_student_workspace(chat_db_session)
    await chat_db_session.flush()
    exam_id = str(ws.exam_id)

    res = await chat_client.post(
        "/chat/sessions",
        json={"surface": "student", "exam_id": exam_id},
        headers={"X-Student-Exam-Id": exam_id},
    )
    assert res.status_code == 200
    data = res.json()
    assert data.get("surface") == "student"
    assert data.get("exam_id") == exam_id


@pytest.mark.asyncio(loop_scope="session")
async def test_execute_tool_student_blocks_instructor_only_tool(chat_db_session):
    import json
    from uuid import uuid4

    from app.services.chat_service import execute_tool

    out = await execute_tool(
        "get_student_list",
        {"exam_id": str(uuid4())},
        chat_db_session,
        session_surface="student",
        session_student_id="S001",
    )
    assert json.loads(out)["error"] == "not_permitted"


@pytest.mark.asyncio(loop_scope="session")
async def test_execute_tool_student_overrides_student_id(chat_db_session):
    import json
    from uuid import uuid4

    from app.services.chat_service import execute_tool

    out = await execute_tool(
        "get_student_readiness",
        {"exam_id": str(uuid4()), "student_id": "OTHER"},
        chat_db_session,
        session_surface="student",
        session_student_id="BOUND",
    )
    payload = json.loads(out)
    # Model-supplied OTHER must not be honored; tool runs for BOUND only.
    assert "OTHER" not in str(payload)
