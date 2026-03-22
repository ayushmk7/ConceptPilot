"""ConceptPilot FastAPI application entry point."""

import logging
import os
import sys

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import canvas as canvas_router

from app.config import settings
from app.middleware.observability import ObservabilityMiddleware
from app.routers import (
    ai_suggestions,
    canvas_workspaces,
    chat,
    clusters,
    compute,
    courses,
    dashboard,
    elevenlabs_api,
    exams,
    export,
    graph,
    parameters,
    projects,
    reports,
    student,
    study_content,
    upload,
)

logger = logging.getLogger("conceptpilot.startup")

# ---------------------------------------------------------------------------
# Production startup guards
# ---------------------------------------------------------------------------

_is_production = settings.APP_ENV.lower() == "production"


def _validate_production_config() -> None:
    """Fail fast on dangerous misconfigurations in production."""
    origins = settings.CORS_ALLOWED_ORIGINS.strip()
    if not origins or origins == "*":
        raise RuntimeError(
            "CORS_ALLOWED_ORIGINS must be set to explicit origin(s) in production "
            "(got '*' or empty).  Example: https://app.conceptpilot.com"
        )

    if settings.COMPUTE_ASYNC_ENABLED:
        if settings.COMPUTE_QUEUE_BACKEND != "redis":
            raise RuntimeError(
                "COMPUTE_QUEUE_BACKEND must be 'redis' in production when "
                "COMPUTE_ASYNC_ENABLED=true."
            )
        if not settings.COMPUTE_QUEUE_REDIS_URL.strip():
            raise RuntimeError(
                "COMPUTE_QUEUE_REDIS_URL must be set in production when "
                "COMPUTE_ASYNC_ENABLED=true."
            )


if _is_production:
    _validate_production_config()


def _check_export_dir() -> None:
    """Warn (non-fatal) if the export directory is not writable."""
    d = settings.EXPORT_DIR
    try:
        os.makedirs(d, exist_ok=True)
        if not os.access(d, os.W_OK):
            logger.warning("EXPORT_DIR %s exists but is not writable", d)
    except OSError as exc:
        logger.warning("Cannot create EXPORT_DIR %s: %s", d, exc)


_check_export_dir()

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.dev.set_exc_info,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

logging.basicConfig(
    format="%(message)s",
    stream=sys.stdout,
    level=logging.INFO,
)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="ConceptPilot API",
    description=(
        "Backend API for ConceptPilot - a concept readiness analysis platform "
        "for instructors and students. Computes per-student concept readiness "
        "scores using a DAG-based inference engine, provides instructor "
        "dashboards with heatmaps and root-cause tracing, generates "
        "personalized student reports, and offers AI-assisted concept "
        "tagging, graph generation, and intervention drafting."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(ObservabilityMiddleware)

cors_origins = [
    origin.strip()
    for origin in settings.CORS_ALLOWED_ORIGINS.split(",")
    if origin.strip()
]
if not cors_origins:
    cors_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(courses.router)
app.include_router(exams.router)
app.include_router(upload.router)
app.include_router(graph.router)
app.include_router(compute.router)
app.include_router(dashboard.router)
app.include_router(clusters.router)
app.include_router(reports.router)
app.include_router(parameters.router)
app.include_router(ai_suggestions.router)
app.include_router(export.router)
app.include_router(chat.router)
app.include_router(student.router)
app.include_router(elevenlabs_api.router)
app.include_router(projects.router)
app.include_router(study_content.router)
app.include_router(canvas_workspaces.router)
app.include_router(canvas_router.router, prefix="/api/canvas", tags=["canvas"])

# Canvas WebSocket
from app.ws.canvas import router as canvas_ws_router  # noqa: E402

app.include_router(canvas_ws_router)


@app.get("/", tags=["Root"])
async def root():
    """Simple root endpoint for tunnel and uptime checks."""
    return {
        "service": "ConceptPilot API",
        "status": "ok",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check with dependency status."""
    import sqlalchemy

    from app.database import engine

    health: dict[str, str] = {
        "status": "healthy",
        "service": "conceptpilot-api",
        "database": "unknown",
        "anthropic": "unknown",
        "elevenlabs": "unknown",
        "object_storage": "not_configured",
    }

    # --- Database ---
    try:
        async with engine.connect() as conn:
            await conn.execute(sqlalchemy.text("SELECT 1"))
        health["database"] = "connected"
    except Exception as e:
        health["database"] = f"error: {str(e)[:100]}"
        health["status"] = "degraded"

    # --- Anthropic key ---
    if settings.ANTHROPIC_API_KEY and len(settings.ANTHROPIC_API_KEY) > 10:
        health["anthropic"] = "configured"
    else:
        health["anthropic"] = "not_configured"

    # --- ElevenLabs (optional; study-content TTS) ---
    from app.services.elevenlabs_service import check_api_reachable as _el_check

    el_ok, el_detail = await _el_check()
    if el_ok:
        health["elevenlabs"] = "reachable"
    elif el_detail == "not_configured":
        health["elevenlabs"] = "not_configured"
    else:
        health["elevenlabs"] = el_detail

    # --- Vultr / S3-compatible object storage (optional) ---
    if settings.OBJECT_STORAGE_ENABLED and settings.VULTR_OBJECT_STORAGE_ENDPOINT:
        try:
            import boto3
            from botocore.config import Config as BotoConfig

            client = boto3.client(
                "s3",
                endpoint_url=settings.VULTR_OBJECT_STORAGE_ENDPOINT,
                aws_access_key_id=settings.VULTR_OBJECT_STORAGE_ACCESS_KEY,
                aws_secret_access_key=settings.VULTR_OBJECT_STORAGE_SECRET_KEY,
                config=BotoConfig(signature_version="s3v4"),
            )
            client.head_bucket(Bucket=settings.VULTR_OBJECT_STORAGE_BUCKET)
            health["object_storage"] = f"connected (bucket={settings.VULTR_OBJECT_STORAGE_BUCKET})"
        except Exception as e:
            health["object_storage"] = f"error: {str(e)[:100]}"
            health["status"] = "degraded"

    return health
