"""Multi-tenant isolation tests for resources NOT covered in test_rbac.py.

Existing test_rbac.py already covers students cross-tenant. This file pins
the same invariant for rewards, groups, payments, and the new
admin-creates-student-with-login flow we added.

Invariant: every list endpoint scopes by center_id, and every per-id
endpoint returns 404 (NOT 403) when the row belongs to a different center —
404 prevents tenant existence leaks.
"""

from __future__ import annotations

from app.models.models import (
    Payment,
    PaymentMethod,
    PaymentStatus,
    Reward,
    User,
    UserRole,
)


# ── Rewards ────────────────────────────────────────────────────────────────


def _make_reward(db_session, *, center_id: int, name: str = "Pen") -> Reward:
    r = Reward(center_id=center_id, name=name, cost=10, stock=5, is_active=True)
    db_session.add(r)
    db_session.commit()
    db_session.refresh(r)
    return r


def test_admin_only_sees_own_tenant_rewards(
    client, login, db_session, make_center, make_user
):
    center_x = make_center("X")
    center_y = make_center("Y")
    admin_x = make_user(role=UserRole.ADMIN, center_id=center_x.id)
    _make_reward(db_session, center_id=center_x.id, name="X Reward")
    _make_reward(db_session, center_id=center_y.id, name="Y Reward")

    headers = login(admin_x.email)
    r = client.get("/api/rewards/", headers=headers)
    assert r.status_code == 200, r.text
    items = r.json()["data"]
    names = {row["name"] for row in items}
    assert names == {"X Reward"}, f"admin in X must not see Y rewards: {names}"


def test_admin_cannot_update_other_tenant_reward(
    client, login, db_session, make_center, make_user
):
    center_x = make_center("X")
    center_y = make_center("Y")
    admin_x = make_user(role=UserRole.ADMIN, center_id=center_x.id)
    foreign_reward = _make_reward(db_session, center_id=center_y.id, name="Theirs")

    headers = login(admin_x.email)
    r = client.put(
        f"/api/rewards/{foreign_reward.id}",
        json={"name": "Hacked"},
        headers=headers,
    )
    # 404, not 403, so we never leak the existence of another tenant's row.
    assert r.status_code == 404, r.text


def test_student_only_sees_own_tenant_rewards_in_shop(
    client, login, db_session, make_center, make_user
):
    center_x = make_center("X")
    center_y = make_center("Y")
    student_in_x = make_user(role=UserRole.STUDENT, center_id=center_x.id)
    _make_reward(db_session, center_id=center_x.id, name="Pencil")
    _make_reward(db_session, center_id=center_y.id, name="Notebook")

    headers = login(student_in_x.email)
    r = client.get("/api/rewards/?active_only=true", headers=headers)
    assert r.status_code == 200, r.text
    names = {row["name"] for row in r.json()["data"]}
    assert names == {"Pencil"}


# ── Groups ─────────────────────────────────────────────────────────────────


def test_admin_only_sees_own_tenant_groups(
    client, login, make_center, make_user, make_group
):
    center_x = make_center("X")
    center_y = make_center("Y")
    admin_x = make_user(role=UserRole.ADMIN, center_id=center_x.id)
    make_group(center_id=center_x.id)
    make_group(center_id=center_y.id)
    make_group(center_id=center_y.id)

    headers = login(admin_x.email)
    r = client.get("/api/groups/", headers=headers)
    assert r.status_code == 200, r.text
    body = r.json()["data"]
    items = body["items"] if isinstance(body, dict) and "items" in body else body
    # Admin in X must see exactly 1 group (the one in center X).
    assert len(items) == 1, f"expected 1, got {len(items)}: {items}"


def test_admin_cannot_read_other_tenant_group_by_id(
    client, login, make_center, make_user, make_group
):
    center_x = make_center("X")
    center_y = make_center("Y")
    admin_x = make_user(role=UserRole.ADMIN, center_id=center_x.id)
    foreign_group = make_group(center_id=center_y.id)

    headers = login(admin_x.email)
    r = client.get(f"/api/groups/{foreign_group.id}", headers=headers)
    assert r.status_code == 404, r.text


# ── Payments ───────────────────────────────────────────────────────────────


def test_admin_cannot_view_other_tenant_student_payments(
    client, login, db_session, make_center, make_user, make_student
):
    """Slice 8 already covers teacher→teacher; pin the admin variant too."""
    center_x = make_center("X")
    center_y = make_center("Y")
    admin_x = make_user(role=UserRole.ADMIN, center_id=center_x.id)
    foreign_student = make_student(center_id=center_y.id)
    p = Payment(
        center_id=center_y.id,
        student_id=foreign_student.id,
        amount=100.0,
        method=PaymentMethod.CASH,
        status=PaymentStatus.MUVAFFAQIYATLI,
    )
    db_session.add(p)
    db_session.commit()

    headers = login(admin_x.email)
    r = client.get(f"/api/students/{foreign_student.id}/payments", headers=headers)
    # Tenant scoping should hide the foreign student entirely → 404.
    assert r.status_code == 404, r.text


# ── New flow: admin creates student WITH login — center inheritance ────────


def test_admin_create_student_with_login_inherits_center_id(
    client, login, db_session, make_center, make_user
):
    """Regression for the StudentCreate.email/password feature: the linked
    User row must inherit the *creating admin's* center_id, never null and
    never the wrong center.
    """
    center_x = make_center("X")
    make_center("Y")  # noise
    admin_x = make_user(role=UserRole.ADMIN, center_id=center_x.id)

    headers = login(admin_x.email)
    r = client.post(
        "/api/students/",
        json={
            "name": "Iso Test",
            "phone": "+998900000999",
            "gender": "Erkak",
            "email": "iso-test@example.com",
            "password": "Password123",
        },
        headers=headers,
    )
    assert r.status_code == 201, r.text

    new_user = (
        db_session.query(User).filter(User.email == "iso-test@example.com").first()
    )
    assert new_user is not None, "linked User was not created"
    assert new_user.role == UserRole.STUDENT
    assert new_user.center_id == center_x.id, (
        f"linked User must inherit admin's center, got center_id={new_user.center_id}"
    )
