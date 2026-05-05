"""Slice 7 — purchase concurrency + server-side validation."""

from __future__ import annotations

import threading

from app.models.models import (
    PurchaseStatus,
    Reward,
    RewardPurchase,
    Student,
    StudentWallet,
    UserRole,
)
from app.services import reward as reward_service


def _seed_purchase_setup(db_session, *, stock: int, coins_each: int, students: int = 2):
    """Create a center, a single reward with the given stock, and N students
    each with a wallet seeded with coins_each. Returns (reward_id, [student_ids])."""
    from app.models.models import EducationCenter

    center = EducationCenter(name="C", slug="c")
    db_session.add(center)
    db_session.commit()
    db_session.refresh(center)

    reward = Reward(
        center_id=center.id, name="Limited", cost=10, stock=stock, is_active=True
    )
    db_session.add(reward)

    student_ids: list[int] = []
    for i in range(students):
        s = Student(
            center_id=center.id,
            name=f"S{i}",
            phone=f"+99890{i:07d}",
        )
        db_session.add(s)
        db_session.flush()
        db_session.add(
            StudentWallet(student_id=s.id, coins=coins_each, center_id=center.id)
        )
        student_ids.append(s.id)

    db_session.commit()
    db_session.refresh(reward)
    return reward.id, student_ids


def test_two_concurrent_buys_for_last_item_only_one_succeeds(tmp_path):
    """Two threads race to buy the last copy. Exactly one wins; the loser
    sees 'Mukofot qolmagan' and the wallet/stock invariants hold.

    Uses file-backed SQLite (one connection per thread) so the atomic
    UPDATE actually contends at the SQL layer — the in-memory StaticPool
    used elsewhere in this suite shares a single connection across threads
    and would mask the race.
    """
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    from app.models.models import Base, EducationCenter

    db_path = tmp_path / "concurrent.sqlite"
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False, "timeout": 5.0},
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)

    # Seed data.
    s = Session()
    center = EducationCenter(name="C", slug="race")
    s.add(center); s.commit(); s.refresh(center)
    reward = Reward(center_id=center.id, name="Last", cost=10, stock=1, is_active=True)
    s.add(reward)
    students = []
    for i in range(2):
        st = Student(center_id=center.id, name=f"S{i}", phone=f"+998900000{i:03d}")
        s.add(st); s.flush()
        s.add(StudentWallet(student_id=st.id, coins=100, center_id=center.id))
        students.append(st)
    s.commit()
    reward_id = reward.id
    student_ids = [st.id for st in students]
    s.close()

    results: list[str] = []
    barrier = threading.Barrier(2)
    lock = threading.Lock()

    def buy(student_id: int) -> None:
        sess = Session()
        try:
            barrier.wait()
            try:
                reward_service.create_purchase(sess, student_id, reward_id)
                with lock:
                    results.append("ok")
            except Exception as exc:  # noqa: BLE001
                with lock:
                    results.append(f"err:{type(exc).__name__}:{exc}")
        finally:
            sess.close()

    threads = [threading.Thread(target=buy, args=(sid,)) for sid in student_ids]
    for t in threads: t.start()
    for t in threads: t.join()

    successes = [r for r in results if r == "ok"]
    assert len(successes) == 1, f"expected exactly one success, got {results}"

    # Final state: stock can never be negative; exactly one purchase row;
    # exactly one wallet was debited.
    s = Session()
    try:
        reward = s.query(Reward).filter(Reward.id == reward_id).one()
        assert reward.stock == 0, f"stock leak: {reward.stock}"

        purchases = s.query(RewardPurchase).filter(
            RewardPurchase.reward_id == reward_id
        ).all()
        assert len(purchases) == 1, f"got {len(purchases)} purchases for stock=1"

        wallets = s.query(StudentWallet).filter(
            StudentWallet.student_id.in_(student_ids)
        ).all()
        debited = [w for w in wallets if w.coins == 90]
        unchanged = [w for w in wallets if w.coins == 100]
        assert len(debited) == 1 and len(unchanged) == 1, \
            f"expected one wallet debited and one unchanged, got {[w.coins for w in wallets]}"
    finally:
        s.close()
        engine.dispose()


def test_purchase_rejected_when_balance_insufficient(db_session):
    reward_id, [sid] = _seed_purchase_setup(
        db_session, stock=5, coins_each=5, students=1
    )
    import pytest as _pytest

    with _pytest.raises(Exception) as ei:
        reward_service.create_purchase(db_session, sid, reward_id)
    assert "Tangalar" in str(ei.value)


def test_purchase_rejected_when_reward_inactive(db_session):
    reward_id, [sid] = _seed_purchase_setup(
        db_session, stock=5, coins_each=100, students=1
    )
    reward = db_session.query(Reward).filter(Reward.id == reward_id).one()
    reward.is_active = False
    db_session.commit()

    import pytest as _pytest

    with _pytest.raises(Exception) as ei:
        reward_service.create_purchase(db_session, sid, reward_id)
    assert "faol" in str(ei.value).lower()


def test_purchase_uses_server_side_cost(client, login, make_user, db_session):
    """Even if a malicious client could PATCH cost in-flight, the locked
    SELECT inside create_purchase reads the current authoritative cost."""
    from app.models.models import EducationCenter

    center = EducationCenter(name="C", slug="server-cost")
    db_session.add(center)
    db_session.commit()
    db_session.refresh(center)

    reward = Reward(center_id=center.id, name="X", cost=50, stock=5, is_active=True)
    db_session.add(reward)
    student = Student(center_id=center.id, name="S", phone="+998900000111")
    db_session.add(student); db_session.flush()
    db_session.add(StudentWallet(student_id=student.id, coins=100, center_id=center.id))
    db_session.commit()
    db_session.refresh(reward); db_session.refresh(student)

    user = make_user(role=UserRole.STUDENT, center_id=center.id)
    student.user_id = user.id
    db_session.commit()

    headers = login(user.email)
    r = client.post(
        "/api/rewards/purchases/me",
        json={"reward_id": reward.id},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    body = r.json()["data"]
    assert body["cost"] == 50  # server-authoritative
