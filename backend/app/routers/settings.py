"""Per-center settings + authenticated user profile endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.permissions import require_admin, require_any
from app.core.tenant import TenantContext, get_tenant
from app.dependencies import get_current_user, get_db
from app.models.models import User
from app.schemas.settings import (
    CenterSettingsOut,
    CenterSettingsUpdate,
    ProfileOut,
    ProfileUpdateRequest,
)
from app.services import settings as settings_service

router = APIRouter()


@router.get("/", response_model=CenterSettingsOut)
def get_center_settings(
    db: Session = Depends(get_db),
    _: User = Depends(require_any),
    tenant: TenantContext = Depends(get_tenant),
):
    return settings_service.get_settings(db, tenant=tenant)


@router.put("/", response_model=CenterSettingsOut)
def update_center_settings(
    data: CenterSettingsUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    return settings_service.update_settings(db, data, tenant=tenant)


@router.get("/profile", response_model=ProfileOut)
def get_profile(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return settings_service.get_profile(db, user)


@router.put("/profile", response_model=ProfileOut)
def update_profile(
    data: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return settings_service.update_profile(db, user, data)
