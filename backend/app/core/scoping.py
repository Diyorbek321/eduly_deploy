"""Helpers for filtering list queries by the current user's role.

Admins see everything; teachers see only data tied to their own groups.
"""

from sqlalchemy.orm import Session

from app.models.models import Group, Teacher, User, UserRole


def teacher_group_ids(db: Session, user: User) -> list[int] | None:
    """Return the group IDs owned by the current teacher.

    - For ADMIN: returns ``None`` meaning "no scoping — return everything".
    - For TEACHER: returns a list (possibly empty) of group ids owned by them.
    - Other roles: returns an empty list (effectively "see nothing").
    """
    if user.role in (UserRole.SUPER_ADMIN, UserRole.ADMIN):
        return None
    if user.role == UserRole.TEACHER:
        teacher = db.query(Teacher).filter(Teacher.user_id == user.id).first()
        if not teacher:
            return []
        return [g.id for g in db.query(Group).filter(Group.teacher_id == teacher.id).all()]
    return []
