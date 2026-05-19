"""course_modules daily_quests student_module_enrollments

Revision ID: t9q5s0o2p3q4
Revises: s8p4r9n1o2p3
Create Date: 2026-05-19 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "t9q5s0o2p3q4"
down_revision = "s8p4r9n1o2p3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "course_modules",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("course_id", sa.Integer(), sa.ForeignKey("courses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("level_order", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("ai_prompt_hint", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_cm_course", "course_modules", ["course_id"])
    op.create_index("ix_cm_course_order", "course_modules", ["course_id", "level_order"])

    op.create_table(
        "student_module_enrollments",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False),
        sa.Column("module_id", sa.Integer(), sa.ForeignKey("course_modules.id", ondelete="CASCADE"), nullable=False),
        sa.Column("enrolled_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_sme_student", "student_module_enrollments", ["student_id"])
    op.create_index("ix_sme_module", "student_module_enrollments", ["module_id"])

    op.create_table(
        "daily_quests",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("module_id", sa.Integer(), sa.ForeignKey("course_modules.id", ondelete="CASCADE"), nullable=False),
        sa.Column("date", sa.String(10), nullable=False),
        sa.Column("questions", sa.Text(), nullable=False),
        sa.Column("generated_at", sa.DateTime(), nullable=True),
    )
    op.create_unique_constraint("ix_dq_module_date", "daily_quests", ["module_id", "date"])

    op.create_table(
        "daily_quest_attempts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False),
        sa.Column("quest_id", sa.Integer(), sa.ForeignKey("daily_quests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("answers", sa.Text(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("coins_awarded", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.create_unique_constraint("ix_dqa_student_quest", "daily_quest_attempts", ["student_id", "quest_id"])
    op.create_index("ix_dqa_student", "daily_quest_attempts", ["student_id"])


def downgrade() -> None:
    op.drop_table("daily_quest_attempts")
    op.drop_table("daily_quests")
    op.drop_table("student_module_enrollments")
    op.drop_table("course_modules")
