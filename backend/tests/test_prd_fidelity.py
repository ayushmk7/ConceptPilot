"""P1 PRD fidelity tests — verify every Technical PRD §2 readiness route exists,
returns correct status codes, and matches the documented response shapes.

PRD Route Matrix (non-canvas, readiness product):
┌──────────────────────────────────────────────────────────┬──────────────────────────────┬───────────────┐
│ Route                                                    │ Response model               │ Auth          │
├──────────────────────────────────────────────────────────┼──────────────────────────────┼───────────────┤
│ POST /api/v1/exams/{id}/scores                           │ ScoresUploadResponse         │ Instructor    │
│ GET  /api/v1/exams/{id}/scores/summary                   │ ScoresSummaryResponse        │ Instructor    │
│ POST /api/v1/exams/{id}/mapping                          │ MappingUploadResponse        │ Instructor    │
│ GET  /api/v1/exams/{id}/mapping                          │ MappingRetrieveResponse      │ Instructor    │
│ POST /api/v1/exams/{id}/graph                            │ GraphUploadResponse          │ Instructor    │
│ GET  /api/v1/exams/{id}/graph                            │ GraphRetrieveResponse        │ Instructor    │
│ PATCH /api/v1/exams/{id}/graph                           │ GraphPatchResponse           │ Instructor    │
│ GET  /api/v1/exams/{id}/graph/versions                   │ GraphVersionListResponse     │ Instructor    │
│ POST /api/v1/exams/{id}/compute                          │ ComputeResponse              │ Instructor    │
│ GET  /api/v1/exams/{id}/compute/runs                     │ list[ComputeRunResponse]     │ Instructor    │
│ GET  /api/v1/exams/{id}/compute/runs/{run_id}            │ ComputeRunResponse           │ Instructor    │
│ GET  /api/v1/exams/{id}/dashboard                        │ DashboardResponse            │ Instructor    │
│ GET  /api/v1/exams/{id}/dashboard/alerts                 │ AlertsResponse               │ Instructor    │
│ GET  /api/v1/exams/{id}/dashboard/trace/{concept}        │ TraceResponse                │ Instructor    │
│ GET  /api/v1/exams/{id}/ai/suggestions                   │ SuggestionListResponse       │ Instructor    │
│ POST /api/v1/exams/{id}/ai/suggestions/{sid}/review      │ dict (status, suggestion_st) │ Instructor    │
│ PATCH /api/v1/exams/{id}/ai/suggestions/{sid}            │ dict (status, suggestion_st) │ Instructor    │
│ POST /api/v1/exams/{id}/ai/suggestions/bulk-review       │ dict (status, updated, …)    │ Instructor    │
│ POST /api/v1/exams/{id}/ai/suggestions/apply             │ ApplySuggestionsResponse     │ Instructor    │
│ POST /api/v1/exams/{id}/export                           │ ExportStatusResponse         │ Instructor    │
│ GET  /api/v1/exams/{id}/export                           │ ExportListResponse           │ Instructor    │
│ GET  /api/v1/exams/{id}/export/{export_id}               │ ExportStatusResponse         │ Instructor    │
│ GET  /api/v1/exams/{id}/export/{export_id}/download      │ FileResponse                 │ Instructor    │
│ GET  /api/v1/exams/{id}/parameters                       │ ParametersResponse           │ Instructor    │
│ PUT  /api/v1/exams/{id}/parameters                       │ ParametersResponse           │ Instructor    │
│ GET  /api/v1/exams/{id}/clusters                         │ ClustersResponse             │ Instructor    │
│ GET  /api/v1/exams/{id}/interventions                    │ dict (interventions list)     │ Instructor    │
└──────────────────────────────────────────────────────────┴──────────────────────────────┴───────────────┘

Dashboard split strategy: **A — bundle** (GET /dashboard returns heatmap + alerts + aggregates;
GET /dashboard/alerts returns alerts only). No schema change; both endpoints coexist.
"""

