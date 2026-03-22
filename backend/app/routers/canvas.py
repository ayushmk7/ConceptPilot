from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models.canvas import CanvasProject, CanvasNode, CanvasEdge, CanvasMessage
from app.services.canvas.claude import stream_canvas_response

router = APIRouter()


class ProjectCreate(BaseModel):
    title: str


class NodeCreate(BaseModel):
    type: str
    title: str
    position_x: float = 0
    position_y: float = 0
    skill: Optional[str] = None


class NodeUpdate(BaseModel):
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    is_collapsed: Optional[bool] = None
    title: Optional[str] = None
    skill: Optional[str] = None


class EdgeCreate(BaseModel):
    source_node_id: UUID
    target_node_id: UUID


class MessageCreate(BaseModel):
    content: str
    session_id: str


def _node_dict(node: CanvasNode) -> dict:
    return {
        "id": str(node.id),
        "project_id": str(node.project_id),
        "type": node.type,
        "title": node.title,
        "position_x": node.position_x,
        "position_y": node.position_y,
        "is_collapsed": node.is_collapsed,
        "skill": node.skill,
        "active_user": node.active_user,
        "created_at": node.created_at.isoformat(),
    }


def _edge_dict(edge: CanvasEdge) -> dict:
    return {
        "id": str(edge.id),
        "project_id": str(edge.project_id),
        "source_node_id": str(edge.source_node_id),
        "target_node_id": str(edge.target_node_id),
        "created_at": edge.created_at.isoformat(),
    }


def _message_dict(msg: CanvasMessage) -> dict:
    return {
        "id": str(msg.id),
        "node_id": str(msg.node_id),
        "role": msg.role,
        "content": msg.content,
        "created_at": msg.created_at.isoformat(),
    }


@router.post("/projects", status_code=201)
async def create_project(body: ProjectCreate, db: AsyncSession = Depends(get_db)):
    project = CanvasProject(title=body.title)
    db.add(project)
    await db.flush()
    return {
        "id": str(project.id),
        "title": project.title,
        "created_at": project.created_at.isoformat(),
    }


@router.get("/projects/{project_id}")
async def get_project(project_id: UUID, db: AsyncSession = Depends(get_db)):
    project = await db.get(CanvasProject, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    nodes = (
        (
            await db.execute(
                select(CanvasNode).where(CanvasNode.project_id == project_id)
            )
        )
        .scalars()
        .all()
    )

    edges = (
        (
            await db.execute(
                select(CanvasEdge).where(CanvasEdge.project_id == project_id)
            )
        )
        .scalars()
        .all()
    )

    return {
        "id": str(project.id),
        "title": project.title,
        "nodes": [_node_dict(n) for n in nodes],
        "edges": [_edge_dict(e) for e in edges],
    }


@router.delete("/projects/{project_id}", status_code=204)
async def delete_project(project_id: UUID, db: AsyncSession = Depends(get_db)):
    project = await db.get(CanvasProject, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.delete(project)


@router.post("/projects/{project_id}/nodes", status_code=201)
async def create_node(
    project_id: UUID, body: NodeCreate, db: AsyncSession = Depends(get_db)
):
    project = await db.get(CanvasProject, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    node = CanvasNode(
        project_id=project_id,
        type=body.type,
        title=body.title,
        position_x=body.position_x,
        position_y=body.position_y,
        skill=body.skill,
    )
    db.add(node)
    await db.flush()
    return _node_dict(node)


@router.patch("/nodes/{node_id}")
async def update_node(
    node_id: UUID, body: NodeUpdate, db: AsyncSession = Depends(get_db)
):
    node = await db.get(CanvasNode, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(node, field, value)

    await db.flush()
    return _node_dict(node)


@router.delete("/nodes/{node_id}", status_code=204)
async def delete_node(node_id: UUID, db: AsyncSession = Depends(get_db)):
    node = await db.get(CanvasNode, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    await db.delete(node)


@router.post("/projects/{project_id}/edges", status_code=201)
async def create_edge(
    project_id: UUID, body: EdgeCreate, db: AsyncSession = Depends(get_db)
):
    project = await db.get(CanvasProject, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    edge = CanvasEdge(
        project_id=project_id,
        source_node_id=body.source_node_id,
        target_node_id=body.target_node_id,
    )
    db.add(edge)
    await db.flush()
    return _edge_dict(edge)


@router.delete("/edges/{edge_id}", status_code=204)
async def delete_edge(edge_id: UUID, db: AsyncSession = Depends(get_db)):
    edge = await db.get(CanvasEdge, edge_id)
    if not edge:
        raise HTTPException(status_code=404, detail="Edge not found")
    await db.delete(edge)


@router.get("/nodes/{node_id}/messages")
async def list_messages(node_id: UUID, db: AsyncSession = Depends(get_db)):
    node = await db.get(CanvasNode, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    msgs = (
        await db.execute(
            select(CanvasMessage)
            .where(CanvasMessage.node_id == node_id)
            .order_by(CanvasMessage.created_at)
        )
    ).scalars().all()

    return [_message_dict(m) for m in msgs]


@router.post("/nodes/{node_id}/messages")
async def send_message(
    node_id: UUID, body: MessageCreate, db: AsyncSession = Depends(get_db)
):
    node = await db.get(CanvasNode, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    async def event_stream():
        async for chunk in stream_canvas_response(node_id, body.content, body.session_id, db):
            yield chunk

    return StreamingResponse(event_stream(), media_type="text/event-stream")
