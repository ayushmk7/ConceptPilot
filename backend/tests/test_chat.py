"""Chat API smoke tests (session create) and router wiring."""

import pytest
import pytest_asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.database import Base, _build_connect_args, _clean_async_url, get_db
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
