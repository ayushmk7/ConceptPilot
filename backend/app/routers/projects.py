"""Minimal project endpoints for study-content workflows."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.models import Exam, Project, StudyContent
from app.rate_limit import enforce_instructor_write_limit
from app.schemas.schemas import (
    ProjectCreate,
    ProjectResponse,
    StudyContentCreateRequest,
    StudyContentListResponse,
    StudyContentResponse,
)
from app.services.study_content_service import kickoff_study_content_generation

router = APIRouter(prefix="/api/v1/projects", tags=["Projects"])


def _to_study_response(item: StudyContent) -> StudyContentResponse:
    return StudyContentResponse(
        id=item.id,
        exam_id=item.exam_id,
        project_id=item.project_id,
        content_type=item.content_type,
        title=item.title,
        source_context=item.source_context,
        storage_key=item.storage_key,
        transcript=item.transcript,
        slides_data=item.slides_data,
        duration_seconds=item.duration_seconds,
        status=item.status,
        error_detail=item.error_detail,
        prompt_version=item.prompt_version,
        created_at=item.created_at,
        completed_at=item.completed_at,
    )


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    _rl: None = Depends(enforce_instructor_write_limit),
):
    exam_result = await db.execute(select(Exam).where(Exam.id == body.exam_id))
    if not exam_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Exam not found")

    project = Project(exam_id=body.exam_id, title=body.title)
    db.add(project)
    await db.flush()
    await db.refresh(project)
    return project


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    exam_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
):
    exam_result = await db.execute(select(Exam).where(Exam.id == exam_id))
    if not exam_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Exam not found")

    result = await db.execute(
        select(Project).where(Project.exam_id == exam_id).order_by(Project.created_at.desc()),
    )
    return result.scalars().all()


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("/{project_id}/study-content", response_model=StudyContentResponse)
async def create_project_study_content(
    project_id: UUID,
    body: StudyContentCreateRequest,
    db: AsyncSession = Depends(get_db),
    _rl: None = Depends(enforce_instructor_write_limit),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    item = StudyContent(
        exam_id=project.exam_id,
        project_id=project.id,
        content_type=body.content_type,
        title=body.title,
        source_context={
            "focus_concepts": body.focus_concepts,
            "include_weak_concepts": body.include_weak_concepts,
        },
        status="pending",
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)
    kickoff_study_content_generation(item.id)
    return _to_study_response(item)


@router.get("/{project_id}/study-content", response_model=StudyContentListResponse)
async def list_project_study_content(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    rows = await db.execute(
        select(StudyContent)
        .where(StudyContent.project_id == project.id)
        .order_by(StudyContent.created_at.desc()),
    )
    return StudyContentListResponse(items=[_to_study_response(row) for row in rows.scalars().all()])
