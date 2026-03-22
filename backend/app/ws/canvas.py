"""WebSocket endpoint for canvas multiplayer."""

from uuid import UUID

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.canvas import CanvasNode, CanvasSession
from app.services.canvas.multiplayer import (
    broadcast,
    connect,
    disconnect,
    get_display_name,
)

router = APIRouter()


@router.websocket("/ws/canvas/{project_id}/{session_id}")
async def canvas_ws(
    websocket: WebSocket,
    project_id: str,
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    await websocket.accept()

    # Look up display name from DB so node_locked events include it
    session_row = await db.get(CanvasSession, UUID(session_id))
    display_name = session_row.display_name if session_row else session_id

    await connect(project_id, websocket, session_id, display_name)

    try:
        while True:
            data = await websocket.receive_json()
            await _handle_event(data, project_id, session_id, websocket, db)
    except WebSocketDisconnect:
        await disconnect(project_id, websocket, session_id, db)


async def _handle_event(
    data: dict,
    project_id: str,
    session_id: str,
    ws: WebSocket,
    db: AsyncSession,
) -> None:
    match data.get("type"):
        case "lock_request":
            await _lock_request(data, project_id, session_id, db)
        case "lock_release":
            await _lock_release(data, project_id, session_id, db)
        case "node_moved":
            await _node_moved(data, project_id, ws, db)


async def _lock_request(
    data: dict,
    project_id: str,
    session_id: str,
    db: AsyncSession,
) -> None:
    node_id = data.get("node_id")
    if not node_id:
        return

    node = await db.get(CanvasNode, UUID(node_id))
    if not node or node.active_user is not None:
        # Already locked — ignore
        return

    node.active_user = session_id
    await db.commit()

    display_name = get_display_name(project_id, session_id)
    await broadcast(
        project_id,
        {
            "type": "node_locked",
            "node_id": node_id,
            "session_id": session_id,
            "display_name": display_name,
        },
    )


async def _lock_release(
    data: dict,
    project_id: str,
    session_id: str,
    db: AsyncSession,
) -> None:
    node_id = data.get("node_id")
    if not node_id:
        return

    node = await db.get(CanvasNode, UUID(node_id))
    if not node or node.active_user != session_id:
        # Not our lock — ignore
        return

    node.active_user = None
    await db.commit()

    await broadcast(project_id, {"type": "node_unlocked", "node_id": node_id})


async def _node_moved(
    data: dict,
    project_id: str,
    ws: WebSocket,
    db: AsyncSession,
) -> None:
    node_id = data.get("node_id")
    x = data.get("x")
    y = data.get("y")
    if not node_id or x is None or y is None:
        return

    node = await db.get(CanvasNode, UUID(node_id))
    if not node:
        return

    node.position_x = x
    node.position_y = y
    await db.commit()

    # Exclude sender — they already moved the node locally
    await broadcast(
        project_id,
        {"type": "node_moved", "node_id": node_id, "x": x, "y": y},
        exclude=ws,
    )
