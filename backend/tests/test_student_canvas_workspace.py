"""Student infinite canvas workspace API — GET/PUT JSONB backed by `canvas_workspaces`."""

import pytest
import pytest_asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.database import Base, _build_connect_args, _clean_async_url, get_db
from app.models import canvas as _canvas_models  # noqa: F401 — FK registration
from app.models.models import CanvasWorkspace
from app.routers import student as student_router
from app.services.student_workspace_service import bootstrap_student_workspace


def _build_app() -> FastAPI:
    app = FastAPI(title="Student canvas workspace test")
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
    app.include_router(student_router.router)
    return app


_test_app = _build_app()


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def _engine():
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
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture(loop_scope="session")
async def db_session(_engine):
    async with _engine.connect() as conn:
        trans = await conn.begin()
        session = AsyncSession(bind=conn, expire_on_commit=False)
        try:
            yield session
        finally:
            await trans.rollback()
            await session.close()


@pytest_asyncio.fixture(loop_scope="session")
async def client(db_session):
    async def _override_get_db():
        yield db_session

    _test_app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=_test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    _test_app.dependency_overrides.clear()


@pytest.mark.asyncio(loop_scope="session")
async def test_bootstrap_creates_canvas_workspace_row(db_session):
    ws = await bootstrap_student_workspace(db_session)
    await db_session.flush()
    row = await db_session.get(CanvasWorkspace, ws.canvas_project_id)
    assert row is not None
    assert row.title


@pytest.mark.asyncio(loop_scope="session")
async def test_get_put_canvas_workspace(client, db_session):
    ws = await bootstrap_student_workspace(db_session)
    await db_session.flush()
    exam_id = str(ws.exam_id)
    cid = str(ws.canvas_project_id)

    r = await client.get(
        "/api/v1/student/canvas-workspace",
        headers={"X-Student-Exam-Id": exam_id},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == cid
    assert isinstance(data["state"], dict)

    r2 = await client.put(
        "/api/v1/student/canvas-workspace",
        headers={"X-Student-Exam-Id": exam_id},
        json={
            "title": "My Canvas",
            "state": {"nodes": [{"id": "1", "type": "chat", "position": {"x": 0, "y": 0}, "data": {}}], "edges": []},
        },
    )
    assert r2.status_code == 200
    body = r2.json()
    assert body["title"] == "My Canvas"
    assert len(body["state"]["nodes"]) == 1
