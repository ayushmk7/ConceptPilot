"""End-to-end readiness integration flow: upload -> compute -> dashboard."""

import uuid

import pytest
import pytest_asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.database import Base, _build_connect_args, _clean_async_url, get_db
from app.routers import compute, courses, dashboard, exams, graph, upload


def _build_test_app() -> FastAPI:
    app = FastAPI(title="ConceptPilot Integration Test")
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
    app.include_router(courses.router)
    app.include_router(exams.router)
    app.include_router(upload.router)
    app.include_router(graph.router)
    app.include_router(compute.router)
    app.include_router(dashboard.router)
    return app


_test_app = _build_test_app()


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def _test_engine():
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
async def db_session(_test_engine):
    async with _test_engine.connect() as conn:
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


class TestIntegrationFlow:
    @pytest.mark.asyncio(loop_scope="session")
    async def test_upload_compute_dashboard_flow(self, client):
        course_resp = await client.post("/api/v1/courses", json={"name": f"Flow-{uuid.uuid4()}"})
        assert course_resp.status_code == 201
        course_id = course_resp.json()["id"]

        exam_resp = await client.post(f"/api/v1/courses/{course_id}/exams", json={"name": "Midterm"})
        assert exam_resp.status_code == 201
        exam_id = exam_resp.json()["id"]

        scores_csv = (
            "StudentID,QuestionID,Score,MaxScore\n"
            "S1,Q1,8,10\n"
            "S1,Q2,6,10\n"
            "S2,Q1,5,10\n"
            "S2,Q2,7,10\n"
        ).encode("utf-8")
        upload_scores = await client.post(
            f"/api/v1/exams/{exam_id}/scores",
            files={"file": ("scores.csv", scores_csv, "text/csv")},
        )
        assert upload_scores.status_code == 200
        assert upload_scores.json()["status"] == "success"

        mapping_csv = (
            "QuestionID,ConceptID,Weight\n"
            "Q1,C1,1.0\n"
            "Q2,C2,1.0\n"
        ).encode("utf-8")
        upload_mapping = await client.post(
            f"/api/v1/exams/{exam_id}/mapping",
            files={"file": ("mapping.csv", mapping_csv, "text/csv")},
        )
        assert upload_mapping.status_code == 200
        assert upload_mapping.json()["status"] == "success"

        upload_graph_resp = await client.post(
            f"/api/v1/exams/{exam_id}/graph",
            json={
                "nodes": [{"id": "C1", "label": "Concept 1"}, {"id": "C2", "label": "Concept 2"}],
                "edges": [{"source": "C1", "target": "C2", "weight": 0.8}],
            },
        )
        assert upload_graph_resp.status_code == 200
        assert upload_graph_resp.json()["status"] == "success"

        compute_resp = await client.post(f"/api/v1/exams/{exam_id}/compute", json={})
        assert compute_resp.status_code == 200
        assert compute_resp.json()["status"] in {"success", "queued"}

        dashboard_resp = await client.get(f"/api/v1/exams/{exam_id}/dashboard")
        assert dashboard_resp.status_code == 200
        payload = dashboard_resp.json()
        assert "heatmap" in payload
        assert "alerts" in payload
        assert "aggregates" in payload
