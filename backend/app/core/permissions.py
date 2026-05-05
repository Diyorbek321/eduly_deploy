"""Role-based permission dependency factories."""

from fastapi import Depends, HTTPException, status

from app.dependencies import get_current_user
from app.models.models import User, UserRole


class RoleChecker:
    """Dependency that checks the current user has one of the allowed roles.

    Usage in a router:
        @router.get("/", dependencies=[Depends(RoleChecker([UserRole.ADMIN]))])
    """

    def __init__(self, allowed_roles: list[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_user)) -> User:
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sizda ushbu amalni bajarish uchun ruxsat yo'q",
            )
        return user


# Convenience instances
require_super_admin = RoleChecker([UserRole.SUPER_ADMIN])
require_admin = RoleChecker([UserRole.SUPER_ADMIN, UserRole.ADMIN])
require_teacher = RoleChecker([UserRole.TEACHER])
require_admin_or_teacher = RoleChecker(
    [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER]
)
require_any = RoleChecker(
    [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT]
)
