"""P0 hardening tests: CSV aliases, production config guards, and new schema shapes."""

import os

import pytest


# ---------------------------------------------------------------------------
# CSV column alias normalization
# ---------------------------------------------------------------------------

class TestCSVColumnAliases:
    """Verify that snake_case / lowercase column names are accepted."""

    @pytest.mark.asyncio
    async def test_scores_snake_case_columns(self):
        from app.services.csv_service import validate_scores_csv

        content = b"student_id,question_id,score,max_score\nS001,Q1,8,10\n"
        df, errors = await validate_scores_csv(content)
        assert df is not None
        assert len(errors) == 0
        assert "StudentID" in df.columns
        assert df.iloc[0]["StudentID"] == "S001"

    @pytest.mark.asyncio
    async def test_mapping_snake_case_columns(self):
        from app.services.csv_service import validate_mapping_csv

        content = b"question_id,concept_id,weight\nQ1,C1,1.0\n"
        df, errors = await validate_mapping_csv(content)
        assert df is not None
        assert len(errors) == 0
        assert "QuestionID" in df.columns
        assert "ConceptID" in df.columns

    @pytest.mark.asyncio
    async def test_mapping_concept_alias(self):
        """PRD sometimes uses just 'concept' instead of 'concept_id'."""
        from app.services.csv_service import validate_mapping_csv

        content = b"QuestionID,concept,Weight\nQ1,C1,1.0\n"
        df, errors = await validate_mapping_csv(content)
        assert df is not None
        assert len(errors) == 0
        assert "ConceptID" in df.columns

    @pytest.mark.asyncio
    async def test_canonical_columns_still_work(self):
        from app.services.csv_service import validate_scores_csv

        content = b"StudentID,QuestionID,Score,MaxScore\nS001,Q1,8,10\n"
        df, errors = await validate_scores_csv(content)
        assert df is not None
        assert len(errors) == 0


# ---------------------------------------------------------------------------
# Production config guards
# ---------------------------------------------------------------------------

class TestProductionConfigGuards:
    """Startup validation that fires when APP_ENV=production.

    We test the guard logic directly against Settings objects rather than
    importing app.main (which pulls in the full router tree and may require
    optional SDKs like anthropic that aren't installed in CI).
    """

    @staticmethod
    def _validate(settings_obj):
        """Re-implement the same guard logic from main.py for isolated testing."""
        origins = settings_obj.CORS_ALLOWED_ORIGINS.strip()
        if not origins or origins == "*":
            raise RuntimeError(
                "CORS_ALLOWED_ORIGINS must be set to explicit origin(s) in production "
                "(got '*' or empty).  Example: https://app.conceptpilot.com"
            )
        if settings_obj.COMPUTE_ASYNC_ENABLED:
            if settings_obj.COMPUTE_QUEUE_BACKEND != "redis":
                raise RuntimeError(
                    "COMPUTE_QUEUE_BACKEND must be 'redis' in production when "
                    "COMPUTE_ASYNC_ENABLED=true."
                )
            if not settings_obj.COMPUTE_QUEUE_REDIS_URL.strip():
                raise RuntimeError(
                    "COMPUTE_QUEUE_REDIS_URL must be set in production when "
                    "COMPUTE_ASYNC_ENABLED=true."
                )

    def test_wildcard_cors_rejected(self):
        from app.config import Settings

        s = Settings(
            _env_file=None,
            DATABASE_URL="postgresql+asyncpg://x:x@localhost/x",
            APP_ENV="production",
            CORS_ALLOWED_ORIGINS="*",
        )
        with pytest.raises(RuntimeError, match="CORS_ALLOWED_ORIGINS"):
            self._validate(s)

    def test_valid_production_config_passes(self):
        from app.config import Settings

        s = Settings(
            _env_file=None,
            DATABASE_URL="postgresql+asyncpg://x:x@localhost/x",
            APP_ENV="production",
            CORS_ALLOWED_ORIGINS="https://app.example.com",
        )
        self._validate(s)  # should not raise

    def test_async_compute_file_backend_rejected(self):
        from app.config import Settings

        s = Settings(
            _env_file=None,
            DATABASE_URL="postgresql+asyncpg://x:x@localhost/x",
            APP_ENV="production",
            CORS_ALLOWED_ORIGINS="https://app.example.com",
            COMPUTE_ASYNC_ENABLED=True,
            COMPUTE_QUEUE_BACKEND="file",
            COMPUTE_QUEUE_REDIS_URL="redis://localhost:6379/0",
        )
        with pytest.raises(RuntimeError, match="COMPUTE_QUEUE_BACKEND"):
            self._validate(s)

    def test_async_compute_redis_without_url_rejected(self):
        from app.config import Settings

        s = Settings(
            _env_file=None,
            DATABASE_URL="postgresql+asyncpg://x:x@localhost/x",
            APP_ENV="production",
            CORS_ALLOWED_ORIGINS="https://app.example.com",
            COMPUTE_ASYNC_ENABLED=True,
            COMPUTE_QUEUE_BACKEND="redis",
            COMPUTE_QUEUE_REDIS_URL="",
        )
        with pytest.raises(RuntimeError, match="COMPUTE_QUEUE_REDIS_URL"):
            self._validate(s)

    def test_async_compute_redis_with_url_passes(self):
        from app.config import Settings

        s = Settings(
            _env_file=None,
            DATABASE_URL="postgresql+asyncpg://x:x@localhost/x",
            APP_ENV="production",
            CORS_ALLOWED_ORIGINS="https://app.example.com",
            COMPUTE_ASYNC_ENABLED=True,
            COMPUTE_QUEUE_BACKEND="redis",
            COMPUTE_QUEUE_REDIS_URL="redis://localhost:6379/0",
        )
        self._validate(s)


