"""Exam-scoped study-content generation and retrieval endpoints."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.models import Exam, StudyContent
from app.rate_limit import enforce_instructor_write_limit
from app.schemas.schemas import (
    StudyContentCreateRequest,
    StudyContentListResponse,
    StudyContentResponse,
)
from app.services.object_storage_service import get_object_bytes
from app.services.study_content_service import kickoff_study_content_generation

router = APIRouter(prefix="/api/v1", tags=["Study Content"])


def _to_response(item: StudyContent) -> StudyContentResponse:
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


@router.post("/exams/{exam_id}/study-content", response_model=StudyContentResponse)
async def create_study_content(
    exam_id: UUID,
    body: StudyContentCreateRequest,
    db: AsyncSession = Depends(get_db),
    _rl: None = Depends(enforce_instructor_write_limit),
):
    exam_result = await db.execute(select(Exam).where(Exam.id == exam_id))
    if not exam_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Exam not found")

    item = StudyContent(
        exam_id=exam_id,
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
    return _to_response(item)


@router.get("/exams/{exam_id}/study-content", response_model=StudyContentListResponse)
async def list_study_content_for_exam(
    exam_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    exam_result = await db.execute(select(Exam).where(Exam.id == exam_id))
    if not exam_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Exam not found")

    result = await db.execute(
        select(StudyContent)
        .where(StudyContent.exam_id == exam_id)
        .order_by(StudyContent.created_at.desc()),
    )
    rows = result.scalars().all()
    return StudyContentListResponse(items=[_to_response(row) for row in rows])


@router.get("/study-content/{content_id}", response_model=StudyContentResponse)
async def get_study_content(
    content_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(StudyContent).where(StudyContent.id == content_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Study content not found")
    return _to_response(item)


@router.get("/study-content/{content_id}/download")
async def download_study_content(
    content_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(StudyContent).where(StudyContent.id == content_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Study content not found")
    if item.content_type == "presentation":
        if item.status != "completed":
            raise HTTPException(status_code=400, detail="Presentation is not ready yet")
        if item.transcript is None and not item.slides_data:
            raise HTTPException(status_code=404, detail="No presentation content available")
        payload = {
            "title": item.title,
            "transcript": item.transcript,
            "slides_data": item.slides_data,
        }
        return JSONResponse(
            content=payload,
            headers={
                "Content-Disposition": f'attachment; filename="{content_id}.json"',
            },
        )

    if item.content_type not in {"audio", "video_walkthrough"}:
        raise HTTPException(
            status_code=400,
            detail="Download supports audio, video_walkthrough (MP3), or presentation (JSON)",
        )
    if not item.storage_key:
        raise HTTPException(status_code=404, detail="No generated file available")

    if item.storage_key.startswith("file://"):
        file_path = Path(item.storage_key.replace("file://", "", 1))
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Generated file is missing from local storage")
        return FileResponse(path=file_path, media_type="audio/mpeg", filename=f"{content_id}.mp3")

    if item.storage_key.startswith("s3://"):
        _, _, tail = item.storage_key.partition("s3://")
        _, _, key = tail.partition("/")
        payload = await get_object_bytes(key)
        if payload is None:
            raise HTTPException(status_code=404, detail="Unable to read generated file from object storage")
        return StreamingResponse(BytesIO(payload), media_type="audio/mpeg")

    raise HTTPException(status_code=400, detail="Unsupported storage key format")


@router.get("/study-content/{content_id}/stream")
async def stream_study_content(
    content_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    response = await download_study_content(content_id=content_id, db=db, _user=_user)
    if isinstance(response, FileResponse):
        return FileResponse(path=response.path, media_type="audio/mpeg")
    if isinstance(response, JSONResponse):
        return response
    return response
