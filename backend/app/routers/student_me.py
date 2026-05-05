"""Student self-service router — /api/students/me.

All endpoints require a valid Bearer token whose role is STUDENT.
The authenticated user's linked Student record is resolved automatically;
no student_id is ever exposed in the URL.
"""

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.permissions import RoleChecker
from app.dependencies import get_current_user, get_db
from app.models.models import User, UserRole
from app.schemas.student_me import (
    MyAttendanceOut,
    MyPaymentsOut,
    MyProfileOut,
    MyScheduleOut,
)
from app.services import student_me as svc

router = APIRouter()

require_student = RoleChecker([UserRole.STUDENT])


@router.get(
    "/",
    response_model=MyProfileOut,
    summary="Get my profile",
    description=(
        "Returns the full profile of the currently authenticated student, "
        "including personal details, enrolled group names, total paid amount, "
        "and current debt balance."
    ),
)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
) -> MyProfileOut:
    return svc.get_profile(db, current_user)


@router.get(
    "/schedule",
    response_model=MyScheduleOut,
    summary="Get my class schedule",
    description=(
        "Returns the student's enrolled groups with their recurring schedule "
        "(days of the week, time slot, room). Supports pagination and optional "
        "date range filtering on enrollment date."
    ),
)
def get_my_schedule(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    from_date: date | None = Query(None, description="Filter enrollments from this date (YYYY-MM-DD)"),
    to_date: date | None = Query(None, description="Filter enrollments up to this date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
) -> MyScheduleOut:
    return svc.get_schedule(db, current_user, page, limit, from_date, to_date)


@router.get(
    "/attendance",
    response_model=MyAttendanceOut,
    summary="Get my attendance records",
    description=(
        "Returns paginated attendance records for the authenticated student. "
        "Each record includes the class date, group, and status "
        "(present / absent / late / excused). The response also includes "
        "aggregate counts across the filtered result set."
    ),
)
def get_my_attendance(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    from_date: date | None = Query(None, description="Start of date range (YYYY-MM-DD)"),
    to_date: date | None = Query(None, description="End of date range (YYYY-MM-DD)"),
    group_id: int | None = Query(None, description="Filter by a specific group"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
) -> MyAttendanceOut:
    return svc.get_attendance(db, current_user, page, limit, from_date, to_date, group_id)


@router.get(
    "/payments",
    response_model=MyPaymentsOut,
    summary="Get my payment history",
    description=(
        "Returns the student's paginated payment history in reverse-chronological order. "
        "The response includes per-item details (amount, method, status) and "
        "a summary of total amount paid and current outstanding debt."
    ),
)
def get_my_payments(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
) -> MyPaymentsOut:
    return svc.get_payments(db, current_user, page, limit)
