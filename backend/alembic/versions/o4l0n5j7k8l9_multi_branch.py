"""multi_branch user_center_access table

Revision ID: o4l0n5j7k8l9
Revises: n3k9m4i6j7k8
Create Date: 2026-05-18 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "o4l0n5j7k8l9"
down_revision = "n3k9m4i6j7k8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_center_access",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("center_id", sa.Integer(), sa.ForeignKey("education_centers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="BRANCH_ADMIN"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_uca_user_id", "user_center_access", ["user_id"])
    op.create_index("ix_uca_center_id", "user_center_access", ["center_id"])
    op.create_unique_constraint("ix_uca_unique", "user_center_access", ["user_id", "center_id"])


def downgrade() -> None:
    op.drop_table("user_center_access")
