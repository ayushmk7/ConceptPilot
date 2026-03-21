"""Exam CRUD endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_instructor
from app.database import get_db
from app.models.models import Course, Exam, Parameter
from app.schemas.schemas import ExamCreate, ExamResponse

router = APIRouter(tags=["Exams"])


@router.post(
    "/api/v1/courses/{course_id}/exams",
    response_model=ExamResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_exam(
    course_id: UUID,
    body: ExamCreate,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(get_current_instructor),
):
    """Create a new exam under a course. Also initialises default parameters."""
    # Verify course exists
    result = await db.execute(select(Course).where(Course.id == course_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Course not found")

    exam = Exam(course_id=course_id, name=body.name)
    db.add(exam)
    await db.flush()

    # Create default parameters for this exam
    params = Parameter(
        exam_id=exam.id,
        alpha=1.0,
        beta=0.3,
        gamma=0.2,
        threshold=0.6,
    )
    db.add(params)
    await db.flush()
    await db.refresh(exam)
    return exam


@router.get("/api/v1/courses/{course_id}/exams", response_model=list[ExamResponse])
async def list_exams(
    course_id: UUID,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(get_current_instructor),
):
    """List all exams for a course."""
    result = await db.execute(
        select(Exam).where(Exam.course_id == course_id).order_by(Exam.created_at.desc())
    )
    return result.scalars().all()


@router.get("/api/v1/exams/{exam_id}", response_model=ExamResponse)
async def get_exam(
    exam_id: UUID,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(get_current_instructor),
):
    """Get a single exam by ID."""
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam
