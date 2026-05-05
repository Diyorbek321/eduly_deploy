"""RBAC + multi-tenant isolation regression suite.

Covers slice 8:
- A teacher cannot reach admin-only endpoints.
- A student cannot reach admin or teacher endpoints.
- Tenant X cannot see / mutate tenant Y's rows.
- Unauthenticated requests are rejected on protected endpoints.
- Role-escalation attempts via /auth/register are rejected.
"""

from __future__ import annotations

import pytest

from app.models.models import StudentStatus, UserRole


# ── Unauthenticated access ─────────────────────────────────────────────────


@pytest.mark.parametrize(
    "method,path",
    [
        ("get", "/api/students/"),
        ("get", "/api/teachers/"),
        ("get", "/api/groups/"),
        ("get", "/api/dashboard/stats"),
        ("get", "/api/sms/history"),
        ("get", "/api/auth/me"),
    ],
)
def test_unauthenticated_requests_are_rejected(client, method, path):
    r = getattr(client, method)(path)
    assert r.status_code == 401, f"{method.upper()} {path} returned {r.status_code}"


# ── Role gating ────────────────────────────────────────────────────────────


def test_teacher_cannot_hit_admin_only_endpoint(
    client, login, make_center, make_teacher, make_student
):
    center = make_center()
    teacher_user, _ = make_teacher(center_id=center.id)
    student = make_student(center_id=center.id)
    headers = login(teacher_user.email)

    # /api/students/{id}/payments is admin-only (slice 2 already enforces this).
    r = client.get(f"/api/students/{student.id}/payments", headers=headers)
    assert r.status_code == 403


def test_student_cannot_list_students(
    client, login, make_center, make_user
):
    center = make_center()
    student_user = make_user(role=UserRole.STUDENT, center_id=center.id)
    headers = login(student_user.email)

    r = client.get("/api/students/", headers=headers)
    assert r.status_code == 403


def test_student_cannot_hit_dashboard(client, login, make_center, make_user):
    center = make_center()
    student_user = make_user(role=UserRole.STUDENT, center_id=center.id)
    headers = login(student_user.email)

    r = client.get("/api/dashboard/stats", headers=headers)
    assert r.status_code == 403


# ── Cross-tenant isolation ─────────────────────────────────────────────────


def test_admin_only_sees_own_tenant_students(
    client, login, make_center, make_user, make_student
):
    center_x = make_center("Center X")
    center_y = make_center("Center Y")
    admin_x = make_user(role=UserRole.ADMIN, center_id=center_x.id)

    # 5 in X, 3 in Y
    for _ in range(5):
        make_student(center_id=center_x.id)
    for _ in range(3):
        make_student(center_id=center_y.id)

    headers = login(admin_x.email)
    r = client.get("/api/students/?limit=100", headers=headers)
    assert r.status_code == 200
    body = r.json()
    data = body.get("data", body)
    items = data["items"] if isinstance(data, dict) else data
    assert len(items) == 5, f"admin from Center X saw {len(items)} students; expected only own 5"


def test_admin_cannot_read_other_tenant_student_by_id(
    client, login, make_center, make_user, make_student
):
    center_x = make_center("Center X")
    center_y = make_center("Center Y")
    admin_x = make_user(role=UserRole.ADMIN, center_id=center_x.id)
    foreign_student = make_student(center_id=center_y.id)

    headers = login(admin_x.email)
    r = client.get(f"/api/students/{foreign_student.id}", headers=headers)
    # 404 (not 403) by design — never leak existence of other tenants.
    assert r.status_code == 404


def test_admin_cannot_update_other_tenant_student(
    client, login, make_center, make_user, make_student
):
    center_x = make_center("Center X")
    center_y = make_center("Center Y")
    admin_x = make_user(role=UserRole.ADMIN, center_id=center_x.id)
    foreign_student = make_student(center_id=center_y.id)

    headers = login(admin_x.email)
    r = client.put(
        f"/api/students/{foreign_student.id}",
        json={"status": StudentStatus.MUZLATILGAN.value},
        headers=headers,
    )
    assert r.status_code == 404


def test_admin_cannot_delete_other_tenant_student(
    client, login, make_center, make_user, make_student
):
    center_x = make_center("Center X")
    center_y = make_center("Center Y")
    admin_x = make_user(role=UserRole.ADMIN, center_id=center_x.id)
    foreign_student = make_student(center_id=center_y.id)

    headers = login(admin_x.email)
    r = client.delete(f"/api/students/{foreign_student.id}", headers=headers)
    assert r.status_code == 404


def test_teacher_a_cannot_reach_teacher_b_payments(
    client, login, make_center, make_teacher, make_student
):
    """Teacher A's account must not be able to read another teacher's student
    payment history (admin-only endpoint), and especially not across tenants."""
    center_x = make_center("X")
    center_y = make_center("Y")
    teacher_a_user, _ = make_teacher(center_id=center_x.id)
    student_in_y = make_student(center_id=center_y.id)

    headers = login(teacher_a_user.email)
    r = client.get(f"/api/students/{student_in_y.id}/payments", headers=headers)
    # 403 (admin-only) wins over 404 because the role check runs before scoping.
    assert r.status_code == 403


# ── Privilege escalation via /auth/register ────────────────────────────────


def test_admin_cannot_create_super_admin(
    client, login, make_center, make_user
):
    center = make_center()
    admin = make_user(role=UserRole.ADMIN, center_id=center.id)
    headers = login(admin.email)

    r = client.post(
        "/api/auth/register",
        json={
            "email": "evil@example.com",
            "password": "Password123",
            "role": UserRole.SUPER_ADMIN.value,
        },
        headers=headers,
    )
    assert r.status_code in (400, 403)


def test_register_rejects_weak_password(
    client, login, make_center, make_user
):
    center = make_center()
    admin = make_user(role=UserRole.ADMIN, center_id=center.id)
    headers = login(admin.email)

    r = client.post(
        "/api/auth/register",
        json={"email": "weak@example.com", "password": "abc", "role": "STUDENT"},
        headers=headers,
    )
    assert r.status_code == 422


# ── Token revocation regression ────────────────────────────────────────────


def test_logout_revokes_access_token(client, login, make_center, make_user):
    """After logout, the same access token must not authenticate /auth/me."""
    center = make_center()
    admin = make_user(role=UserRole.ADMIN, center_id=center.id)
    headers = login(admin.email)

    # Pre-logout: works.
    r = client.get("/api/auth/me", headers=headers)
    assert r.status_code == 200

    # Logout. Refresh token isn't strictly needed here because we revoke jti
    # from the access token itself.
    r = client.post("/api/auth/logout", json={"refresh_token": "ignored"}, headers=headers)
    assert r.status_code == 200

    # Post-logout: same token must be rejected.
    r = client.get("/api/auth/me", headers=headers)
    assert r.status_code == 401


def test_password_change_invalidates_old_tokens(
    client, login, make_center, make_user
):
    center = make_center()
    admin = make_user(role=UserRole.ADMIN, center_id=center.id, password="Password123")
    old_headers = login(admin.email, "Password123")

    r = client.put(
        "/api/auth/change-password",
        json={"old_password": "Password123", "new_password": "NewPassword1"},
        headers=old_headers,
    )
    assert r.status_code == 200, f"change-password failed: {r.status_code} {r.text} headers={old_headers}"

    # Old access token must now be rejected — bulk revocation via
    # tokens_invalidated_at.
    r = client.get("/api/auth/me", headers=old_headers)
    assert r.status_code == 401

    # New password works.
    new_headers = login(admin.email, "NewPassword1")
    r = client.get("/api/auth/me", headers=new_headers)
    assert r.status_code == 200