import uuid

import pytest
import pytest_asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.config import settings
from app.database import Base, _build_connect_args, _clean_async_url, get_db
from app.main import app as production_app
from app.models.models import (
    AISuggestion,
    ClassAggregate,
    ComputeRun,
    ConceptGraph,
    Course,
    Exam,
    Parameter,
    Question,
    QuestionConceptMap,
)
from app.routers import (
    ai_suggestions,
    chat,
    clusters,
    compute,
    courses,
    dashboard,
    exams,
    export,
    graph,
    parameters,
    projects,
    reports,
    study_content,
    upload,
)


# ---------------------------------------------------------------------------
# Build a test app without BaseHTTPMiddleware (avoids asyncpg event-loop clash)
# ---------------------------------------------------------------------------

def _build_test_app() -> FastAPI:
    test_app = FastAPI(title="ConceptPilot Test")
    test_app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
    test_app.include_router(courses.router)
    test_app.include_router(exams.router)
    test_app.include_router(upload.router)
    test_app.include_router(graph.router)
    test_app.include_router(compute.router)
    test_app.include_router(dashboard.router)
    test_app.include_router(clusters.router)
    test_app.include_router(reports.router)
    test_app.include_router(parameters.router)
    test_app.include_router(ai_suggestions.router)
    test_app.include_router(export.router)
    test_app.include_router(chat.router)
    test_app.include_router(projects.router)
    test_app.include_router(study_content.router)
    return test_app


_test_app = _build_test_app()


# ---------------------------------------------------------------------------
# Session-scoped engine and table creation (shared event loop)
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def _test_engine():
    url = _clean_async_url(settings.DATABASE_URL)
    eng = create_async_engine(
        url,
        echo=False,
        pool_size=2,
        max_overflow=0,
        connect_args=_build_connect_args(),
    )
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("ALTER TABLE exams ADD COLUMN IF NOT EXISTS state VARCHAR(20)"))
        await conn.execute(text("ALTER TABLE study_content ADD COLUMN IF NOT EXISTS project_id UUID"))
    yield eng
    await eng.dispose()


# ---------------------------------------------------------------------------
# Per-test transactional session + HTTPX client
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture(loop_scope="session")
async def db_session(_test_engine):
    """Provide a transactional session that rolls back after each test."""
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
    """HTTPX async client wired to the test app with a per-test DB session."""

    async def _override_get_db():
        yield db_session

    _test_app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=_test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    _test_app.dependency_overrides.clear()


@pytest_asyncio.fixture(loop_scope="session")
async def seed_exam(db_session) -> dict:
    """Seed a course + exam + parameters + graph + question/mapping + compute run + aggregates + suggestion."""
    course = Course(name="Test Course")
    db_session.add(course)
    await db_session.flush()

    exam = Exam(course_id=course.id, name="Midterm")
    db_session.add(exam)
    await db_session.flush()

    params = Parameter(exam_id=exam.id, alpha=1.0, beta=0.3, gamma=0.2, threshold=0.6, k=4)
    db_session.add(params)

    graph_json = {
        "nodes": [{"id": "C1", "label": "Limits"}, {"id": "C2", "label": "Derivatives"}],
        "edges": [{"source": "C1", "target": "C2", "weight": 0.7}],
    }
    graph_obj = ConceptGraph(exam_id=exam.id, version=1, graph_json=graph_json)
    db_session.add(graph_obj)

    q = Question(exam_id=exam.id, question_id_external="Q1", max_score=10.0)
    db_session.add(q)
    await db_session.flush()

    qcm = QuestionConceptMap(question_id=q.id, concept_id="C1", weight=1.0)
    db_session.add(qcm)

    run_id = uuid.uuid4()
    compute_run = ComputeRun(
        exam_id=exam.id,
        run_id=run_id,
        status="success",
        students_processed=2,
        concepts_processed=2,
        parameters_json={"alpha": 1.0, "beta": 0.3, "gamma": 0.2, "threshold": 0.6, "k": 4},
        graph_version=1,
        duration_ms=42.0,
    )
    db_session.add(compute_run)

    agg = ClassAggregate(
        exam_id=exam.id,
        run_id=run_id,
        concept_id="C1",
        mean_readiness=0.45,
        median_readiness=0.44,
        std_readiness=0.1,
        below_threshold_count=3,
    )
    db_session.add(agg)

    suggestion = AISuggestion(
        exam_id=exam.id,
        suggestion_type="concept_tag",
        status="pending",
        output_payload={"suggestions": [{"concept_id": "C1", "confidence": 0.9, "rationale": "test"}]},
    )
    db_session.add(suggestion)
    await db_session.flush()
    await db_session.refresh(suggestion)

    return {
        "course_id": course.id,
        "exam_id": exam.id,
        "run_id": run_id,
        "suggestion_id": suggestion.id,
        "question_id": q.id,
    }


