"""add minimal projects table and study_content.project_id

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-03-21 13:20:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "d5e6f7a8b9c0"
down_revision: Union[str, None] = "c4d5e6f7a8b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    if "projects" not in insp.get_table_names():
        op.create_table(
            "projects",
            sa.Column("id", sa.UUID(), nullable=False),
            sa.Column("exam_id", sa.UUID(), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["exam_id"], ["exams.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        insp = inspect(bind)

    if "projects" in insp.get_table_names():
        existing_ix = {i["name"] for i in insp.get_indexes("projects")}
        if "ix_projects_exam_id" not in existing_ix:
            op.create_index("ix_projects_exam_id", "projects", ["exam_id"])

    if "study_content" not in insp.get_table_names():
        return

    sc_cols = {c["name"] for c in insp.get_columns("study_content")}
    if "project_id" not in sc_cols:
        op.add_column("study_content", sa.Column("project_id", sa.UUID(), nullable=True))

    fk_names = {fk["name"] for fk in insp.get_foreign_keys("study_content")}
    if "fk_study_content_project_id_projects" not in fk_names:
        op.create_foreign_key(
            "fk_study_content_project_id_projects",
            "study_content",
            "projects",
            ["project_id"],
            ["id"],
            ondelete="SET NULL",
        )

    insp = inspect(bind)
    existing_ix = {i["name"] for i in insp.get_indexes("study_content")}
    if "ix_study_content_project_id" not in existing_ix:
        op.create_index("ix_study_content_project_id", "study_content", ["project_id"])


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    if "study_content" in insp.get_table_names():
        existing_ix = {i["name"] for i in insp.get_indexes("study_content")}
        if "ix_study_content_project_id" in existing_ix:
            op.drop_index("ix_study_content_project_id", table_name="study_content")
        fk_names = {fk["name"] for fk in insp.get_foreign_keys("study_content")}
        if "fk_study_content_project_id_projects" in fk_names:
            op.drop_constraint("fk_study_content_project_id_projects", "study_content", type_="foreignkey")
        sc_cols = {c["name"] for c in insp.get_columns("study_content")}
        if "project_id" in sc_cols:
            op.drop_column("study_content", "project_id")

    if "projects" in insp.get_table_names():
        existing_ix = {i["name"] for i in insp.get_indexes("projects")}
        if "ix_projects_exam_id" in existing_ix:
            op.drop_index("ix_projects_exam_id", table_name="projects")
        op.drop_table("projects")
