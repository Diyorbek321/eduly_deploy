"""Users router — CRUD (ADMIN only)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.permissions import require_admin
from app.dependencies import get_db
from app.models.models import User
from app.schemas.auth import MessageResponse
from app.schemas.user import UserOut, UserUpdate
from app.services import user as user_service

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("/", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db)):
    return user_service.get_all(db)


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    return user_service.get_by_id(db, user_id)


@router.put("/{user_id}", response_model=UserOut)
def update_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db)):
    return user_service.update(db, user_id, data)


@router.delete("/{user_id}", response_model=MessageResponse)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user_service.delete(db, user_id)
    return {"message": "Foydalanuvchi o'chirildi"}
