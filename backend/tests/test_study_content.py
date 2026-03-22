"""Study-content API and pipeline tests."""

from pathlib import Path
import uuid

import pytest
import pytest_asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.database import Base, _build_connect_args, _clean_async_url, get_db
from app.models.models import Course, Exam, Project, StudyContent
from app.routers import courses, exams, projects, study_content
from app.services.study_content_service import run_generation_for_content


def _build_test_app() -> FastAPI:
    app = FastAPI(title="ConceptPilot StudyContent Test")
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
    app.include_router(courses.router)
    app.include_router(exams.router)
    app.include_router(projects.router)
    app.include_router(study_content.router)
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


@pytest_asyncio.fixture(loop_scope="session")
async def seed_exam(db_session):
    course = Course(name="Study content course")
    db_session.add(course)
    await db_session.flush()

    exam = Exam(course_id=course.id, name="Study content exam")
    db_session.add(exam)
    await db_session.flush()
    return {"exam_id": exam.id}


class TestStudyContentEndpoints:
    @pytest.mark.asyncio(loop_scope="session")
    async def test_create_list_and_get(self, client, seed_exam, monkeypatch):
        from app.routers import study_content as study_router

        called = {"kicked": False}

        def _fake_kickoff(_content_id):
            called["kicked"] = True

        monkeypatch.setattr(study_router, "kickoff_study_content_generation", _fake_kickoff)

        resp = await client.post(
            f"/api/v1/exams/{seed_exam['exam_id']}/study-content",
            json={
                "content_type": "audio",
                "title": "Derivatives recap",
                "focus_concepts": ["limits", "derivatives"],
                "include_weak_concepts": True,
            },
        )
        assert resp.status_code == 200
        payload = resp.json()
        assert payload["status"] == "pending"
        assert called["kicked"] is True

        list_resp = await client.get(f"/api/v1/exams/{seed_exam['exam_id']}/study-content")
        assert list_resp.status_code == 200
        items = list_resp.json()["items"]
        assert len(items) >= 1

        content_id = payload["id"]
        get_resp = await client.get(f"/api/v1/study-content/{content_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["id"] == content_id

    @pytest.mark.asyncio(loop_scope="session")
    async def test_download_local_audio(self, client, db_session, seed_exam, tmp_path):
        audio_path = tmp_path / "sample.mp3"
        audio_path.write_bytes(b"fake-audio")

        record = StudyContent(
            exam_id=seed_exam["exam_id"],
            content_type="audio",
            title="Audio sample",
            source_context={},
            status="completed",
            storage_key=f"file://{audio_path}",
        )
        db_session.add(record)
        await db_session.flush()

        resp = await client.get(f"/api/v1/study-content/{record.id}/download")
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("audio/mpeg")

    @pytest.mark.asyncio(loop_scope="session")
    async def test_download_presentation_json(self, client, db_session, seed_exam):
        record = StudyContent(
            exam_id=seed_exam["exam_id"],
            content_type="presentation",
            title="Slides only",
            source_context={},
            status="completed",
            transcript="Intro",
            slides_data={"slides": [{"title": "A", "bullets": ["b"]}]},
        )
        db_session.add(record)
        await db_session.flush()

        resp = await client.get(f"/api/v1/study-content/{record.id}/download")
        assert resp.status_code == 200
        assert "application/json" in resp.headers["content-type"]
        data = resp.json()
        assert data["title"] == "Slides only"
        assert data["transcript"] == "Intro"
        assert data["slides_data"]["slides"][0]["title"] == "A"

    @pytest.mark.asyncio(loop_scope="session")
    async def test_project_scoped_study_content(self, client, db_session, seed_exam, monkeypatch):
        from app.routers import projects as projects_router

        project = Project(exam_id=seed_exam["exam_id"], title="Readiness Project")
        db_session.add(project)
        await db_session.flush()

        called = {"kicked": False}

        def _fake_kickoff(_content_id):
            called["kicked"] = True

        monkeypatch.setattr(projects_router, "kickoff_study_content_generation", _fake_kickoff)

        create_resp = await client.post(
            f"/api/v1/projects/{project.id}/study-content",
            json={
                "content_type": "audio",
                "title": "Project drilldown",
                "focus_concepts": ["derivatives"],
                "include_weak_concepts": False,
            },
        )
        assert create_resp.status_code == 200
        payload = create_resp.json()
        assert payload["project_id"] == str(project.id)
        assert payload["exam_id"] == str(seed_exam["exam_id"])
        assert called["kicked"] is True

        list_resp = await client.get(f"/api/v1/projects/{project.id}/study-content")
        assert list_resp.status_code == 200
        items = list_resp.json()["items"]
        assert len(items) >= 1
        assert all(item["project_id"] == str(project.id) for item in items)


class TestStudyContentPipeline:
    @pytest.mark.asyncio(loop_scope="session")
    async def test_generation_pipeline_success(self, monkeypatch, tmp_path):
        from app.services import study_content_service as scs

        monkeypatch.setattr(scs.settings, "EXPORT_DIR", str(tmp_path), raising=False)

        async def _fake_claude_content_outline(**kwargs):
            return {
                "transcript": "Limits build derivative intuition.",
                "slides_data": {"slides": [{"title": "One", "bullets": ["Two"]}]},
            }

        async def _fake_synthesize_speech(_text: str):
            return b"mp3-bytes"

        async def _fake_put_object_bytes(_object_name, _payload, _content_type):
            return True

        monkeypatch.setattr(scs, "_call_claude_content_outline", _fake_claude_content_outline)
        monkeypatch.setattr(scs, "synthesize_speech", _fake_synthesize_speech)
        monkeypatch.setattr(scs, "put_object_bytes", _fake_put_object_bytes)
        monkeypatch.setattr(scs.settings, "VULTR_OBJECT_STORAGE_BUCKET", "test-bucket", raising=False)

        async with scs.async_session() as setup_db:
            course = Course(name="Committed course")
            setup_db.add(course)
            await setup_db.flush()
            exam = Exam(course_id=course.id, name="Committed exam")
            setup_db.add(exam)
            await setup_db.flush()
            record = StudyContent(
                id=uuid.uuid4(),
                exam_id=exam.id,
                content_type="audio",
                title="Pipeline run",
                source_context={"focus_concepts": ["limits"], "include_weak_concepts": False},
                status="pending",
            )
            setup_db.add(record)
            await setup_db.commit()
            content_id = record.id

        await run_generation_for_content(content_id)

        async with scs.async_session() as verify_db:
            stored = await verify_db.get(StudyContent, content_id)
            assert stored is not None
            assert stored.status == "completed"
            assert stored.transcript is not None
            assert stored.storage_key and stored.storage_key.startswith("s3://test-bucket/")
            saved = Path(scs._local_audio_path(content_id))
        assert saved.exists()
