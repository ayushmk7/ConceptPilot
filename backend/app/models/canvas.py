import uuid
from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Boolean,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.database import Base

# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _uuid():
    return uuid.uuid4()


def _now():
    return datetime.utcnow()


# ---------------------------------------------------------------------------
# Canvas
# ---------------------------------------------------------------------------


class CanvasProject(Base):
    __tablename__ = "canvas_projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    title = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=_now, nullable=False)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class CanvasNode(Base):
    __tablename__ = "canvas_nodes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("canvas_projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    type = Column(
        String(20), nullable=False
    )  # "chat" | "image" | "document" | "artifact"
    title = Column(String(255), nullable=False)
    position_x = Column(Float, default=0)
    position_y = Column(Float, default=0)
    is_collapsed = Column(Boolean, default=False)
    skill = Column(String(50), nullable=True)  # "Tutor" | "Socratic" | etc.
    active_user = Column(
        String(255), nullable=True
    )  # session_id of lock holder; null = unlocked
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class CanvasEdge(Base):
    __tablename__ = "canvas_edges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("canvas_projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    source_node_id = Column(
        UUID(as_uuid=True),
        ForeignKey("canvas_nodes.id", ondelete="CASCADE"),
        nullable=False,
    )
    target_node_id = Column(
        UUID(as_uuid=True),
        ForeignKey("canvas_nodes.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at = Column(DateTime, default=_now)


class CanvasMessage(Base):
    __tablename__ = "canvas_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    node_id = Column(
        UUID(as_uuid=True),
        ForeignKey("canvas_nodes.id", ondelete="CASCADE"),
        nullable=False,
    )
    role = Column(String(20), nullable=False)  # "user" | "assistant" | "tool"
    content = Column(Text, nullable=True)
    tool_calls_json = Column(JSONB, nullable=True)
    tool_call_id = Column(String(255), nullable=True)
    tool_name = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=_now)


class CanvasBranch(Base):
    __tablename__ = "canvas_branches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    parent_node_id = Column(
        UUID(as_uuid=True),
        ForeignKey("canvas_nodes.id", ondelete="CASCADE"),
        nullable=False,
    )
    child_node_id = Column(
        UUID(as_uuid=True),
        ForeignKey("canvas_nodes.id", ondelete="CASCADE"),
        nullable=False,
    )
    source_message_ids_json = Column(
        JSONB, nullable=False
    )  # list of canvas_messages.id strings
    created_at = Column(DateTime, default=_now)


class CanvasFile(Base):
    __tablename__ = "canvas_files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("canvas_projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    node_id = Column(
        UUID(as_uuid=True),
        ForeignKey("canvas_nodes.id", ondelete="CASCADE"),
        nullable=True,
    )
    filename = Column(String(255), nullable=False)
    content_type = Column(
        String(100), nullable=False
    )  # "image/png" | "image/jpeg" | "application/pdf"
    file_data = Column(Text, nullable=True)  # base64-encoded (local/dev fallback)
    storage_key = Column(String(500), nullable=True)  # Vultr S3 object key (prod)
    created_at = Column(DateTime, default=_now)


class CanvasSession(Base):
    __tablename__ = "canvas_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("canvas_projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    display_name = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=_now)
