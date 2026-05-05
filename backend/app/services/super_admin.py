"""Super-admin service — centers, admins, and platform-wide stats.

Soft delete: ``delete_center`` sets ``deleted_at`` instead of cascading. Listed
centers exclude soft-deleted by default; ``include_deleted=True`` returns them
all (used by the deleted-centers view + restore flow).
"""

from collections import OrderedDict
from datetime import datetime, timedelta
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.models import (
    CenterStatus,
    EducationCenter,
    Payment,
    PaymentStatus,
    Student,
    SubscriptionPlan,
    Teacher,
    User,
    UserRole,
)


SOFT_DELETE_PURGE_DAYS = 30
from app.schemas.super_admin import (
    CreateAdminRequest,
    CreateCenterRequest,
    UpdateAdminRequest,
    UpdateCenterRequest,
)


# Monthly subscription price per plan (UZS) — used for MRR estimation.
PLAN_MRR: dict[SubscriptionPlan, float] = {
    SubscriptionPlan.BASIC: 500_000,
    SubscriptionPlan.PRO: 1_500_000,
    SubscriptionPlan.ENTERPRISE: 5_000_000,
}

UZ_MONTHS = [
    "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
    "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
]


# ── Helpers ─────────────────────────────────────────────────────────────────


def _serialize_center(db: Session, center: EducationCenter) -> dict[str, Any]:
    admin_count = (
        db.query(func.count(User.id))
        .filter(User.center_id == center.id, User.role == UserRole.ADMIN)
        .scalar()
    ) or 0
    student_count = (
        db.query(func.count(Student.id))
        .filter(Student.center_id == center.id)
        .scalar()
    ) or 0
    teacher_count = (
        db.query(func.count(Teacher.id))
        .filter(Teacher.center_id == center.id)
        .scalar()
    ) or 0
    return {
        "id": str(center.id),
        "name": center.name,
        "slug": center.slug,
        "phone": center.phone,
        "address": center.address,
        "status": center.status.value if hasattr(center.status, "value") else center.status,
        "subscription_plan": center.subscription_plan.value
        if hasattr(center.subscription_plan, "value")
        else center.subscription_plan,
        "admin_count": admin_count,
        "student_count": student_count,
        "teacher_count": teacher_count,
        "created_at": center.created_at,
        "deleted_at": center.deleted_at,
    }


def _serialize_admin(user: User) -> dict[str, Any]:
    return {
        "id": str(user.id),
        "center_id": str(user.center_id) if user.center_id else "",
        "full_name": user.full_name or user.email,
        "email": user.email,
        "phone": user.phone,
        "status": "Faol" if user.is_active else "Bloklangan",
        "created_at": user.created_at,
    }


def _get_center_or_404(
    db: Session, center_id: int, include_deleted: bool = False
) -> EducationCenter:
    center = db.get(EducationCenter, center_id)
    if not center:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "O'quv markazi topilmadi")
    if center.deleted_at is not None and not include_deleted:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "O'quv markazi topilmadi")
    return center


def _get_admin_or_404(db: Session, admin_id: int) -> User:
    user = db.get(User, admin_id)
    if user is None or user.role != UserRole.ADMIN:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Admin topilmadi")
    return user


# ── Centers CRUD ────────────────────────────────────────────────────────────


def list_centers(
    db: Session, include_deleted: bool = False
) -> list[dict[str, Any]]:
    q = db.query(EducationCenter)
    if not include_deleted:
        q = q.filter(EducationCenter.deleted_at.is_(None))
    centers = q.order_by(EducationCenter.created_at.desc()).all()
    return [_serialize_center(db, c) for c in centers]


def list_deleted_centers(db: Session) -> list[dict[str, Any]]:
    centers = (
        db.query(EducationCenter)
        .filter(EducationCenter.deleted_at.is_not(None))
        .order_by(EducationCenter.deleted_at.desc())
        .all()
    )
    return [_serialize_center(db, c) for c in centers]


