"""Eduly — FastAPI Application entry point."""

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.middleware.response_envelope import (
    ResponseEnvelopeMiddleware,
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)

from app.config import get_settings
from app.database import engine
from app.models.models import Base

# routers
from app.routers import (
    attendances,
    auth,
    branch_managers,
    branches,
    courses,
    crm,
    daily_quests,
    dashboard,
    finance,
    groups,
    homework,
    kanban,
    kpi,
    materials,
    modules,
    payments,
    polls,
    public_api,
    rewards,
    rooms,
    salaries,
    settings as settings_router,
    sms,
    student_me,
    students,
    super_admin,
    support_bookings,
    teacher_dashboard,
    teachers,
    users,
    website_manager,
)

settings = get_settings()


log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (for dev / SQLite).
    # In production, use Alembic migrations instead.
    Base.metadata.create_all(bind=engine)

    # SMS cron jobs (slice 3): daily absent + monthly debt reminders.
    # Disable with EDULY_DISABLE_SCHEDULER=1 (e.g. for tests, multi-worker uvicorn).
    scheduler = None
    if os.environ.get("EDULY_DISABLE_SCHEDULER") != "1":
        try:
            from apscheduler.schedulers.background import BackgroundScheduler

            from app.services.sms.scheduler import register_jobs

            from app.services.finance_scheduler import register_finance_jobs

            scheduler = BackgroundScheduler(timezone=os.environ.get("EDULY_TZ", "Asia/Tashkent"))
            register_jobs(scheduler)
            register_finance_jobs(scheduler)
            from app.services.quest_generator import register_quest_jobs
            register_quest_jobs(scheduler)
            scheduler.start()
            app.state.scheduler = scheduler
        except Exception:  # noqa: BLE001 — never block app startup on scheduler
            log.exception("Failed to start SMS scheduler; continuing without it")

    try:
        yield
    finally:
        if scheduler is not None:
            try:
                scheduler.shutdown(wait=False)
            except Exception:  # noqa: BLE001
                log.exception("Scheduler shutdown failed")


# Rate-limit storage. In-memory by default (one process only); when REDIS_URL
# is set, slowapi's ``limits`` library uses Redis so workers/instances share
# state. This is a HARD requirement before scaling beyond a single uvicorn
# worker — without it, an attacker just retries until they hit a worker that
# hasn't seen the previous attempts.
import os as _os  # local alias to avoid module-level reshuffle
_RATE_LIMIT_STORAGE = _os.getenv("REDIS_URL", "").strip() or "memory://"
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["120/minute"],
    storage_uri=_RATE_LIMIT_STORAGE,
)

# Disable Swagger /docs and /redoc when DEBUG=false (production).
# Nginx also blocks these on api.* hosts as defense-in-depth.
_DOCS_ENABLED = settings.DEBUG
app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if _DOCS_ENABLED else None,
    redoc_url="/redoc" if _DOCS_ENABLED else None,
    openapi_url="/openapi.json" if _DOCS_ENABLED else None,
)

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(ResponseEnvelopeMiddleware)

app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"success": False, "data": None,
                 "error": {"message": "Too many requests. Please try again later.", "code": "RATE_LIMITED"}},
    )

# ── CORS ─────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        o.strip()
        for o in os.environ.get(
            "CORS_ORIGINS",
            "http://localhost:3000,http://localhost:3001,http://localhost:3003,http://localhost:5173,http://localhost:5174,http://127.0.0.1:3000,http://127.0.0.1:3001,https://localhost,capacitor://localhost,exp://*",
        ).split(",")
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
# /me must be registered before /{student_id} so "me" is not consumed as an int param
app.include_router(student_me.router, prefix="/api/students/me", tags=["Student Self-Service"])
app.include_router(students.router, prefix="/api/students", tags=["Students"])
app.include_router(teachers.router, prefix="/api/teachers", tags=["Teachers"])
app.include_router(courses.router, prefix="/api/courses", tags=["Courses"])
app.include_router(groups.router, prefix="/api/groups", tags=["Groups"])
app.include_router(attendances.router, prefix="/api/attendances", tags=["Attendance"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])
app.include_router(salaries.router, prefix="/api/salaries", tags=["Salaries"])
app.include_router(rooms.router, prefix="/api/rooms", tags=["Rooms"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(teacher_dashboard.router, prefix="/api/teacher", tags=["Teacher Dashboard"])
app.include_router(settings_router.router, prefix="/api/settings", tags=["Settings"])
app.include_router(sms.router, prefix="/api/sms", tags=["SMS"])
app.include_router(support_bookings.router, prefix="/api/support-bookings", tags=["Support Bookings"])
app.include_router(rewards.router, prefix="/api/rewards", tags=["Rewards"])
app.include_router(homework.router, prefix="/api/homework", tags=["Homework"])
app.include_router(kpi.router, prefix="/api/kpi", tags=["Teacher KPI"])
app.include_router(materials.router, prefix="/api/materials", tags=["Library"])
app.include_router(branches.router, prefix="/api/branches", tags=["Branches"])
app.include_router(branch_managers.router, prefix="/api/branch-managers", tags=["Branch Managers"])
app.include_router(finance.router, prefix="/api/finance", tags=["Finance"])
app.include_router(crm.router, prefix="/api/crm", tags=["CRM"])
app.include_router(kanban.router, prefix="/api/kanban", tags=["Kanban"])
app.include_router(super_admin.router, prefix="/api/super-admin", tags=["Super Admin"])
app.include_router(modules.router, prefix="/api/modules", tags=["Course Modules"])
app.include_router(daily_quests.router, prefix="/api/daily-quests", tags=["Daily Quests"])
app.include_router(polls.router, prefix="/api/polls", tags=["Polls"])
app.include_router(public_api.router, prefix="/api/public", tags=["Public"])
app.include_router(website_manager.router, prefix="/api/website", tags=["Website Manager"])

# Serve uploaded files at /media — must be mounted AFTER all API routes
_uploads_dir = Path(__file__).parent.parent / "uploads"
_uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(_uploads_dir)), name="media")


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
