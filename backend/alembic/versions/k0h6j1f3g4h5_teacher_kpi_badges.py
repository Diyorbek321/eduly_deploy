"""add teacher_kpis and teacher_badges tables

Revision ID: k0h6j1f3g4h5
Revises: j9g5i0e2f3g4
Create Date: 2026-05-18

"""
from alembic import op
import sqlalchemy as sa

revision = 'k0h6j1f3g4h5'
down_revision = 'j9g5i0e2f3g4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'teacher_kpis',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('teacher_id', sa.Integer(), sa.ForeignKey('teachers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('center_id', sa.Integer(), sa.ForeignKey('education_centers.id', ondelete='CASCADE'), nullable=True),
        sa.Column('month', sa.String(7), nullable=False),
        sa.Column('retention_score', sa.Float(), server_default='0'),
        sa.Column('homework_score', sa.Float(), server_default='0'),
        sa.Column('attendance_score', sa.Float(), server_default='0'),
        sa.Column('payment_score', sa.Float(), server_default='0'),
        sa.Column('total_score', sa.Float(), server_default='0'),
        sa.Column('bonus_tier', sa.String(20), nullable=True),
        sa.Column('bonus_percent', sa.Float(), server_default='0'),
        sa.Column('student_count', sa.Integer(), server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_kpi_teacher_month', 'teacher_kpis', ['teacher_id', 'month'], unique=True)
    op.create_index('ix_kpi_center', 'teacher_kpis', ['center_id'])

    op.create_table(
        'teacher_badges',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('teacher_id', sa.Integer(), sa.ForeignKey('teachers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('center_id', sa.Integer(), sa.ForeignKey('education_centers.id', ondelete='CASCADE'), nullable=True),
        sa.Column('badge_type', sa.String(50), nullable=False),
        sa.Column('awarded_at', sa.DateTime(), nullable=True),
        sa.Column('description', sa.String(300), nullable=True),
    )
    op.create_index('ix_badge_teacher', 'teacher_badges', ['teacher_id'])
    op.create_index('ix_badge_unique', 'teacher_badges', ['teacher_id', 'badge_type'], unique=True)


def downgrade() -> None:
    op.drop_table('teacher_badges')
    op.drop_table('teacher_kpis')