def create_center(db: Session, data: CreateCenterRequest) -> dict[str, Any]:
    if db.query(EducationCenter).filter(EducationCenter.slug == data.slug).first():
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Bu slug allaqachon band"
        )
    center = EducationCenter(
        name=data.name,
        slug=data.slug,
        phone=data.phone,
        address=data.address,
        status=CenterStatus(data.status),
        subscription_plan=SubscriptionPlan(data.subscription_plan),
    )
    db.add(center)
    db.commit()
    db.refresh(center)
    return _serialize_center(db, center)


def get_center(db: Session, center_id: int) -> dict[str, Any]:
    return _serialize_center(db, _get_center_or_404(db, center_id))


def update_center(
    db: Session, center_id: int, data: UpdateCenterRequest
) -> dict[str, Any]:
    center = _get_center_or_404(db, center_id)
    if data.slug and data.slug != center.slug:
        if db.query(EducationCenter).filter(EducationCenter.slug == data.slug).first():
            raise HTTPException(
                status.HTTP_409_CONFLICT, "Bu slug allaqachon band"
            )
    if data.name is not None:
        center.name = data.name
    if data.slug is not None:
        center.slug = data.slug
    if data.phone is not None:
        center.phone = data.phone
    if data.address is not None:
        center.address = data.address
    if data.subscription_plan is not None:
        center.subscription_plan = SubscriptionPlan(data.subscription_plan)
    if data.status is not None:
        center.status = CenterStatus(data.status)
    db.commit()
    db.refresh(center)
    return _serialize_center(db, center)


def suspend_center(db: Session, center_id: int) -> dict[str, Any]:
    center = _get_center_or_404(db, center_id)
    center.status = CenterStatus.MUZLATILGAN
    db.commit()
    db.refresh(center)
    return _serialize_center(db, center)


def activate_center(db: Session, center_id: int) -> dict[str, Any]:
    center = _get_center_or_404(db, center_id)
    center.status = CenterStatus.FAOL
    db.commit()
    db.refresh(center)
    return _serialize_center(db, center)


def delete_center(db: Session, center_id: int) -> dict[str, Any]:
    """Soft-delete: mark ``deleted_at``, suspend the tenant, and block logins.

    Data is preserved for ``SOFT_DELETE_PURGE_DAYS`` so it can be restored. Use
    ``purge_center`` to hard-delete a soft-deleted row immediately.
    """
    center = _get_center_or_404(db, center_id)
    center.deleted_at = datetime.utcnow()
    center.status = CenterStatus.MUZLATILGAN
    db.commit()
    db.refresh(center)
    return _serialize_center(db, center)


def restore_center(db: Session, center_id: int) -> dict[str, Any]:
    center = _get_center_or_404(db, center_id, include_deleted=True)
    if center.deleted_at is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Markaz o'chirilmagan"
        )
    center.deleted_at = None
    center.status = CenterStatus.FAOL
    db.commit()
    db.refresh(center)
    return _serialize_center(db, center)


def purge_center(db: Session, center_id: int) -> None:
    """Hard delete an already-soft-deleted center. Cascades all tenant data."""
    center = _get_center_or_404(db, center_id, include_deleted=True)
    if center.deleted_at is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Markazni avval soft-delete qilish kerak",
        )
    db.delete(center)
    db.commit()


def purge_expired_centers(
    db: Session, older_than_days: int = SOFT_DELETE_PURGE_DAYS
) -> int:
    """Hard-delete centers soft-deleted more than ``older_than_days`` ago."""
    cutoff = datetime.utcnow() - timedelta(days=older_than_days)
    rows = (
        db.query(EducationCenter)
        .filter(
            EducationCenter.deleted_at.is_not(None),
            EducationCenter.deleted_at < cutoff,
        )
        .all()
    )
    for c in rows:
        db.delete(c)
    db.commit()
    return len(rows)


# ── Admins ──────────────────────────────────────────────────────────────────


def list_admins(db: Session, center_id: int) -> list[dict[str, Any]]:
    _get_center_or_404(db, center_id)
    admins = (
        db.query(User)
        .filter(User.center_id == center_id, User.role == UserRole.ADMIN)
        .order_by(User.created_at.desc())
        .all()
    )
    return [_serialize_admin(a) for a in admins]


