"""In-memory WebSocket room manager for canvas multiplayer.

NOTE: State is in-memory and lost on process restart.
Replace _rooms and _sessions with Redis pub/sub for multi-instance deployments.

Lock conflict resolution is NOT atomic. Two simultaneous lock_request events
for the same node may both succeed in a race condition. Acceptable for
single-instance MVP; use a DB-level advisory lock for production.
"""

from __future__ import annotations

from fastapi import WebSocket
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.canvas import CanvasNode

# project_id → set of active WebSocket connections in that room
_rooms: dict[str, set[WebSocket]] = {}

# "{project_id}:{session_id}" → { "ws": WebSocket, "display_name": str }
_sessions: dict[str, dict] = {}


async def connect(
    project_id: str,
    ws: WebSocket,
    session_id: str,
    display_name: str = "",
) -> None:
    """Register a WebSocket connection into the project room."""
    if project_id not in _rooms:
        _rooms[project_id] = set()
    _rooms[project_id].add(ws)
    _sessions[f"{project_id}:{session_id}"] = {"ws": ws, "display_name": display_name}


async def disconnect(
    project_id: str,
    ws: WebSocket,
    session_id: str,
    db: AsyncSession,
) -> None:
    """Remove a WebSocket from the room and release any DB node locks it holds.

    Broadcasts node_unlocked for each released lock BEFORE removing the
    connection so remaining clients receive the events cleanly.
    """
    # 1. Release DB locks held by this session and broadcast node_unlocked
    result = await db.execute(
        select(CanvasNode).where(CanvasNode.active_user == session_id)
    )
    for node in result.scalars().all():
        node.active_user = None
        await broadcast(
            project_id,
            {"type": "node_unlocked", "node_id": str(node.id)},
        )
    await db.commit()

    # 2. Remove connection from room
    if project_id in _rooms:
        _rooms[project_id].discard(ws)
        if not _rooms[project_id]:
            del _rooms[project_id]
    _sessions.pop(f"{project_id}:{session_id}", None)

    # 3. Notify remaining clients
    await broadcast(project_id, {"type": "session_left", "session_id": session_id})


async def broadcast(
    project_id: str,
    event: dict,
    exclude: WebSocket | None = None,
) -> None:
    """Send an event to all WebSocket clients in a project room."""
    room = _rooms.get(project_id, set())
    for ws in list(room):
        if ws is exclude:
            continue
        try:
            await ws.send_json(event)
        except Exception:
            # Dead connection — silently skip; cleaned up on WebSocketDisconnect
            pass


def get_display_name(project_id: str, session_id: str) -> str:
    """Look up cached display name for a session (empty string if not found)."""
    return _sessions.get(f"{project_id}:{session_id}", {}).get("display_name", "")