# ---------------------------------------------------------------------------
# Route existence — OpenAPI contract (uses the production app)
# ---------------------------------------------------------------------------

class TestRouteExistence:
    """Verify every PRD readiness route is registered in the FastAPI app."""

    EXPECTED_ROUTES = [
        ("GET", "/api/v1/exams/{exam_id}/scores/summary"),
        ("GET", "/api/v1/exams/{exam_id}/mapping"),
        ("GET", "/api/v1/exams/{exam_id}/graph"),
        ("POST", "/api/v1/exams/{exam_id}/graph/expand"),
        ("GET", "/api/v1/exams/{exam_id}/graph/versions"),
        ("PATCH", "/api/v1/exams/{exam_id}/graph"),
        ("POST", "/api/v1/exams/{exam_id}/compute"),
        ("GET", "/api/v1/exams/{exam_id}/compute/runs"),
        ("GET", "/api/v1/exams/{exam_id}/compute/runs/{run_id}"),
        ("GET", "/api/v1/exams/{exam_id}/dashboard"),
        ("GET", "/api/v1/exams/{exam_id}/dashboard/alerts"),
        ("GET", "/api/v1/exams/{exam_id}/dashboard/trace/{concept_id}"),
        ("GET", "/api/v1/exams/{exam_id}/ai/suggestions"),
        ("POST", "/api/v1/exams/{exam_id}/ai/suggestions/{suggestion_id}/review"),
        ("PATCH", "/api/v1/exams/{exam_id}/ai/suggestions/{suggestion_id}"),
        ("POST", "/api/v1/exams/{exam_id}/ai/suggestions/bulk-review"),
        ("POST", "/api/v1/exams/{exam_id}/ai/suggestions/apply"),
        ("POST", "/api/v1/exams/{exam_id}/export"),
        ("GET", "/api/v1/exams/{exam_id}/export"),
        ("GET", "/api/v1/exams/{exam_id}/export/{export_id}"),
        ("GET", "/api/v1/exams/{exam_id}/export/{export_id}/download"),
        ("GET", "/api/v1/exams/{exam_id}/parameters"),
        ("PUT", "/api/v1/exams/{exam_id}/parameters"),
        ("GET", "/api/v1/exams/{exam_id}/clusters"),
        ("GET", "/api/v1/exams/{exam_id}/interventions"),
        ("POST", "/api/v1/projects"),
        ("GET", "/api/v1/projects"),
        ("GET", "/api/v1/projects/{project_id}"),
        ("POST", "/api/v1/projects/{project_id}/study-content"),
        ("GET", "/api/v1/projects/{project_id}/study-content"),
        ("POST", "/api/v1/exams/{exam_id}/study-content"),
        ("GET", "/api/v1/exams/{exam_id}/study-content"),
        ("DELETE", "/api/v1/exams/{exam_id}/study-content/{content_id}"),
        ("GET", "/api/v1/study-content/{content_id}"),
        ("GET", "/api/v1/study-content/{content_id}/download"),
        ("GET", "/api/v1/study-content/{content_id}/stream"),
    ]

    def test_all_prd_routes_registered(self):
        """Every route in the Technical PRD readiness API table is present in the app."""
        registered = set()
        for route in production_app.routes:
            if hasattr(route, "methods") and hasattr(route, "path"):
                for method in route.methods:
                    registered.add((method, route.path))

        missing = []
        for method, path in self.EXPECTED_ROUTES:
            if (method, path) not in registered:
                missing.append(f"{method} {path}")

        assert not missing, f"Missing PRD routes:\n" + "\n".join(missing)


