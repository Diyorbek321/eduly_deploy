"""Super-admin router — multi-tenant control plane.

All endpoints in this router are restricted to SUPER_ADMIN role.
Every state-changing endpoint records an entry in the audit_log.
"""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.core.permissions import require_super_admin
from app.dependencies import get_db
from app.models.models import User
from app.schemas.super_admin import (
    AuditLogOut,
    CenterAdminOut,
    CreateAdminRequest,
    CreateCenterRequest,
    DashboardStatsOut,
    EducationCenterOut,
    UpdateAdminRequest,
    UpdateCenterRequest,
)
from app.services import audit as audit_service
from app.services import super_admin as svc

router = APIRouter()


# ── Centers ─────────────────────────────────────────────────────────────────


@router.get(
    "/centers",
    response_model=list[EducationCenterOut],
    dependencies=[Depends(require_super_admin)],
)
def list_centers(
    include_deleted: bool = Query(False),
    db: Session = Depends(get_db),
):
    return svc.list_centers(db, include_deleted=include_deleted)


@router.get(
    "/centers/deleted",
    response_model=list[EducationCenterOut],
    dependencies=[Depends(require_super_admin)],
)
def list_deleted_centers(db: Session = Depends(get_db)):
    return svc.list_deleted_centers(db)


@router.post(
    "/centers",
    response_model=EducationCenterOut,
    status_code=status.HTTP_201_CREATED,
)
def create_center(
    data: CreateCenterRequest,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require_super_admin),
):
    result = svc.create_center(db, data)
    audit_service.log(
        db,
        actor=actor,
        action="center.create",
        target_type="education_center",
        target_id=result["id"],
        target_label=result["name"],
        payload=data.model_dump(),
        request=request,
    )
    return result


@router.get(
    "/centers/{center_id}",
    response_model=EducationCenterOut,
    dependencies=[Depends(require_super_admin)],
)
def get_center(center_id: int, db: Session = Depends(get_db)):
    return svc.get_center(db, center_id)


@router.patch("/centers/{center_id}", response_model=EducationCenterOut)
def update_center(
    center_id: int,
    data: UpdateCenterRequest,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require_super_admin),
):
    result = svc.update_center(db, center_id, data)
    audit_service.log(
        db,
        actor=actor,
        action="center.update",
        target_type="education_center",
        target_id=str(center_id),
        target_label=result["name"],
        payload=data.model_dump(exclude_unset=True),
        request=request,
    )
    return result


@router.post("/centers/{center_id}/suspend", response_model=EducationCenterOut)
def suspend_center(
    center_id: int,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require_super_admin),
):
    result = svc.suspend_center(db, center_id)
    audit_service.log(
        db,
        actor=actor,
        action="center.suspend",
        target_type="education_center",
        target_id=str(center_id),
        target_label=result["name"],
        request=request,
    )
    return result


@router.post("/centers/{center_id}/activate", response_model=EducationCenterOut)
def activate_center(
    center_id: int,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require_super_admin),
):
    result = svc.activate_center(db, center_id)
    audit_service.log(
        db,
        actor=actor,
        action="center.activate",
        target_type="education_center",
        target_id=str(center_id),
        target_label=result["name"],
        request=request,
    )
    return result


@router.delete("/centers/{center_id}", response_model=EducationCenterOut)
def delete_center(
    center_id: int,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require_super_admin),
):
    """Soft delete — sets deleted_at + suspends the tenant."""
    result = svc.delete_center(db, center_id)
    audit_service.log(
        db,
        actor=actor,
        action="center.delete",
        target_type="education_center",
        target_id=str(center_id),
        target_label=result["name"],
        request=request,
    )
    return result


@router.post("/centers/{center_id}/restore", response_model=EducationCenterOut)
def restore_center(
    center_id: int,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require_super_admin),
):
    result = svc.restore_center(db, center_id)
    audit_service.log(
        db,
        actor=actor,
        action="center.restore",
        target_type="education_center",
        target_id=str(center_id),
        target_label=result["name"],
        request=request,
    )
    return result


@router.delete(
    "/centers/{center_id}/purge",
    status_code=status.HTTP_204_NO_CONTENT,
)
def purge_center(
    center_id: int,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require_super_admin),
):
    """Hard delete a soft-deleted center. Cascades all tenant data."""
    svc.purge_center(db, center_id)
    audit_service.log(
        db,
        actor=actor,
        action="center.purge",
        target_type="education_center",
        target_id=str(center_id),
        request=request,
    )
    return None


# ── Center Admins ───────────────────────────────────────────────────────────


@router.get(
    "/centers/{center_id}/admins",
    response_model=list[CenterAdminOut],
    dependencies=[Depends(require_super_admin)],
)
def list_admins(center_id: int, db: Session = Depends(get_db)):
    return svc.list_admins(db, center_id)


@router.post(
    "/centers/{center_id}/admins",
    response_model=CenterAdminOut,
    status_code=status.HTTP_201_CREATED,
)
def create_admin(
    center_id: int,
    data: CreateAdminRequest,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require_super_admin),
):
    result = svc.create_admin(db, center_id, data)
    audit_service.log(
        db,
        actor=actor,
        action="admin.create",
        target_type="user",
        target_id=result["id"],
        target_label=result["email"],
        payload={
            "center_id": center_id,
            "full_name": data.full_name,
            "email": data.email,
        },
        request=request,
    )
    return result


@router.patch("/admins/{admin_id}", response_model=CenterAdminOut)
def update_admin(
    admin_id: int,
    data: UpdateAdminRequest,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require_super_admin),
):
    result = svc.update_admin(db, admin_id, data)
    audit_service.log(
        db,
        actor=actor,
        action="admin.update",
        target_type="user",
        target_id=str(admin_id),
        target_label=result["email"],
        payload=data.model_dump(exclude_unset=True),
        request=request,
    )
    return result


@router.delete("/admins/{admin_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_admin(
    admin_id: int,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require_super_admin),
):
    svc.delete_admin(db, admin_id)
    audit_service.log(
        db,
        actor=actor,
        action="admin.delete",
        target_type="user",
        target_id=str(admin_id),
        request=request,
    )
    return None


# ── Platform Stats ──────────────────────────────────────────────────────────


@router.get(
    "/stats",
    response_model=DashboardStatsOut,
    dependencies=[Depends(require_super_admin)],
)
def get_stats(db: Session = Depends(get_db)):
    return svc.get_stats(db)


# ── Audit log ───────────────────────────────────────────────────────────────


@router.get(
    "/audit-log",
    response_model=list[AuditLogOut],
    dependencies=[Depends(require_super_admin)],
)
def list_audit_log(
    actor_id: int | None = None,
    action: str | None = None,
    target_type: str | None = None,
    target_id: str | None = None,
    center_id: int | None = None,
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    return audit_service.query(
        db,
        actor_id=actor_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        center_id=center_id,
        limit=limit,
    )


# ── Maintenance ─────────────────────────────────────────────────────────────


@router.post(
    "/maintenance/purge-expired",
    dependencies=[Depends(require_super_admin)],
)
def purge_expired(
    request: Request,
    older_than_days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    actor: User = Depends(require_super_admin),
):
    """Hard-delete soft-deleted centers older than ``older_than_days``."""
    count = svc.purge_expired_centers(db, older_than_days=older_than_days)
    audit_service.log(
        db,
        actor=actor,
        action="maintenance.purge_expired",
        payload={"older_than_days": older_than_days, "purged": count},
        request=request,
    )
    return {"purged": count, "older_than_days": older_than_days}
