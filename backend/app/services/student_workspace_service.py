"""Per-browser anonymous student workspace (no fixed UUIDs or shared demo exam)."""

from __future__ import annotations

import secrets
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.canvas import CanvasProject
from app.models.models import Course, Exam, Parameter, Project, StudentWorkspace


async def bootstrap_student_workspace(db: AsyncSession) -> StudentWorkspace:
    """Create course, exam, parameters, study project, canvas project, and workspace row."""
    course = Course(name=(settings.STUDENT_WORKSPACE_COURSE_NAME or "Workspace").strip() or "Workspace")
    db.add(course)
    await db.flush()

    exam = Exam(
        course_id=course.id,
        name=(settings.STUDENT_WORKSPACE_EXAM_NAME or "Uploaded data").strip() or "Uploaded data",
        state="ready",
    )
    db.add(exam)
    await db.flush()

    db.add(
        Parameter(
            exam_id=exam.id,
            alpha=1.0,
            beta=0.3,
            gamma=0.2,
            threshold=0.6,
            k=4,
        )
    )
    study_project = Project(
        exam_id=exam.id,
        title=(settings.STUDENT_WORKSPACE_PROJECT_TITLE or "Study").strip() or "Study",
    )
    db.add(study_project)

    canvas = CanvasProject(
        title=(settings.STUDENT_WORKSPACE_CANVAS_TITLE or "Canvas").strip() or "Canvas",
    )
    db.add(canvas)
    await db.flush()

    ws = StudentWorkspace(
        exam_id=exam.id,
        canvas_project_id=canvas.id,
        student_external_id=f"student_{secrets.token_hex(12)}",
    )
    db.add(ws)
    await db.flush()
    await db.refresh(ws)
    return ws


async def get_workspace_by_exam_id(db: AsyncSession, exam_id: UUID) -> StudentWorkspace | None:
    return await db.get(StudentWorkspace, exam_id)


async def default_study_project_id(db: AsyncSession, exam_id: UUID) -> UUID | None:
    r = await db.execute(select(Project.id).where(Project.exam_id == exam_id).order_by(Project.created_at).limit(1))
    return r.scalar_one_or_none()
