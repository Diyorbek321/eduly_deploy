"""Shared pytest fixtures.

We swap the real Postgres engine for an in-process SQLite database so the
RBAC regression suite can run without external services. Each test gets a
fresh schema.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Make ``app`` importable when pytest is invoked from the backend directory.
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Required env before app imports.
os.environ.setdefault("SECRET_KEY", "test-secret-only-for-pytest")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("EDULY_DISABLE_SCHEDULER", "1")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import database as app_database  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.dependencies import get_db  # noqa: E402
from app.models.models import (  # noqa: E402
    Base,
    Course,
    EducationCenter,
    Group,
    Student,
    StudentStatus,
    Teacher,
    User,
    UserRole,
)


@pytest.fixture(autouse=True)
def _reset_module_state():
    """Clear cross-test module-level state that would leak between tests:
    in-memory login lockout counters and any cached settings."""
    from app.services import auth as auth_service

    auth_service._login_state.clear()
    yield
    auth_service._login_state.clear()


@pytest.fixture(scope="function")
def test_engine():
    """A fresh in-memory SQLite engine per test, with the full schema created."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    engine.dispose()


@pytest.fixture(scope="function")
def db_session(test_engine):
    Session = sessionmaker(bind=test_engine, autocommit=False, autoflush=False)
    session = Session()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="function")
def client(test_engine, monkeypatch):
    """A FastAPI TestClient wired to the in-memory engine."""
    Session = sessionmaker(bind=test_engine, autocommit=False, autoflush=False)

    # Make sure modules that import SessionLocal directly use our engine too
    # (e.g. the SMS scheduler and refresh-token helper). The scheduler is
    # disabled via EDULY_DISABLE_SCHEDULER but core/security uses SessionLocal
    # transitively only when called with an explicit Session, so this monkey-
    # patch is precautionary.
    monkeypatch.setattr(app_database, "engine", test_engine, raising=True)
    monkeypatch.setattr(app_database, "SessionLocal", Session, raising=True)

    from app.main import app

    def _override_get_db():
        s = Session()
        try:
            yield s
        finally:
            s.close()

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ── Domain fixtures ────────────────────────────────────────────────────────


@pytest.fixture
def make_center(db_session):
    counter = {"i": 0}

    def _make(name: str | None = None) -> EducationCenter:
        counter["i"] += 1
        c = EducationCenter(
            name=name or f"Center {counter['i']}",
            slug=f"center-{counter['i']}",
        )
        db_session.add(c)
        db_session.commit()
        db_session.refresh(c)
        return c

    return _make


@pytest.fixture
def make_user(db_session):
    counter = {"i": 0}

    def _make(
        *,
        role: UserRole,
        center_id: int | None,
        password: str = "Password123",
        email: str | None = None,
        is_active: bool = True,
    ) -> User:
        counter["i"] += 1
        u = User(
            email=email or f"user{counter['i']}@example.com",
            hashed_password=hash_password(password),
            role=role,
            is_active=is_active,
            center_id=center_id,
            full_name=f"User {counter['i']}",
        )
        db_session.add(u)
        db_session.commit()
        db_session.refresh(u)
        return u

    return _make


@pytest.fixture
def make_teacher(db_session, make_user):
    counter = {"i": 0}

    def _make(*, center_id: int) -> tuple[User, Teacher]:
        counter["i"] += 1
        user = make_user(role=UserRole.TEACHER, center_id=center_id)
        t = Teacher(
            user_id=user.id,
            center_id=center_id,
            name=user.full_name or f"Teacher {counter['i']}",
            phone=f"+9989000000{counter['i']:02d}",
        )
        db_session.add(t)
        db_session.commit()
        db_session.refresh(t)
        return user, t

    return _make


@pytest.fixture
def make_student(db_session):
    counter = {"i": 0}

    def _make(*, center_id: int) -> Student:
        counter["i"] += 1
        s = Student(
            center_id=center_id,
            name=f"Student {counter['i']}",
            phone=f"+9989111111{counter['i']:02d}",
            status=StudentStatus.FAOL,
        )
        db_session.add(s)
        db_session.commit()
        db_session.refresh(s)
        return s

    return _make


@pytest.fixture
def make_group(db_session):
    counter = {"i": 0}

    def _make(*, center_id: int, teacher_id: int | None = None) -> Group:
        counter["i"] += 1
        # Group needs a course; create one inline.
        course = Course(
            center_id=center_id,
            name=f"Course {counter['i']}",
            duration="12 weeks",
            price=1000.0,
        )
        db_session.add(course)
        db_session.commit()
        db_session.refresh(course)
        g = Group(
            center_id=center_id,
            name=f"Group {counter['i']}",
            course_id=course.id,
            teacher_id=teacher_id,
        )
        db_session.add(g)
        db_session.commit()
        db_session.refresh(g)
        return g

    return _make


# ── HTTP helper ────────────────────────────────────────────────────────────


@pytest.fixture
def login(client):
    """Return (auth_header_dict) for a given user's email/password."""

    def _login(email: str, password: str = "Password123") -> dict[str, str]:
        r = client.post(
            "/api/auth/login",
            data={"username": email, "password": password},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        # Response envelope: {"success": true, "data": {...}}
        data = body.get("data", body)
        token = data["access_token"]
        return {"Authorization": f"Bearer {token}"}

    return _login
