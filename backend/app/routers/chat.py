"""Chat API endpoints for the agentic AI assistant.

Supports multi-turn conversations with persistent sessions.
The assistant uses Anthropic tool use to query and act
on the full ConceptPilot system.
"""

import logging
import uuid as uuid_mod
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import get_db
from app.models.models import ChatMessage, ChatSession, Exam, StudentToken
from app.schemas.schemas import (
    ChatMessageResponse,
    ChatSendRequest,
    ChatSendResponse,
    ChatSessionCreate,
    ChatSessionResponse,
)
from app.services.chat_service import run_agent_turn

logger = logging.getLogger("conceptpilot.chat")

router = APIRouter(prefix="/chat", tags=["Chat"])


async def _lookup_student_token(db: AsyncSession, token_str: str) -> StudentToken:
    """Resolve a report permalink token to a StudentToken row."""
    raw = (token_str or "").strip()
    if not raw:
        raise HTTPException(status_code=400, detail="report_token is required for student chat")
    try:
        tid = uuid_mod.UUID(raw)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid report token format") from exc
    result = await db.execute(select(StudentToken).where(StudentToken.token == tid))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Report token not found")
    return row


def _require_anthropic_for_chat() -> None:
    if not (settings.ANTHROPIC_API_KEY or "").strip():
        raise HTTPException(
            status_code=503,
            detail="Chat assistant is not configured: set ANTHROPIC_API_KEY in the backend environment.",
        )


@router.post("/sessions", response_model=ChatSessionResponse)
async def create_session(
    body: ChatSessionCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new chat session, optionally scoped to an exam."""
    exam_id: Optional[UUID] = body.exam_id
    student_id: Optional[str] = None
    surface = body.surface

    if surface == "student":
        token_row = await _lookup_student_token(db, body.report_token or "")
        exam_id = token_row.exam_id
        if body.exam_id and body.exam_id != token_row.exam_id:
            raise HTTPException(
                status_code=400,
                detail="exam_id does not match the report token's exam",
            )
        student_id = token_row.student_id_external
    elif body.exam_id:
        exam = await db.get(Exam, body.exam_id)
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")

    session = ChatSession(
        exam_id=exam_id,
        surface=surface,
        student_id_external=student_id,
        title=body.title or None,
        created_by=settings.CHAT_DEFAULT_CREATED_BY,
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return session


@router.get("/sessions", response_model=list[ChatSessionResponse])
async def list_sessions(
    exam_id: Optional[UUID] = Query(None),
    surface: str = Query("instructor"),
    report_token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List chat sessions. Student sessions require a valid report_token (never listed without it)."""
    q = select(ChatSession).order_by(ChatSession.updated_at.desc())
    if surface == "student":
        token_row = await _lookup_student_token(db, report_token or "")
        q = q.where(ChatSession.surface == "student")
        q = q.where(ChatSession.exam_id == token_row.exam_id)
        q = q.where(ChatSession.student_id_external == token_row.student_id_external)
        if exam_id and exam_id != token_row.exam_id:
            raise HTTPException(status_code=400, detail="exam_id does not match report token")
    else:
        q = q.where(ChatSession.surface == "instructor")
        if exam_id:
            q = q.where(ChatSession.exam_id == exam_id)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a chat session by ID."""
    session = await db.get(ChatSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return session


@router.get("/sessions/{session_id}/messages", response_model=list[ChatMessageResponse])
async def get_messages(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get all messages in a chat session."""
    session = await db.get(ChatSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at),
    )
    messages = result.scalars().all()
    return [
        ChatMessageResponse(
            id=m.id,
            role=m.role,
            content=m.content,
            tool_calls=m.tool_calls_json,
            tool_name=m.tool_name,
            created_at=m.created_at,
        )
        for m in messages
        if m.role in ("user", "assistant")
    ]


@router.post("/sessions/{session_id}/messages", response_model=ChatSendResponse)
async def send_message(
    session_id: UUID,
    body: ChatSendRequest,
    db: AsyncSession = Depends(get_db),
):
    """Send a message to the AI assistant in an existing session."""
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.id == session_id)
        .options(selectinload(ChatSession.messages)),
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    if body.exam_id is not None and session.exam_id is not None and body.exam_id != session.exam_id:
        raise HTTPException(
            status_code=400,
            detail="exam_id does not match this chat session",
        )
    if body.surface != session.surface:
        raise HTTPException(status_code=400, detail="surface does not match this chat session")

    _require_anthropic_for_chat()
    try:
        assistant_text, tools_called = await run_agent_turn(session, body.message, db)
    except Exception as exc:
        logger.exception("run_agent_turn failed (session message)")
        detail = (
            str(exc)[:400]
            if settings.APP_ENV.lower() != "production"
            else "The assistant could not complete this request. Please try again."
        )
        raise HTTPException(status_code=502, detail=detail) from exc

    if not session.title and body.message:
        session.title = body.message[:80]

    return ChatSendResponse(
        session_id=session.id,
        assistant_message=assistant_text,
        tool_calls_made=tools_called,
    )


@router.post("/quick", response_model=ChatSendResponse)
async def quick_chat(
    body: ChatSendRequest,
    db: AsyncSession = Depends(get_db),
):
    """One-shot chat: creates a session and sends a message in one call."""
    exam_id: Optional[UUID] = body.exam_id
    student_id: Optional[str] = None
    surface = body.surface

    if surface == "student":
        if not (body.report_token or "").strip():
            raise HTTPException(status_code=400, detail="report_token is required for student chat")
        token_row = await _lookup_student_token(db, body.report_token or "")
        exam_id = token_row.exam_id
        if body.exam_id and body.exam_id != token_row.exam_id:
            raise HTTPException(
                status_code=400,
                detail="exam_id does not match the report token's exam",
            )
        student_id = token_row.student_id_external
    elif body.exam_id:
        exam = await db.get(Exam, body.exam_id)
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")

    session = ChatSession(
        exam_id=exam_id,
        surface=surface,
        student_id_external=student_id,
        title=body.message[:80] if body.message else None,
        created_by=settings.CHAT_DEFAULT_CREATED_BY,
    )
    db.add(session)
    await db.flush()

    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.id == session.id)
        .options(selectinload(ChatSession.messages)),
    )
    session = result.scalar_one_or_none()

    _require_anthropic_for_chat()
    try:
        assistant_text, tools_called = await run_agent_turn(session, body.message, db)
    except Exception as exc:
        logger.exception("run_agent_turn failed (quick chat)")
        detail = (
            str(exc)[:400]
            if settings.APP_ENV.lower() != "production"
            else "The assistant could not complete this request. Please try again."
        )
        raise HTTPException(status_code=502, detail=detail) from exc

    return ChatSendResponse(
        session_id=session.id,
        assistant_message=assistant_text,
        tool_calls_made=tools_called,
    )


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a chat session and all its messages."""
    session = await db.get(ChatSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    await db.delete(session)
    await db.flush()
    return {"status": "deleted"}
