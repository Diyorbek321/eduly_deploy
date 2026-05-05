"""finish tenant sweep: center_id on remaining tables + per-center settings

Revision ID: c2f8b3d4e5f6
Revises: b1f7a2c3d4e5
Create Date: 2026-04-25
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "c2f8b3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "b1f7a2c3d4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Tables that need a center_id column added in this migration.
TENANT_TABLES = [
    "attendances",
    "sms_templates",
    "sms_messages",
    "sms_balance",
    "support_bookings",
    "rewards",
    "student_wallets",
    "reward_purchases",
    "center_settings",
]


def upgrade() -> None:
    bind = op.get_bind()
    default_id = bind.execute(
        sa.text("SELECT id FROM education_centers WHERE slug = 'default'")
    ).scalar()
    if default_id is None:
        # Should never happen, but seed safely.
        bind.execute(
            sa.text(
                """
                INSERT INTO education_centers
                  (name, slug, status, subscription_plan, created_at, updated_at)
                VALUES
                  ('Default Center', 'default', 'Faol', 'Pro',
                   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
            )
        )
        default_id = bind.execute(
            sa.text("SELECT id FROM education_centers WHERE slug = 'default'")
        ).scalar_one()

    for table in TENANT_TABLES:
        with op.batch_alter_table(table) as batch:
            batch.add_column(sa.Column("center_id", sa.Integer(), nullable=True))
            batch.create_foreign_key(
                f"fk_{table}_center_id",
                "education_centers",
                ["center_id"],
                ["id"],
                ondelete="CASCADE",
            )
        op.create_index(f"ix_{table}_center_id", table, ["center_id"])
        bind.execute(
            sa.text(
                f"UPDATE {table} SET center_id = :cid WHERE center_id IS NULL"
            ),
            {"cid": default_id},
        )



def downgrade() -> None:
    for table in TENANT_TABLES:
        op.drop_index(f"ix_{table}_center_id", table_name=table)
        with op.batch_alter_table(table) as batch:
            try:
                batch.drop_constraint(f"fk_{table}_center_id", type_="foreignkey")
            except Exception:
                pass
            batch.drop_column("center_id")
