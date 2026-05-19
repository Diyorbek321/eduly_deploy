"""polls tables

Revision ID: s8p4r9n1o2p3
Revises: r7o3q8m0n1o2
Create Date: 2026-05-19 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "s8p4r9n1o2p3"
down_revision = "r7o3q8m0n1o2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "polls",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("center_id", sa.Integer(), sa.ForeignKey("education_centers.id", ondelete="CASCADE"), nullable=True),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("target_group_id", sa.Integer(), sa.ForeignKey("groups.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("ends_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_polls_center", "polls", ["center_id"])
    op.create_index("ix_polls_status", "polls", ["status"])

    op.create_table(
        "poll_options",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("poll_id", sa.Integer(), sa.ForeignKey("polls.id", ondelete="CASCADE"), nullable=False),
        sa.Column("emoji", sa.String(10), nullable=False),
        sa.Column("label", sa.String(100), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_po_poll", "poll_options", ["poll_id"])

    op.create_table(
        "poll_responses",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("poll_id", sa.Integer(), sa.ForeignKey("polls.id", ondelete="CASCADE"), nullable=False),
        sa.Column("option_id", sa.Integer(), sa.ForeignKey("poll_options.id", ondelete="CASCADE"), nullable=False),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_pr_poll_id", "poll_responses", ["poll_id"])
    op.create_unique_constraint("ix_pr_poll_student", "poll_responses", ["poll_id", "student_id"])


def downgrade() -> None:
    op.drop_table("poll_responses")
    op.drop_table("poll_options")
    op.drop_table("polls")