# ---------------------------------------------------------------------------
# GET mapping — 404 vs 200
# ---------------------------------------------------------------------------

class TestGetMapping:

    @pytest.mark.asyncio(loop_scope="session")
    async def test_mapping_not_found(self, client):
        fake_id = uuid.uuid4()
        resp = await client.get(f"/api/v1/exams/{fake_id}/mapping")
        assert resp.status_code == 404

    @pytest.mark.asyncio(loop_scope="session")
    async def test_mapping_ok(self, client, seed_exam):
        resp = await client.get(f"/api/v1/exams/{seed_exam['exam_id']}/mapping")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["concept_count"] >= 1
        assert len(data["mappings"]) >= 1
        m = data["mappings"][0]
        assert "question_id" in m
        assert "concept_id" in m
        assert "weight" in m


# ---------------------------------------------------------------------------
# GET compute/runs/{run_id} — 404 vs 200
# ---------------------------------------------------------------------------

class TestGetComputeRun:

    @pytest.mark.asyncio(loop_scope="session")
    async def test_compute_run_not_found(self, client, seed_exam):
        fake_run = uuid.uuid4()
        resp = await client.get(
            f"/api/v1/exams/{seed_exam['exam_id']}/compute/runs/{fake_run}"
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio(loop_scope="session")
    async def test_compute_run_found(self, client, seed_exam):
        resp = await client.get(
            f"/api/v1/exams/{seed_exam['exam_id']}/compute/runs/{seed_exam['run_id']}"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert data["students_processed"] == 2
        assert data["concepts_processed"] == 2
        assert "parameters" in data
        assert "created_at" in data


# ---------------------------------------------------------------------------
# GET dashboard/alerts — empty vs populated
# ---------------------------------------------------------------------------

class TestDashboardAlerts:

    @pytest.mark.asyncio(loop_scope="session")
    async def test_alerts_exam_not_found(self, client):
        fake_id = uuid.uuid4()
        resp = await client.get(f"/api/v1/exams/{fake_id}/dashboard/alerts")
        assert resp.status_code == 404

    @pytest.mark.asyncio(loop_scope="session")
    async def test_alerts_populated(self, client, seed_exam):
        resp = await client.get(
            f"/api/v1/exams/{seed_exam['exam_id']}/dashboard/alerts"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "alerts" in data
        assert isinstance(data["alerts"], list)

    @pytest.mark.asyncio(loop_scope="session")
    async def test_dashboard_includes_alerts(self, client, seed_exam):
        """GET /dashboard is a convenience bundle that also includes alerts."""
        resp = await client.get(
            f"/api/v1/exams/{seed_exam['exam_id']}/dashboard"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "heatmap" in data
        assert "alerts" in data
        assert "aggregates" in data


# ---------------------------------------------------------------------------
# PATCH ai/suggestions/{id} — same behavior as POST review
# ---------------------------------------------------------------------------

class TestPatchSuggestion:

    @pytest.mark.asyncio(loop_scope="session")
    async def test_patch_not_found(self, client, seed_exam):
        fake_sid = uuid.uuid4()
        resp = await client.patch(
            f"/api/v1/exams/{seed_exam['exam_id']}/ai/suggestions/{fake_sid}",
            json={"action": "accept"},
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio(loop_scope="session")
    async def test_patch_accept(self, client, seed_exam):
        sid = seed_exam["suggestion_id"]
        resp = await client.patch(
            f"/api/v1/exams/{seed_exam['exam_id']}/ai/suggestions/{sid}",
            json={"action": "accept", "note": "looks good"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["suggestion_status"] == "accepted"

    @pytest.mark.asyncio(loop_scope="session")
    async def test_patch_already_reviewed(self, client, seed_exam):
        """After accepting, a second PATCH should return 409."""
        sid = seed_exam["suggestion_id"]
        await client.patch(
            f"/api/v1/exams/{seed_exam['exam_id']}/ai/suggestions/{sid}",
            json={"action": "accept"},
        )
        resp = await client.patch(
            f"/api/v1/exams/{seed_exam['exam_id']}/ai/suggestions/{sid}",
            json={"action": "reject"},
        )
        assert resp.status_code == 409


# ---------------------------------------------------------------------------
# Scores summary
# ---------------------------------------------------------------------------

class TestScoresSummary:

    @pytest.mark.asyncio(loop_scope="session")
    async def test_scores_summary_not_found(self, client):
        fake_id = uuid.uuid4()
        resp = await client.get(f"/api/v1/exams/{fake_id}/scores/summary")
        assert resp.status_code == 404

    @pytest.mark.asyncio(loop_scope="session")
    async def test_scores_summary_shape(self, client, seed_exam):
        resp = await client.get(
            f"/api/v1/exams/{seed_exam['exam_id']}/scores/summary"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "total_rows" in data
        assert "student_count" in data
        assert "question_count" in data


# ---------------------------------------------------------------------------
# Graph versions
# ---------------------------------------------------------------------------

class TestGraphVersions:

    @pytest.mark.asyncio(loop_scope="session")
    async def test_graph_versions(self, client, seed_exam):
        resp = await client.get(
            f"/api/v1/exams/{seed_exam['exam_id']}/graph/versions"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "versions" in data
        assert len(data["versions"]) >= 1
        v = data["versions"][0]
        assert "version" in v
        assert "node_count" in v
        assert "edge_count" in v
        assert "created_at" in v


# ---------------------------------------------------------------------------
# Graph expand (AI subtopics) — mocked Anthropic path via router
# ---------------------------------------------------------------------------

class TestGraphExpand:

    @pytest.mark.asyncio(loop_scope="session")
    async def test_expand_returns_new_nodes_and_persists_suggestion(self, client, seed_exam, monkeypatch):
        async def fake_suggest_subtopic_expansion(**kwargs):
            return {
                "nodes": [{"id": "new_sub", "label": "New subtopic", "depth": 1}],
                "edges": [{"source": "C1", "target": "new_sub", "weight": 0.6}],
                "model": "claude-test",
                "prompt_version": "v1.0",
                "token_usage": {"prompt_tokens": 1, "completion_tokens": 2, "total_tokens": 3},
                "latency_ms": 5.0,
                "error": None,
            }

        monkeypatch.setattr(
            "app.routers.graph.suggest_subtopic_expansion",
            fake_suggest_subtopic_expansion,
        )
        eid = seed_exam["exam_id"]
        resp = await client.post(
            f"/api/v1/exams/{eid}/graph/expand",
            json={"concept_id": "C1", "max_depth": 2, "context": ""},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert any(n["id"] == "new_sub" for n in data["new_nodes"])
        assert data.get("suggestion_id") is not None


# ---------------------------------------------------------------------------
# Export by ID — 404
# ---------------------------------------------------------------------------

class TestExportById:

    @pytest.mark.asyncio(loop_scope="session")
    async def test_export_not_found(self, client, seed_exam):
        fake_id = uuid.uuid4()
        resp = await client.get(
            f"/api/v1/exams/{seed_exam['exam_id']}/export/{fake_id}"
        )
        assert resp.status_code == 404
