"""Per-center settings service + profile self-update."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.tenant import TenantContext
from app.models.models import CenterSettings, Student, Teacher, User
from app.schemas.settings import CenterSettingsUpdate, ProfileUpdateRequest


def _get_or_create(
    db: Session, tenant: TenantContext | None = None
) -> CenterSettings:
    """One settings row per center.

    For SUPER_ADMIN (no center context), fall back to a global singleton row
    where ``center_id IS NULL`` — that row is informational only.
    """
    cid = (
        tenant.user.center_id if tenant is not None and not tenant.is_super_admin else None
    )
    q = db.query(CenterSettings)
    if cid is not None:
        q = q.filter(CenterSettings.center_id == cid)
    else:
        q = q.filter(CenterSettings.center_id.is_(None))
    row = q.first()
    if row is None:
        row = CenterSettings(center_id=cid)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def get_settings(
    db: Session, tenant: TenantContext | None = None
) -> CenterSettings:
    return _get_or_create(db, tenant=tenant)


def update_settings(
    db: Session,
    data: CenterSettingsUpdate,
    tenant: TenantContext | None = None,
) -> CenterSettings:
    row = _get_or_create(db, tenant=tenant)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return row


# ── Profile self-update ────────────────────────────────────────────────────


def _profile_row(db: Session, user: User) -> Teacher | Student | None:
    if user.teacher is not None:
        return user.teacher
    if user.student is not None:
        return user.student
    return None


def get_profile(db: Session, user: User) -> dict:
    profile = _profile_row(db, user)
    base = {
        "id": user.id,
        "email": user.email,
        "role": user.role.value,
        "name": None,
        "phone": None,
        "avatar": None,
        "teacher_id": None,
        "student_id": None,
    }
    if isinstance(profile, Teacher):
        base.update(
            name=profile.name,
            phone=profile.phone,
            avatar=profile.avatar,
            teacher_id=profile.id,
        )
    elif isinstance(profile, Student):
        base.update(
            name=profile.name,
            phone=profile.phone,
            avatar=profile.avatar,
            student_id=profile.id,
        )
    return base


def update_profile(db: Session, user: User, data: ProfileUpdateRequest) -> dict:
    profile = _profile_row(db, user)
    if profile is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Ushbu foydalanuvchining profil yozuvi mavjud emas",
        )
    payload = data.model_dump(exclude_unset=True)
    for field, value in payload.items():
        if hasattr(profile, field):
            setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return get_profile(db, user)
