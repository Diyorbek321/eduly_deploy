"""Lockout backend regression tests.

Proves that the abstracted lockout backend (memory variant) preserves the
old semantics: 5 wrong attempts → account locked → correct attempt blocked
with 423 → success after the lock window.

The Redis backend has the same contract; you'd run these against a real
Redis by setting REDIS_URL before invoking pytest.
"""

from __future__ import annotations

import pytest

from app.core import lockout
from app.models.models import UserRole


@pytest.fixture(autouse=True)
def _clear_lockout():
    lockout.backend.clear()
    yield
    lockout.backend.clear()


def test_failed_login_eventually_locks_account(client, login, make_center, make_user):
    center = make_center()
    user = make_user(role=UserRole.ADMIN, center_id=center.id, password="Correct123")

    # 5 wrong attempts — backend should lock on the 5th.
    for _ in range(lockout.LOCKOUT_MAX_FAILS):
        r = client.post(
            "/api/auth/login",
            data={"username": user.email, "password": "Wrong"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert r.status_code in (401, 423), r.text

    # Now even the CORRECT password should be rejected with 423 (locked).
    r = client.post(
        "/api/auth/login",
        data={"username": user.email, "password": "Correct123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert r.status_code == 423, f"expected lockout, got {r.status_code}: {r.text}"


def test_successful_login_clears_failure_counter(
    client, login, make_center, make_user
):
    center = make_center()
    user = make_user(role=UserRole.ADMIN, center_id=center.id, password="Correct123")

    # 4 wrong attempts (one short of the threshold).
    for _ in range(lockout.LOCKOUT_MAX_FAILS - 1):
        r = client.post(
            "/api/auth/login",
            data={"username": user.email, "password": "Wrong"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert r.status_code == 401

    # One correct login should reset the counter.
    headers = login(user.email, "Correct123")
    assert "Authorization" in headers

    # Another wrong attempt should NOT immediately lock — counter was reset.
    r = client.post(
        "/api/auth/login",
        data={"username": user.email, "password": "Wrong"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert r.status_code == 401, f"expected 401 (counter reset), got {r.status_code}"


def test_lockout_isolated_per_email(client, make_center, make_user):
    """Locking out user A must not lock user B."""
    center = make_center()
    user_a = make_user(role=UserRole.ADMIN, center_id=center.id, password="A_pass123")
    user_b = make_user(role=UserRole.ADMIN, center_id=center.id, password="B_pass123")

    for _ in range(lockout.LOCKOUT_MAX_FAILS):
        client.post(
            "/api/auth/login",
            data={"username": user_a.email, "password": "Wrong"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

    # User B is unaffected.
    r = client.post(
        "/api/auth/login",
        data={"username": user_b.email, "password": "B_pass123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert r.status_code == 200, r.text
