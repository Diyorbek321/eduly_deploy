"""lesson_materials table

Revision ID: n3k9m4i6j7k8
Revises: m2j8l3h5i6j7
Create Date: 2026-05-18 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "n3k9m4i6j7k8"
down_revision = "m2j8l3h5i6j7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "lesson_materials",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("center_id", sa.Integer(), sa.ForeignKey("education_centers.id", ondelete="CASCADE"), nullable=True),
        sa.Column("group_id", sa.Integer(), sa.ForeignKey("groups.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("file_path", sa.String(500), nullable=False),
        sa.Column("file_name", sa.String(200), nullable=False),
        sa.Column("file_type", sa.String(20), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=True),
        sa.Column("uploaded_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_lm_group_id", "lesson_materials", ["group_id"])
    op.create_index("ix_lm_center_id", "lesson_materials", ["center_id"])


def downgrade() -> None:
    op.drop_index("ix_lm_center_id", "lesson_materials")
    op.drop_index("ix_lm_group_id", "lesson_materials")
    op.drop_table("lesson_materials")
