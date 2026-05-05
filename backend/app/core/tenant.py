"""Tenant scoping — the single chokepoint for multi-tenant isolation.

Every endpoint that touches tenant-owned data depends on ``get_tenant``.
Every query goes through ``TenantContext.scope(query, Model)``.
Every create stamps ``center_id`` via ``TenantContext.center_id``.

SUPER_ADMIN users are not tenant-scoped (``user.center_id is None``).
They must use the ``/api/super-admin`` router instead, which is a separate
control plane and never goes through this dependency.
"""

from typing import Any

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Query, Session

from app.dependencies import get_current_user, get_db
from app.models.models import User, UserRole


class TenantContext:
    """Per-request tenant context.

    Use ``scope(query, Model)`` for every list/get query on tenant-owned tables.
    Use ``center_id`` to stamp newly-created rows.
    """

    def __init__(self, user: User, db: Session) -> None:
        self.user = user
        self.db = db

    @property
    def is_super_admin(self) -> bool:
        return self.user.role == UserRole.SUPER_ADMIN

    @property
    def center_id(self) -> int:
        if self.user.center_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Foydalanuvchi hech qaysi o'quv markaziga bog'lanmagan",
            )
        return self.user.center_id

    def scope(self, query: Query, model: Any) -> Query:
        """Apply ``center_id`` filter unless the caller is a super-admin.

        Super admins generally use the dedicated control-plane router, but if
        they call a tenant endpoint, they see all tenants (no filter).
        """
        if self.is_super_admin:
            return query
        return query.filter(model.center_id == self.user.center_id)

    def assert_owns(self, obj: Any) -> None:
        """Raise 404 if the object does not belong to the current center.

        Returning 404 (not 403) avoids leaking the existence of other tenants.
        Use after fetching a row by primary key.
        """
        if obj is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Topilmadi")
        if self.is_super_admin:
            return
        owner = getattr(obj, "center_id", None)
        if owner is None:
            # Legacy row never assigned to a tenant — treat as not found for
            # tenant users to prevent accidental access.
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Topilmadi")
        if owner != self.user.center_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Topilmadi")

    def stamp(self, **fields: Any) -> dict[str, Any]:
        """Return ``fields`` with ``center_id`` injected for create operations.

        For super admin callers, ``center_id`` must be supplied explicitly via
        ``fields`` (or left None — the tenant control plane handles that).
        """
        if not self.is_super_admin:
            fields = {**fields, "center_id": self.user.center_id}
        return fields


def get_tenant(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TenantContext:
    """Standard dependency for tenant-scoped endpoints.

    Rejects users without a ``center_id`` (other than SUPER_ADMIN), since they
    cannot be associated with any data.
    """
    if user.role != UserRole.SUPER_ADMIN and user.center_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Foydalanuvchi hech qaysi o'quv markaziga bog'lanmagan",
        )
    return TenantContext(user=user, db=db)