def create_admin(
    db: Session, center_id: int, data: CreateAdminRequest
) -> dict[str, Any]:
    _get_center_or_404(db, center_id)
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Bu email allaqachon ro'yxatdan o'tgan"
        )
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        role=UserRole.ADMIN,
        is_active=True,
        full_name=data.full_name,
        phone=data.phone,
        center_id=center_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _serialize_admin(user)


def update_admin(
    db: Session, admin_id: int, data: UpdateAdminRequest
) -> dict[str, Any]:
    user = _get_admin_or_404(db, admin_id)
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.phone is not None:
        user.phone = data.phone
    if data.status is not None:
        user.is_active = data.status == "Faol"
    db.commit()
    db.refresh(user)
    return _serialize_admin(user)


def delete_admin(db: Session, admin_id: int) -> None:
    user = _get_admin_or_404(db, admin_id)
    db.delete(user)
    db.commit()


# ── Stats ───────────────────────────────────────────────────────────────────


def get_stats(db: Session) -> dict[str, Any]:
    total_centers = db.query(func.count(EducationCenter.id)).scalar() or 0
    active_centers = (
        db.query(func.count(EducationCenter.id))
        .filter(EducationCenter.status == CenterStatus.FAOL)
        .scalar()
    ) or 0
    total_students = db.query(func.count(Student.id)).scalar() or 0
    total_teachers = db.query(func.count(Teacher.id)).scalar() or 0
    total_revenue = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(Payment.status == PaymentStatus.MUVAFFAQIYATLI)
        .scalar()
    ) or 0

    # MRR = sum of plan price for every active center.
    plan_rows = (
        db.query(EducationCenter.subscription_plan, func.count(EducationCenter.id))
        .filter(EducationCenter.status == CenterStatus.FAOL)
        .group_by(EducationCenter.subscription_plan)
        .all()
    )
    mrr = 0.0
    for plan, count in plan_rows:
        plan_enum = plan if isinstance(plan, SubscriptionPlan) else SubscriptionPlan(plan)
        mrr += PLAN_MRR.get(plan_enum, 0) * count

    # 7-month rolling growth series — cumulative centers + students.
    today = datetime.utcnow().replace(day=1)
    months: "OrderedDict[tuple[int, int], dict[str, int]]" = OrderedDict()
    cursor = today - timedelta(days=30 * 6)
    cursor = cursor.replace(day=1)
    for _ in range(7):
        months[(cursor.year, cursor.month)] = {"centers": 0, "students": 0}
        # advance one month
        if cursor.month == 12:
            cursor = cursor.replace(year=cursor.year + 1, month=1)
        else:
            cursor = cursor.replace(month=cursor.month + 1)

    earliest = next(iter(months.keys()))
    earliest_dt = datetime(earliest[0], earliest[1], 1)

    centers_in_window = (
        db.query(EducationCenter.created_at)
        .filter(EducationCenter.created_at >= earliest_dt)
        .all()
    )
    students_in_window = (
        db.query(Student.created_at)
        .filter(Student.created_at >= earliest_dt)
        .all()
    )
    for (created,) in centers_in_window:
        key = (created.year, created.month)
        if key in months:
            months[key]["centers"] += 1
    for (created,) in students_in_window:
        key = (created.year, created.month)
        if key in months:
            months[key]["students"] += 1

    # Cumulative running totals.
    running_centers = total_centers - sum(m["centers"] for m in months.values())
    running_students = total_students - sum(m["students"] for m in months.values())
    growth_series = []
    for (_, month), bucket in months.items():
        running_centers += bucket["centers"]
        running_students += bucket["students"]
        growth_series.append(
            {
                "month": UZ_MONTHS[month - 1],
                "centers": running_centers,
                "students": running_students,
            }
        )

    return {
        "total_centers": total_centers,
        "active_centers": active_centers,
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_revenue": float(total_revenue),
        "mrr": float(mrr),
        "growth_series": growth_series,
    }
