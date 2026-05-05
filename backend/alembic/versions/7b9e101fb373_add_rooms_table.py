"""add_rooms_table

Revision ID: 7b9e101fb373
Revises: 3dc38fce7fe7
Create Date: 2026-04-05 17:24:06.387959

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7b9e101fb373'
down_revision: Union[str, Sequence[str], None] = '3dc38fce7fe7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'rooms',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('type', sa.String(length=200), nullable=True),
        sa.Column('capacity', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )
    op.create_index('ix_rooms_name', 'rooms', ['name'])


def downgrade() -> None:
    op.drop_index('ix_rooms_name', table_name='rooms')
    op.drop_table('rooms')
