"""Persist instructor canvas (React Flow) workspaces."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_instructor
from app.database import get_db
from app.models.models import CanvasWorkspace
from app.rate_limit import enforce_instructor_write_limit
from app.schemas.schemas import CanvasWorkspaceCreate, CanvasWorkspaceResponse, CanvasWorkspaceUpdate

router = APIRouter(prefix="/api/v1/canvas-workspaces", tags=["Canvas workspaces"])


def _to_response(row: CanvasWorkspace) -> CanvasWorkspaceResponse:
    return CanvasWorkspaceResponse(
        id=row.id,
        title=row.title,
        state=row.state if isinstance(row.state, dict) else {},
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get("", response_model=list[CanvasWorkspaceResponse])
async def list_canvas_workspaces(
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(get_current_instructor),
):
    result = await db.execute(select(CanvasWorkspace).order_by(CanvasWorkspace.updated_at.desc()))
    return [_to_response(r) for r in result.scalars().all()]


@router.post("", response_model=CanvasWorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_canvas_workspace(
    body: CanvasWorkspaceCreate,
    db: AsyncSession = Depends(get_db),
    _rl: None = Depends(enforce_instructor_write_limit),
    _user: str = Depends(get_current_instructor),
):
    now = datetime.utcnow()
    row = CanvasWorkspace(
        title=body.title.strip(),
        state=body.state or {},
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    await db.flush()
    await db.refresh(row)
    return _to_response(row)


@router.get("/{workspace_id}", response_model=CanvasWorkspaceResponse)
async def get_canvas_workspace(
    workspace_id: UUID,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(get_current_instructor),
):
    result = await db.execute(select(CanvasWorkspace).where(CanvasWorkspace.id == workspace_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Canvas workspace not found")
    return _to_response(row)


@router.put("/{workspace_id}", response_model=CanvasWorkspaceResponse)
async def update_canvas_workspace(
    workspace_id: UUID,
    body: CanvasWorkspaceUpdate,
    db: AsyncSession = Depends(get_db),
    _rl: None = Depends(enforce_instructor_write_limit),
    _user: str = Depends(get_current_instructor),
):
    result = await db.execute(select(CanvasWorkspace).where(CanvasWorkspace.id == workspace_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Canvas workspace not found")
    if body.title is not None:
        row.title = body.title.strip()
    if body.state is not None:
        row.state = body.state
    row.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(row)
    return _to_response(row)


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_canvas_workspace(
    workspace_id: UUID,
    db: AsyncSession = Depends(get_db),
    _rl: None = Depends(enforce_instructor_write_limit),
    _user: str = Depends(get_current_instructor),
):
    result = await db.execute(select(CanvasWorkspace).where(CanvasWorkspace.id == workspace_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Canvas workspace not found")
    await db.delete(row)
    await db.flush()
