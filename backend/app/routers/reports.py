"""Student report endpoint: API-09 — token-based access, no auth required."""

import uuid as _uuid_mod
from datetime import timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_instructor
from app.config import settings
from app.database import get_db
from app.models.models import ConceptGraph, Exam, ReadinessResult, StudentToken
from app.schemas.schemas import (
    StudentListItem,
    StudentListResponse,
    StudentReportResponse,
    StudentTokenItem,
    StudentTokenListResponse,
)
from app.services.report_service import build_student_report, is_token_expired

router = APIRouter(tags=["Reports"])


@router.get("/api/v1/exams/{exam_id}/reports/tokens", response_model=StudentTokenListResponse)
async def list_report_tokens(
    exam_id: UUID,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(get_current_instructor),
):
    """List all student report tokens for an exam (instructor only).

    Auto-creates tokens for any students found in ReadinessResult that
    don't already have one, ensuring the student list is always complete
    after compute has been run.
    """
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Exam not found")

    # Find all students from readiness results
    student_result = await db.execute(
        select(distinct(ReadinessResult.student_id_external))
        .where(ReadinessResult.exam_id == exam_id)
    )
    all_student_ids = {row[0] for row in student_result.fetchall()}

    # Load existing tokens
    t_result = await db.execute(
        select(StudentToken).where(StudentToken.exam_id == exam_id)
    )
    existing_tokens = {t.student_id_external: t for t in t_result.scalars().all()}

    # Auto-create missing tokens
    created_new = False
    for sid in all_student_ids:
        if sid not in existing_tokens:
            new_token = StudentToken(
                exam_id=exam_id,
                student_id_external=sid,
                token=_uuid_mod.uuid4(),
            )
            db.add(new_token)
            existing_tokens[sid] = new_token
            created_new = True

    if created_new:
        await db.flush()

    expiry_days = settings.STUDENT_TOKEN_EXPIRY_DAYS
    items = [
        StudentTokenItem(
            student_id=t.student_id_external,
            token=str(t.token),
            created_at=t.created_at,
            expires_at=t.created_at + timedelta(days=expiry_days),
        )
        for t in existing_tokens.values()
    ]
    items.sort(key=lambda x: x.student_id)
    return StudentTokenListResponse(tokens=items)


@router.get("/api/v1/reports/{token}", response_model=StudentReportResponse)
async def get_student_report(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a student report using a unique token. No authentication required.

    The report includes:
      - Personal concept graph with readiness coloring
      - Top 5 weakest concepts
      - Study plan (topologically ordered)

    Excludes peer comparisons, rankings, and percentiles.
    """
    # Look up token
    t_result = await db.execute(
        select(StudentToken).where(StudentToken.token == token)
    )
    token_row = t_result.scalar_one_or_none()

    if not token_row:
        raise HTTPException(status_code=404, detail="Invalid or expired report token")

    # Check expiry
    if is_token_expired(token_row.created_at):
        raise HTTPException(status_code=410, detail="Report token has expired")

    exam_id = token_row.exam_id
    student_id = token_row.student_id_external

    # Load graph
    g_result = await db.execute(
        select(ConceptGraph)
        .where(ConceptGraph.exam_id == exam_id)
        .order_by(ConceptGraph.version.desc())
        .limit(1)
    )
    graph_row = g_result.scalar_one_or_none()
    graph_json = graph_row.graph_json if graph_row else {"nodes": [], "edges": []}

    # Load all readiness results for this exam
    rr_result = await db.execute(
        select(ReadinessResult).where(ReadinessResult.exam_id == exam_id)
    )
    all_results = rr_result.scalars().all()

    # Convert to dicts for the service
    results_dicts = [
        {
            "student_id": r.student_id_external,
            "concept_id": r.concept_id,
            "direct_readiness": r.direct_readiness,
            "prerequisite_penalty": r.prerequisite_penalty,
            "downstream_boost": r.downstream_boost,
            "final_readiness": r.final_readiness,
            "confidence": r.confidence,
        }
        for r in all_results
        if r.student_id_external == student_id
    ]

    concepts = list({r["concept_id"] for r in results_dicts})

    report = build_student_report(
        student_id=student_id,
        exam_id=str(exam_id),
        graph_json=graph_json,
        readiness_results=results_dicts,
        concepts=concepts,
    )

    return StudentReportResponse(**report)


# ---------------------------------------------------------------------------
# Direct instructor endpoints (no tokens required)
# ---------------------------------------------------------------------------

@router.get("/api/v1/exams/{exam_id}/students", response_model=StudentListResponse)
async def list_students(
    exam_id: UUID,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(get_current_instructor),
):
    """List all student IDs that have readiness results for this exam.

    This is the authoritative source for 'which students have been computed'.
    Does not require tokens — intended for instructor use only.
    """
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Exam not found")

    student_result = await db.execute(
        select(distinct(ReadinessResult.student_id_external))
        .where(ReadinessResult.exam_id == exam_id)
        .order_by(ReadinessResult.student_id_external)
    )
    student_ids = [row[0] for row in student_result.fetchall()]

    return StudentListResponse(
        students=[StudentListItem(student_id=sid) for sid in student_ids]
    )


@router.get("/api/v1/exams/{exam_id}/students/{student_id}/report", response_model=StudentReportResponse)
async def get_student_report_direct(
    exam_id: UUID,
    student_id: str,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(get_current_instructor),
):
    """Get the full report for a specific student by ID (instructor access, no token needed)."""
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Exam not found")

    # Load graph
    g_result = await db.execute(
        select(ConceptGraph)
        .where(ConceptGraph.exam_id == exam_id)
        .order_by(ConceptGraph.version.desc())
        .limit(1)
    )
    graph_row = g_result.scalar_one_or_none()
    graph_json = graph_row.graph_json if graph_row else {"nodes": [], "edges": []}

    # Load readiness results for this student only
    rr_result = await db.execute(
        select(ReadinessResult).where(
            ReadinessResult.exam_id == exam_id,
            ReadinessResult.student_id_external == student_id,
        )
    )
    student_rows = rr_result.scalars().all()

    if not student_rows:
        raise HTTPException(status_code=404, detail=f"No results found for student '{student_id}'")

    results_dicts = [
        {
            "student_id": r.student_id_external,
            "concept_id": r.concept_id,
            "direct_readiness": r.direct_readiness,
            "prerequisite_penalty": r.prerequisite_penalty,
            "downstream_boost": r.downstream_boost,
            "final_readiness": r.final_readiness,
            "confidence": r.confidence,
        }
        for r in student_rows
    ]

    concepts = list({r["concept_id"] for r in results_dicts})

    report = build_student_report(
        student_id=student_id,
        exam_id=str(exam_id),
        graph_json=graph_json,
        readiness_results=results_dicts,
        concepts=concepts,
    )

    return StudentReportResponse(**report)
