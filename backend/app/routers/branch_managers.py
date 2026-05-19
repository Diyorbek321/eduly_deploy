"""Branch Managers router — create/manage ADMIN accounts for branch managers."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.permissions import require_admin
from app.core.security import hash_password
from app.core.tenant import TenantContext, get_tenant
from app.dependencies import get_db
from app.models.models import BranchRole, EducationCenter, User, UserCenterAccess, UserRole

router = APIRouter(dependencies=[Depends(require_admin)])


class BranchManagerCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    center_id: int  # which branch they manage


class BranchManagerOut(BaseModel):
    id: int
    full_name: str | None
    email: str
    center_id: int | None
    center_name: str | None
    is_active: bool

    model_config = {"from_attributes": True}


class PasswordResetRequest(BaseModel):
    new_password: str


def _validate_password(pw: str) -> None:
    import re
    if len(pw) < 8:
        raise HTTPException(400, "Parol kamida 8 ta belgidan iborat bo'lishi kerak")
    if not re.search(r"[a-z]", pw):
        raise HTTPException(400, "Parolda kichik harf bo'lishi kerak")
    if not re.search(r"[A-Z]", pw):
        raise HTTPException(400, "Parolda katta harf bo'lishi kerak")
    if not re.search(r"\d", pw):
        raise HTTPException(400, "Parolda raqam bo'lishi kerak")


def _manager_out(user: User, db: Session) -> BranchManagerOut:
    center_name = None
    if user.center_id:
        c = db.query(EducationCenter).filter(EducationCenter.id == user.center_id).first()
        center_name = c.name if c else None
    return BranchManagerOut(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        center_id=user.center_id,
        center_name=center_name,
        is_active=user.is_active,
    )


@router.get("/", response_model=list[BranchManagerOut])
def list_managers(
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    """List all branch managers belonging to centers the current admin owns."""
    # Find all centers this admin controls
    if tenant.is_super_admin:
        center_ids = [r[0] for r in db.query(EducationCenter.id).all()]
    else:
        own_id = tenant.user.center_id
        extra_ids = [
            r[0] for r in
            db.query(UserCenterAccess.center_id)
            .filter(UserCenterAccess.user_id == tenant.user.id)
            .all()
        ]
        center_ids = list({own_id, *extra_ids} - {None})

    # Find users with BRANCH_ADMIN access records in any of those centers
    manager_user_ids = [
        r[0] for r in
        db.query(UserCenterAccess.user_id)
        .filter(
            UserCenterAccess.center_id.in_(center_ids),
            UserCenterAccess.role == BranchRole.BRANCH_ADMIN,
        )
        .all()
    ]

    managers = (
        db.query(User)
        .filter(User.id.in_(manager_user_ids), User.role == UserRole.ADMIN)
        .all()
    )
    return [_manager_out(m, db) for m in managers]


@router.post("/", response_model=BranchManagerOut, status_code=status.HTTP_201_CREATED)
def create_manager(
    body: BranchManagerCreate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    """Create a new ADMIN user scoped to a specific branch, marked as BRANCH_ADMIN."""
    # Verify the target center belongs to this admin
    center = db.query(EducationCenter).filter(EducationCenter.id == body.center_id).first()
    if not center:
        raise HTTPException(404, "Filial topilmadi")
    if not tenant.is_super_admin and center.id != tenant.user.center_id:
        # Also allow if admin has UserCenterAccess to it
        access = db.query(UserCenterAccess).filter(
            UserCenterAccess.user_id == tenant.user.id,
            UserCenterAccess.center_id == center.id,
        ).first()
        if not access:
            raise HTTPException(403, "Bu filialga ruxsat yo'q")

    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(409, "Bu email allaqachon ro'yxatdan o'tgan")

    _validate_password(body.password)

    user = User(
        email=body.email,
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
        role=UserRole.ADMIN,
        center_id=body.center_id,
        is_active=True,
    )
    db.add(user)
    db.flush()

    # Mark as BRANCH_ADMIN via UserCenterAccess
    access = UserCenterAccess(
        user_id=user.id,
        center_id=body.center_id,
        role=BranchRole.BRANCH_ADMIN,
    )
    db.add(access)
    db.commit()
    db.refresh(user)
    return _manager_out(user, db)


@router.patch("/{manager_id}/password", status_code=status.HTTP_200_OK)
def reset_password(
    manager_id: int,
    body: PasswordResetRequest,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),  # noqa: ARG001
):
    """Admin resets a branch manager's password."""
    user = db.query(User).filter(User.id == manager_id, User.role == UserRole.ADMIN).first()
    if not user:
        raise HTTPException(404, "Manager topilmadi")
    _validate_password(body.new_password)
    user.hashed_password = hash_password(body.new_password)
    # Invalidate all existing tokens
    from datetime import datetime
    user.tokens_invalidated_at = datetime.utcnow()
    db.commit()
    return {"success": True, "message": "Parol yangilandi"}


@router.patch("/{manager_id}/toggle-active", status_code=status.HTTP_200_OK)
def toggle_active(
    manager_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),  # noqa: ARG001
):
    """Enable or disable a branch manager account."""
    user = db.query(User).filter(User.id == manager_id, User.role == UserRole.ADMIN).first()
    if not user:
        raise HTTPException(404, "Manager topilmadi")
    user.is_active = not user.is_active
    db.commit()
    return {"success": True, "is_active": user.is_active}


@router.delete("/{manager_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_manager(
    manager_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),  # noqa: ARG001
):
    """Permanently delete a branch manager account."""
    user = db.query(User).filter(User.id == manager_id, User.role == UserRole.ADMIN).first()
    if not user:
        raise HTTPException(404, "Manager topilmadi")
    db.delete(user)
    db.commit()
