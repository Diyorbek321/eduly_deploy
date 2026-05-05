"""User service."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.models import User
from app.schemas.user import UserUpdate


def get_all(db: Session) -> list[User]:
    return db.query(User).order_by(User.id).all()


def get_by_id(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Foydalanuvchi topilmadi")
    return user


def update(db: Session, user_id: int, data: UserUpdate) -> User:
    user = get_by_id(db, user_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


def delete(db: Session, user_id: int) -> None:
    user = get_by_id(db, user_id)
    db.delete(user)
    db.commit()