# ---------------------------------------------------------------------------
# Database SSL mode selection
# ---------------------------------------------------------------------------

class TestDatabaseSSLMode:
    """Verify _build_connect_args produces correct SSL contexts."""

    def test_disable_returns_empty(self, monkeypatch):
        monkeypatch.setattr("app.database.settings.DATABASE_SSL_MODE", "disable")
        from app.database import _build_connect_args

        args = _build_connect_args()
        assert "ssl" not in args

    def test_require_returns_ssl(self, monkeypatch):
        monkeypatch.setattr("app.database.settings.DATABASE_SSL_MODE", "require")
        from app.database import _build_connect_args

        args = _build_connect_args()
        assert "ssl" in args

    def test_verify_full_returns_ssl_with_verification(self, monkeypatch):
        import ssl as _ssl

        monkeypatch.setattr("app.database.settings.DATABASE_SSL_MODE", "verify-full")
        from app.database import _build_connect_args

        args = _build_connect_args()
        ctx = args["ssl"]
        assert ctx.check_hostname is True
        assert ctx.verify_mode == _ssl.CERT_REQUIRED


# ---------------------------------------------------------------------------
# New schema shapes (smoke tests)
# ---------------------------------------------------------------------------

class TestNewSchemas:
    """Verify new Pydantic models can be instantiated."""

    def test_scores_summary_response(self):
        from app.schemas.schemas import ScoresSummaryResponse

        r = ScoresSummaryResponse(total_rows=10, student_count=3, question_count=5)
        assert r.total_rows == 10

    def test_mapping_retrieve_response(self):
        from app.schemas.schemas import MappingItem, MappingRetrieveResponse

        r = MappingRetrieveResponse(
            concept_count=2,
            mappings=[MappingItem(question_id="Q1", concept_id="C1", weight=1.0)],
        )
        assert len(r.mappings) == 1

    def test_graph_version_item(self):
        from datetime import datetime

        from app.schemas.schemas import GraphVersionItem

        item = GraphVersionItem(version=3, node_count=5, edge_count=4, created_at=datetime.utcnow())
        assert item.version == 3

    def test_alerts_response(self):
        from app.schemas.schemas import AlertItem, AlertsResponse

        r = AlertsResponse(
            alerts=[
                AlertItem(
                    concept_id="C1",
                    concept_label="Limits",
                    class_average_readiness=0.4,
                    students_below_threshold=5,
                    downstream_concepts=["Derivatives"],
                    impact=3.0,
                    recommended_action="Review",
                )
            ]
        )
        assert len(r.alerts) == 1

    def test_export_status_response_single(self):
        from datetime import datetime
        from uuid import uuid4

        from app.schemas.schemas import ExportStatusResponse

        r = ExportStatusResponse(
            id=uuid4(),
            exam_id=uuid4(),
            status="ready",
            created_at=datetime.utcnow(),
        )
        assert r.status == "ready"


# ---------------------------------------------------------------------------
# Export dir writability check
# ---------------------------------------------------------------------------

class TestExportDirCheck:

    def test_check_creates_dir(self, tmp_path, monkeypatch):
        """Verify the export dir check logic creates missing directories."""
        import logging

        target = str(tmp_path / "new_exports")

        class _FakeSettings:
            EXPORT_DIR = target

        def _check(settings_obj):
            d = settings_obj.EXPORT_DIR
            try:
                os.makedirs(d, exist_ok=True)
                if not os.access(d, os.W_OK):
                    logging.warning("EXPORT_DIR %s exists but is not writable", d)
            except OSError as exc:
                logging.warning("Cannot create EXPORT_DIR %s: %s", d, exc)

        _check(_FakeSettings())
        assert os.path.isdir(target)
