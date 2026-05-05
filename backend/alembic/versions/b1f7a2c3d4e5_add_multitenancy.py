"""add multitenancy: education_centers + center_id on tenant tables + SUPER_ADMIN role

Revision ID: b1f7a2c3d4e5
Revises: a5f9c2b1d4e0
Create Date: 2026-04-25
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "b1f7a2c3d4e5"
down_revision: Union[str, Sequence[str], None] = "a5f9c2b1d4e0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Tables that hold tenant-owned data and need a center_id column.
TENANT_TABLES = [
    "students",
    "teachers",
    "courses",
    "groups",
    "payments",
    "salaries",
    "rooms",
]


def upgrade() -> None:
    bind = op.get_bind()

    # 0) Add SUPER_ADMIN to the existing userrole enum (PostgreSQL only).
    if bind.dialect.name == "postgresql":
        with op.get_context().autocommit_block():
            op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'SUPER_ADMIN'")

    # 1) education_centers ---------------------------------------------------
    op.create_table(
        "education_centers",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("address", sa.String(length=500), nullable=True),
        sa.Column(
            "status", sa.String(length=20), nullable=False, server_default="Faol"
        ),
        sa.Column(
            "subscription_plan",
            sa.String(length=20),
            nullable=False,
            server_default="Basic",
        ),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index(
        "ix_centers_slug", "education_centers", ["slug"], unique=True
    )
    op.create_index("ix_centers_status", "education_centers", ["status"])

    # 2) Seed a Default Center for any pre-existing data ---------------------
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

    # 3) users: add full_name, phone, center_id ------------------------------
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("full_name", sa.String(length=200), nullable=True))
        batch.add_column(sa.Column("phone", sa.String(length=50), nullable=True))
        batch.add_column(sa.Column("center_id", sa.Integer(), nullable=True))
        batch.create_foreign_key(
            "fk_users_center_id",
            "education_centers",
            ["center_id"],
            ["id"],
            ondelete="CASCADE",
        )
    op.create_index("ix_users_center_id", "users", ["center_id"])
    op.create_index("ix_users_center_role", "users", ["center_id", "role"])

    # Backfill: every existing non-null user becomes part of the default center.
    bind.execute(
        sa.text(
            "UPDATE users SET center_id = :cid WHERE center_id IS NULL"
        ),
        {"cid": default_id},
    )

    # 4) tenant tables: add center_id, backfill, index -----------------------
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

    # 5) courses.name and rooms.name uniqueness:
    # remove old global-unique constraints (multi-tenant: same name allowed
    # across centers). We tolerate the constraint being absent on SQLite.
    try:
        with op.batch_alter_table("courses") as batch:
            batch.drop_constraint("courses_name_key", type_="unique")
    except Exception:
        pass
    try:
        with op.batch_alter_table("rooms") as batch:
            batch.drop_constraint("rooms_name_key", type_="unique")
    except Exception:
        pass


def downgrade() -> None:
    for table in TENANT_TABLES:
        op.drop_index(f"ix_{table}_center_id", table_name=table)
        with op.batch_alter_table(table) as batch:
            try:
                batch.drop_constraint(f"fk_{table}_center_id", type_="foreignkey")
            except Exception:
                pass
            batch.drop_column("center_id")

    op.drop_index("ix_users_center_role", table_name="users")
    op.drop_index("ix_users_center_id", table_name="users")
    with op.batch_alter_table("users") as batch:
        try:
            batch.drop_constraint("fk_users_center_id", type_="foreignkey")
        except Exception:
            pass
        batch.drop_column("center_id")
        batch.drop_column("phone")
        batch.drop_column("full_name")

    op.drop_index("ix_centers_status", table_name="education_centers")
    op.drop_index("ix_centers_slug", table_name="education_centers")
    op.drop_table("education_centers")
