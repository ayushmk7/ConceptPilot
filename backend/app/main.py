"""ConceptPilot FastAPI application entry point."""

import logging
import sys

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.middleware.observability import ObservabilityMiddleware
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
    reports,
    upload,
)

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

cors_origins = [origin.strip() for origin in settings.CORS_ALLOWED_ORIGINS.split(",") if origin.strip()]
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
    from app.config import settings
    from app.database import engine

    health = {
        "status": "healthy",
        "service": "conceptpilot-api",
        "database": "unknown",
        "anthropic": "unknown",
    }

    try:
        async with engine.connect() as conn:
            await conn.execute(
                __import__("sqlalchemy").text("SELECT 1")
            )
        health["database"] = "connected"
    except Exception as e:
        health["database"] = f"error: {str(e)[:100]}"
        health["status"] = "degraded"

    if settings.ANTHROPIC_API_KEY and len(settings.ANTHROPIC_API_KEY) > 10:
        health["anthropic"] = "configured"
    else:
        health["anthropic"] = "not_configured"

    return health
