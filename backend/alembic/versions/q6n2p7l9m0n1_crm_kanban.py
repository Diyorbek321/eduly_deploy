"""crm leads and kanban tables

Revision ID: q6n2p7l9m0n1
Revises: p5m1o6k8l9m0
Create Date: 2026-05-18 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "q6n2p7l9m0n1"
down_revision = "p5m1o6k8l9m0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "leads",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("center_id", sa.Integer(), sa.ForeignKey("education_centers.id", ondelete="CASCADE"), nullable=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("source", sa.String(50), nullable=True),
        sa.Column("stage", sa.String(50), nullable=False, server_default="Yangi"),
        sa.Column("course_interest", sa.String(200), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("assigned_to_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("trial_date", sa.Date(), nullable=True),
        sa.Column("lost_reason", sa.String(300), nullable=True),
        sa.Column("converted_student_id", sa.Integer(), sa.ForeignKey("students.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_leads_stage", "leads", ["stage"])
    op.create_index("ix_leads_phone", "leads", ["phone"])
    op.create_index("ix_leads_center", "leads", ["center_id"])

    op.create_table(
        "kanban_boards",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("center_id", sa.Integer(), sa.ForeignKey("education_centers.id", ondelete="CASCADE"), nullable=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_kb_center", "kanban_boards", ["center_id"])

    op.create_table(
        "kanban_columns",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("board_id", sa.Integer(), sa.ForeignKey("kanban_boards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("color", sa.String(20), nullable=False, server_default="#6366f1"),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("card_limit", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_kc_board", "kanban_columns", ["board_id"])

    op.create_table(
        "kanban_cards",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("column_id", sa.Integer(), sa.ForeignKey("kanban_columns.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("priority", sa.String(10), nullable=False, server_default="normal"),
        sa.Column("assignee_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("lead_id", sa.Integer(), sa.ForeignKey("leads.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_kcard_column", "kanban_cards", ["column_id"])


def downgrade() -> None:
    op.drop_table("kanban_cards")
    op.drop_table("kanban_columns")
    op.drop_table("kanban_boards")
    op.drop_table("leads")
