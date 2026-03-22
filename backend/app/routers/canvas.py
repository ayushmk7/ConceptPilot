import asyncio
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.canvas import (
    CanvasBranch,
    CanvasEdge,
    CanvasFile,
    CanvasMessage,
    CanvasNode,
    CanvasProject,
    CanvasSession,
)
from app.services.canvas.claude import stream_canvas_response
from app.services.canvas.multiplayer import broadcast
from app.services.canvas.storage import save_file

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
    node_data = _node_dict(node)
    asyncio.create_task(
        broadcast(str(project_id), {"type": "node_created", "node": node_data})
    )
    return node_data


@router.patch("/nodes/{node_id}")
async def update_node(
    node_id: UUID, body: NodeUpdate, db: AsyncSession = Depends(get_db)
):
    node = await db.get(CanvasNode, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    updated = body.model_dump(exclude_unset=True)
    for field, value in updated.items():
        setattr(node, field, value)

    await db.flush()
    node_data = _node_dict(node)

    if "is_collapsed" in updated:
        asyncio.create_task(
            broadcast(
                str(node.project_id),
                {
                    "type": "node_collapsed",
                    "node_id": str(node_id),
                    "is_collapsed": node.is_collapsed,
                },
            )
        )
    elif "position_x" in updated or "position_y" in updated:
        asyncio.create_task(
            broadcast(
                str(node.project_id),
                {
                    "type": "node_moved",
                    "node_id": str(node_id),
                    "x": node.position_x,
                    "y": node.position_y,
                },
            )
        )

    return node_data


@router.delete("/nodes/{node_id}", status_code=204)
async def delete_node(node_id: UUID, db: AsyncSession = Depends(get_db)):
    node = await db.get(CanvasNode, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    project_id = str(node.project_id)
    await db.delete(node)
    asyncio.create_task(
        broadcast(project_id, {"type": "node_deleted", "node_id": str(node_id)})
    )


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
    edge_data = _edge_dict(edge)
    asyncio.create_task(
        broadcast(str(project_id), {"type": "edge_created", "edge": edge_data})
    )
    return edge_data


@router.delete("/edges/{edge_id}", status_code=204)
async def delete_edge(edge_id: UUID, db: AsyncSession = Depends(get_db)):
    edge = await db.get(CanvasEdge, edge_id)
    if not edge:
        raise HTTPException(status_code=404, detail="Edge not found")
    project_id = str(edge.project_id)
    await db.delete(edge)
    asyncio.create_task(
        broadcast(project_id, {"type": "edge_deleted", "edge_id": str(edge_id)})
    )


@router.get("/nodes/{node_id}/messages")
async def list_messages(node_id: UUID, db: AsyncSession = Depends(get_db)):
    node = await db.get(CanvasNode, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    msgs = (
        (
            await db.execute(
                select(CanvasMessage)
                .where(CanvasMessage.node_id == node_id)
                .order_by(CanvasMessage.created_at)
            )
        )
        .scalars()
        .all()
    )

    return [_message_dict(m) for m in msgs]


@router.post("/nodes/{node_id}/messages")
async def send_message(
    node_id: UUID, body: MessageCreate, db: AsyncSession = Depends(get_db)
):
    node = await db.get(CanvasNode, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    async def event_stream():
        async for chunk in stream_canvas_response(
            node_id, body.content, body.session_id, db
        ):
            yield chunk

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ---------------------------------------------------------------------------
# Branching
# ---------------------------------------------------------------------------


class BranchCreate(BaseModel):
    source_message_ids: list[str]
    title: str


@router.post("/nodes/{node_id}/branch", status_code=201)
async def create_branch(
    node_id: UUID, body: BranchCreate, db: AsyncSession = Depends(get_db)
):
    node = await db.get(CanvasNode, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    child = CanvasNode(
        project_id=node.project_id,
        type="chat",
        title=body.title,
        position_x=node.position_x + 300,
        position_y=node.position_y + 100,
        skill=node.skill,
    )
    db.add(child)
    await db.flush()

    edge = CanvasEdge(
        project_id=node.project_id,
        source_node_id=node_id,
        target_node_id=child.id,
    )
    db.add(edge)
    await db.flush()

    branch = CanvasBranch(
        parent_node_id=node_id,
        child_node_id=child.id,
        source_message_ids_json=body.source_message_ids,
    )
    db.add(branch)
    await db.flush()

    child_data = _node_dict(child)
    edge_data = _edge_dict(edge)
    asyncio.create_task(
        broadcast(str(node.project_id), {"type": "node_created", "node": child_data})
    )
    asyncio.create_task(
        broadcast(str(node.project_id), {"type": "edge_created", "edge": edge_data})
    )
    return {
        "child_node": child_data,
        "edge": edge_data,
        "branch_record": {
            "id": str(branch.id),
            "parent_node_id": str(branch.parent_node_id),
            "child_node_id": str(branch.child_node_id),
            "source_message_ids": branch.source_message_ids_json,
            "created_at": branch.created_at.isoformat(),
        },
    }


# ---------------------------------------------------------------------------
# File upload
# ---------------------------------------------------------------------------


_SUPPORTED_CONTENT_TYPES = {
    "image/jpeg": "image",
    "image/png": "image",
    "image/gif": "image",
    "image/webp": "image",
    "application/pdf": "document",
}

_MAX_FILE_BYTES = 20 * 1024 * 1024  # 20 MB


@router.post("/projects/{project_id}/files", status_code=201)
async def upload_file(
    project_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    project = await db.get(CanvasProject, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    file_bytes = await file.read()
    if len(file_bytes) > _MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 20 MB)")

    content_type = file.content_type or ""
    node_type = _SUPPORTED_CONTENT_TYPES.get(content_type)
    if not node_type:
        raise HTTPException(
            status_code=415,
            detail="Unsupported file type — upload an image (JPEG/PNG/GIF/WebP) or PDF",
        )

    node = CanvasNode(
        project_id=project_id,
        type=node_type,
        title=file.filename or "Uploaded file",
        position_x=0,
        position_y=0,
    )
    db.add(node)
    await db.flush()

    stored = await save_file(
        file_bytes,
        file.filename or "file",
        content_type,
        str(project_id),
    )

    canvas_file = CanvasFile(
        project_id=project_id,
        node_id=node.id,
        filename=file.filename or "file",
        content_type=content_type,
        file_data=stored["file_data"],
        storage_key=stored["storage_key"],
    )
    db.add(canvas_file)
    await db.flush()

    return {
        "node_id": str(node.id),
        "file_id": str(canvas_file.id),
        "type": node_type,
    }


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------


class SessionCreate(BaseModel):
    display_name: str


@router.post("/projects/{project_id}/sessions", status_code=201)
async def create_session(
    project_id: UUID, body: SessionCreate, db: AsyncSession = Depends(get_db)
):
    project = await db.get(CanvasProject, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    session = CanvasSession(
        project_id=project_id,
        display_name=body.display_name,
    )
    db.add(session)
    await db.flush()

    asyncio.create_task(
        broadcast(
            str(project_id),
            {
                "type": "session_joined",
                "session_id": str(session.id),
                "display_name": session.display_name,
            },
        )
    )
    return {
        "session_id": str(session.id),
        "display_name": session.display_name,
    }


# ---------------------------------------------------------------------------
# Artifact download
# ---------------------------------------------------------------------------


@router.get("/nodes/{node_id}/artifact/download")
async def download_artifact(node_id: UUID, db: AsyncSession = Depends(get_db)):
    node = await db.get(CanvasNode, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    if node.type != "artifact":
        raise HTTPException(status_code=400, detail="Node is not an artifact")

    # Fetch the latest assistant message — that's the generated artifact content
    result = await db.execute(
        select(CanvasMessage)
        .where(CanvasMessage.node_id == node_id)
        .where(CanvasMessage.role == "assistant")
        .order_by(CanvasMessage.created_at.desc())
        .limit(1)
    )
    msg = result.scalar_one_or_none()
    if not msg or not msg.content:
        raise HTTPException(status_code=404, detail="Artifact has no content yet")

    safe_title = "".join(
        c if c.isalnum() or c in "-_ " else "" for c in (node.title or "artifact")
    )
    filename = f"{safe_title.strip().replace(' ', '_')}.md"

    return Response(
        content=msg.content.encode("utf-8"),
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
