"""Branches router — multi-branch management for owners."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.permissions import require_admin
from app.core.tenant import TenantContext, get_tenant
from app.dependencies import get_db
from app.models.models import (
    BranchRole,
    EducationCenter,
    Group,
    Payment,
    PaymentStatus,
    Student,
    StudentStatus,
    Teacher,
    UserCenterAccess,
)
from app.schemas.branch import BranchCreate, BranchOut, BranchStatsOut, UserCenterAccessCreate

router = APIRouter(dependencies=[Depends(require_admin)])


def _get_accessible_centers(db: Session, tenant: TenantContext) -> list[dict]:
    """Return all EducationCenters the current user can access, with role labels."""
    results: list[dict] = []

    if tenant.is_super_admin:
        centers = db.query(EducationCenter).filter(EducationCenter.deleted_at.is_(None)).all()
        for c in centers:
            results.append({"center": c, "role": "SUPER_ADMIN"})
        return results

    own = db.query(EducationCenter).filter(
        EducationCenter.id == tenant.user.center_id,
        EducationCenter.deleted_at.is_(None),
    ).first()
    if own:
        results.append({"center": own, "role": "ADMIN"})

    extras = (
        db.query(UserCenterAccess, EducationCenter)
        .join(EducationCenter, UserCenterAccess.center_id == EducationCenter.id)
        .filter(
            UserCenterAccess.user_id == tenant.user.id,
            EducationCenter.deleted_at.is_(None),
        )
        .all()
    )
    seen = {own.id} if own else set()
    for access, center in extras:
        if center.id not in seen:
            results.append({"center": center, "role": access.role.value})
            seen.add(center.id)

    return results


def _branch_stats(db: Session, center_id: int) -> dict:
    total_students = (
        db.query(func.count(Student.id)).filter(Student.center_id == center_id).scalar() or 0
    )
    active_students = (
        db.query(func.count(Student.id))
        .filter(Student.center_id == center_id, Student.status == StudentStatus.FAOL)
        .scalar()
        or 0
    )
    total_teachers = (
        db.query(func.count(Teacher.id)).filter(Teacher.center_id == center_id).scalar() or 0
    )
    total_groups = (
        db.query(func.count(Group.id)).filter(Group.center_id == center_id).scalar() or 0
    )
    total_revenue = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(Payment.center_id == center_id, Payment.status == PaymentStatus.MUVAFFAQIYATLI)
        .scalar()
    )
    total_debt = (
        db.query(func.coalesce(func.sum(Student.debt), 0))
        .filter(Student.center_id == center_id)
        .scalar()
    )
    return {
        "total_students": total_students,
        "active_students": active_students,
        "total_teachers": total_teachers,
        "total_groups": total_groups,
        "total_revenue": float(total_revenue),
        "total_debt": float(total_debt),
    }


@router.get("/", response_model=list[BranchOut])
def list_branches(
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    accessible = _get_accessible_centers(db, tenant)
    return [
        BranchOut(
            id=item["center"].id,
            name=item["center"].name,
            slug=item["center"].slug,
            phone=item["center"].phone,
            address=item["center"].address,
            status=item["center"].status.value if hasattr(item["center"].status, "value") else item["center"].status,
            role=item["role"],
            created_at=item["center"].created_at,
        )
        for item in accessible
    ]


@router.get("/{branch_id}/stats", response_model=BranchStatsOut)
def branch_stats(
    branch_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    accessible = _get_accessible_centers(db, tenant)
    entry = next((x for x in accessible if x["center"].id == branch_id), None)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Filial topilmadi")

    c = entry["center"]
    branch_out = BranchOut(
        id=c.id,
        name=c.name,
        slug=c.slug,
        phone=c.phone,
        address=c.address,
        status=c.status.value if hasattr(c.status, "value") else c.status,
        role=entry["role"],
        created_at=c.created_at,
    )
    return BranchStatsOut(branch=branch_out, **_branch_stats(db, branch_id))


@router.post("/", response_model=BranchOut, status_code=status.HTTP_201_CREATED)
def create_branch(
    body: BranchCreate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    if db.query(EducationCenter).filter(EducationCenter.slug == body.slug).first():
        raise HTTPException(status_code=400, detail="Bu slug allaqachon mavjud")

    from app.models.models import CenterStatus, SubscriptionPlan

    center = EducationCenter(
        name=body.name,
        slug=body.slug,
        phone=body.phone,
        address=body.address,
        status=CenterStatus.FAOL,
        subscription_plan=SubscriptionPlan.BASIC,
    )
    db.add(center)
    db.flush()

    access = UserCenterAccess(
        user_id=tenant.user.id,
        center_id=center.id,
        role=BranchRole.OWNER,
    )
    db.add(access)
    db.commit()
    db.refresh(center)

    return BranchOut(
        id=center.id,
        name=center.name,
        slug=center.slug,
        phone=center.phone,
        address=center.address,
        status=center.status.value if hasattr(center.status, "value") else center.status,
        role="OWNER",
        created_at=center.created_at,
    )


@router.post("/{branch_id}/access", status_code=status.HTTP_201_CREATED)
def grant_access(
    branch_id: int,
    body: UserCenterAccessCreate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    accessible = _get_accessible_centers(db, tenant)
    if not any(x["center"].id == branch_id and x["role"] in ("OWNER", "ADMIN", "SUPER_ADMIN") for x in accessible):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")

    existing = db.query(UserCenterAccess).filter(
        UserCenterAccess.user_id == body.user_id,
        UserCenterAccess.center_id == branch_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Foydalanuvchi allaqachon qo'shilgan")

    role_enum = BranchRole.BRANCH_ADMIN if body.role == "BRANCH_ADMIN" else BranchRole.OWNER
    access = UserCenterAccess(user_id=body.user_id, center_id=branch_id, role=role_enum)
    db.add(access)
    db.commit()
    return {"success": True}
