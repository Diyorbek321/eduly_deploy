"""add sms_opt_in to students

Revision ID: e4b0d5f6a7b8
Revises: d3a9c4e5f6g7
Create Date: 2026-05-03
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "e4b0d5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "d3a9c4e5f6g7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "students",
        sa.Column(
            "sms_opt_in",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )
    # Drop server_default after backfill so the application controls the value going forward.
    with op.batch_alter_table("students") as batch:
        batch.alter_column("sms_opt_in", server_default=None)


def downgrade() -> None:
    op.drop_column("students", "sms_opt_in")
