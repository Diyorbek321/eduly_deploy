"""audit log table + soft-delete on education_centers

Revision ID: d3a9c4e5f6g7
Revises: c2f8b3d4e5f6
Create Date: 2026-04-25
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "d3a9c4e5f6g7"
down_revision: Union[str, Sequence[str], None] = "c2f8b3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) audit_log
    op.create_table(
        "audit_log",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("actor_id", sa.Integer(), nullable=True),
        sa.Column("actor_email", sa.String(length=255), nullable=True),
        sa.Column("actor_role", sa.String(length=32), nullable=True),
        sa.Column("center_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("target_type", sa.String(length=50), nullable=True),
        sa.Column("target_id", sa.String(length=64), nullable=True),
        sa.Column("target_label", sa.String(length=255), nullable=True),
        sa.Column("ip", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.String(length=500), nullable=True),
        sa.Column("payload", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["center_id"], ["education_centers.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_audit_actor", "audit_log", ["actor_id"])
    op.create_index("ix_audit_center", "audit_log", ["center_id"])
    op.create_index("ix_audit_action", "audit_log", ["action"])
    op.create_index("ix_audit_target", "audit_log", ["target_type", "target_id"])
    op.create_index("ix_audit_created", "audit_log", ["created_at"])

    # 2) Soft-delete on education_centers
    with op.batch_alter_table("education_centers") as batch:
        batch.add_column(sa.Column("deleted_at", sa.DateTime(), nullable=True))
    op.create_index(
        "ix_centers_deleted_at", "education_centers", ["deleted_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_centers_deleted_at", table_name="education_centers")
    with op.batch_alter_table("education_centers") as batch:
        batch.drop_column("deleted_at")

    op.drop_index("ix_audit_created", table_name="audit_log")
    op.drop_index("ix_audit_target", table_name="audit_log")
    op.drop_index("ix_audit_action", table_name="audit_log")
    op.drop_index("ix_audit_center", table_name="audit_log")
    op.drop_index("ix_audit_actor", table_name="audit_log")
    op.drop_table("audit_log")
