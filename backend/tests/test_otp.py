"""Phone+SMS OTP login and password-reset flow tests.

Uses the in-memory OTP backend (default when REDIS_URL is unset) and the
``MockSMSProvider`` (default when SMS_PROVIDER is unset). Captures the
plaintext OTP via ``otp.backend`` introspection so the test client can
verify it without parsing SMS bodies.
"""

from __future__ import annotations

import pytest

from app.core import otp
from app.models.models import User, UserRole


@pytest.fixture(autouse=True)
def _clear_otp():
    otp.backend.clear()
    yield
    otp.backend.clear()


def _grab_last_code(monkeypatch) -> dict[str, str]:
    """Patch ``otp.issue`` to record the plaintext code so tests can verify
    it without actually parsing SMS. Returns a dict that gets populated."""
    captured: dict[str, str] = {}
    real_issue = otp.issue

    def fake_issue(phone, purpose):
        result = real_issue(phone, purpose)
        captured["code"] = result.code
        captured["phone"] = phone
        captured["purpose"] = purpose
        return result

    monkeypatch.setattr(otp, "issue", fake_issue)
    return captured


# ── Phone login ─────────────────────────────────────────────────────────────


def test_phone_login_full_flow(client, db_session, make_center, monkeypatch):
    captured = _grab_last_code(monkeypatch)
    center = make_center()
    # Create a student-shaped User directly. Phone matches what we'll request.
    from app.core.security import hash_password
    user = User(
        email="phone-test@example.com",
        hashed_password=hash_password("Whatever1"),
        role=UserRole.STUDENT,
        is_active=True,
        center_id=center.id,
        phone="+998901234567",
    )
    db_session.add(user)
    db_session.commit()

    # 1) Request the OTP — generic 200, code goes via Mock SMS provider.
    r = client.post("/api/auth/phone/request", json={"phone": "+998 90 123 45 67"})
    assert r.status_code == 200, r.text
    assert captured.get("code"), "OTP code was not issued"
    assert captured["purpose"] == "login"

    # 2) Verify with the captured code → JWT + user payload.
    r = client.post(
        "/api/auth/phone/verify",
        json={"phone": "+998 90 123 45 67", "code": captured["code"]},
    )
    assert r.status_code == 200, r.text
    body = r.json()["data"]
    assert body["user"]["email"] == "phone-test@example.com"
    assert body["access_token"]


def test_phone_login_unknown_number_returns_generic_200_no_code(client, monkeypatch):
    """Endpoint must NOT leak whether a phone is registered."""
    captured = _grab_last_code(monkeypatch)

    r = client.post("/api/auth/phone/request", json={"phone": "+998901111111"})
    assert r.status_code == 200, r.text
    assert "code" not in captured, "OTP must not be issued for unknown phones"


def test_phone_login_rejects_bad_code(client, db_session, make_center, monkeypatch):
    _grab_last_code(monkeypatch)
    center = make_center()
    from app.core.security import hash_password
    user = User(
        email="bad-code@example.com",
        hashed_password=hash_password("Whatever1"),
        role=UserRole.STUDENT,
        is_active=True,
        center_id=center.id,
        phone="+998902222222",
    )
    db_session.add(user)
    db_session.commit()

    client.post("/api/auth/phone/request", json={"phone": "+998902222222"})
    r = client.post(
        "/api/auth/phone/verify",
        json={"phone": "+998902222222", "code": "000000"},
    )
    assert r.status_code == 401


# ── Password reset ──────────────────────────────────────────────────────────


def test_password_reset_full_flow(client, db_session, make_center, login, monkeypatch):
    captured = _grab_last_code(monkeypatch)
    center = make_center()
    from app.core.security import hash_password
    user = User(
        email="reset-test@example.com",
        hashed_password=hash_password("OldPass123"),
        role=UserRole.STUDENT,
        is_active=True,
        center_id=center.id,
        phone="+998903333333",
    )
    db_session.add(user)
    db_session.commit()

    # 1) Sanity-check the OLD password works.
    headers_pre = login("reset-test@example.com", "OldPass123")
    assert "Authorization" in headers_pre

    # 2) Request reset → OTP issued.
    r = client.post("/api/auth/password/reset/request", json={"phone": "+998903333333"})
    assert r.status_code == 200, r.text
    code = captured["code"]
    assert captured["purpose"] == "password_reset"

    # 3) Confirm with new password.
    r = client.post(
        "/api/auth/password/reset/confirm",
        json={
            "phone": "+998903333333",
            "code": code,
            "new_password": "NewStrongPass1",
        },
    )
    assert r.status_code == 200, r.text

    # 4) Old PASSWORD no longer logs in. (Old access tokens issued in the
    # same wall-clock second as the reset will live until expiry — that's a
    # known 1-second race, not worth coupling tests to time.sleep().)
    r = client.post(
        "/api/auth/login",
        data={"username": "reset-test@example.com", "password": "OldPass123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert r.status_code == 401

    # 5) New password works.
    headers_post = login("reset-test@example.com", "NewStrongPass1")
    r = client.get("/api/auth/me", headers=headers_post)
    assert r.status_code == 200


def test_otp_attempt_limit_invalidates_code(client, db_session, make_center, monkeypatch):
    """5 wrong verify attempts must invalidate the code (force a fresh send)."""
    captured = _grab_last_code(monkeypatch)
    center = make_center()
    from app.core.security import hash_password
    user = User(
        email="attempts@example.com",
        hashed_password=hash_password("Whatever1"),
        role=UserRole.STUDENT,
        is_active=True,
        center_id=center.id,
        phone="+998904444444",
    )
    db_session.add(user)
    db_session.commit()

    client.post("/api/auth/phone/request", json={"phone": "+998904444444"})
    real_code = captured["code"]

    # 5 wrong attempts.
    for _ in range(otp.OTP_MAX_VERIFY_ATTEMPTS):
        r = client.post(
            "/api/auth/phone/verify",
            json={"phone": "+998904444444", "code": "000000"},
        )
        assert r.status_code == 401

    # Even the CORRECT code is now rejected — entry was wiped.
    r = client.post(
        "/api/auth/phone/verify",
        json={"phone": "+998904444444", "code": real_code},
    )
    assert r.status_code == 401, r.text
