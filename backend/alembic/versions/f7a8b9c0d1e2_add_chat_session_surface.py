"""add chat_sessions surface and student_id_external

Revision ID: f7a8b9c0d1e2
Revises: 96c23dd5a332
Create Date: 2026-03-22 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "f7a8b9c0d1e2"
down_revision: Union[str, None] = "96c23dd5a332"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    existing = {c["name"] for c in insp.get_columns("chat_sessions")}

    if "surface" not in existing:
        op.add_column(
            "chat_sessions",
            sa.Column(
                "surface",
                sa.String(length=20),
                nullable=False,
                server_default="instructor",
            ),
        )
    if "student_id_external" not in existing:
        op.add_column(
            "chat_sessions",
            sa.Column("student_id_external", sa.String(length=255), nullable=True),
        )

    ix_surface = "ix_chat_sessions_surface"
    ix_combo = "ix_chat_sessions_exam_surface_student"
    existing_ix = {i["name"] for i in insp.get_indexes("chat_sessions")}
    if ix_surface not in existing_ix:
        op.create_index(ix_surface, "chat_sessions", ["surface"])
    if ix_combo not in existing_ix:
        op.create_index(
            ix_combo,
            "chat_sessions",
            ["exam_id", "surface", "student_id_external"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    existing_ix = {i["name"] for i in insp.get_indexes("chat_sessions")}
    if "ix_chat_sessions_exam_surface_student" in existing_ix:
        op.drop_index("ix_chat_sessions_exam_surface_student", table_name="chat_sessions")
    if "ix_chat_sessions_surface" in existing_ix:
        op.drop_index("ix_chat_sessions_surface", table_name="chat_sessions")
    cols = {c["name"] for c in insp.get_columns("chat_sessions")}
    if "student_id_external" in cols:
        op.drop_column("chat_sessions", "student_id_external")
    if "surface" in cols:
        op.drop_column("chat_sessions", "surface")
