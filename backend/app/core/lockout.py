"""Per-account login lockout backend.

Two implementations:
  - ``MemoryLockoutBackend``: process-local dict (current default; fine for
    single-worker dev/test).
  - ``RedisLockoutBackend``: shared across uvicorn workers and instances;
    REQUIRED in production when ``--workers > 1``.

Selection at import time via the ``REDIS_URL`` env var. If unset, in-memory
is used so existing tests and dev environments keep working unchanged.

Why this matters: with the in-memory backend, an attacker can simply retry
until they hit a worker that hasn't seen the previous failures — the
lockout is effectively bypassed. Redis gives every worker a single source
of truth.
"""

from __future__ import annotations

import logging
import os
import threading
import time
from typing import Protocol

log = logging.getLogger(__name__)


# ── Tunables (env-overridable) ─────────────────────────────────────────────

LOCKOUT_MAX_FAILS = int(os.getenv("LOGIN_LOCKOUT_MAX_FAILS", "5"))
LOCKOUT_WINDOW_SECONDS = int(os.getenv("LOGIN_LOCKOUT_WINDOW_SECONDS", str(15 * 60)))
LOCKOUT_DURATION_SECONDS = int(os.getenv("LOGIN_LOCKOUT_DURATION_SECONDS", str(15 * 60)))


def _normalize(email: str) -> str:
    return (email or "").strip().lower()


# ── Backend protocol ───────────────────────────────────────────────────────


class LockoutBackend(Protocol):
    def record_failure(self, email: str) -> None: ...
    def record_success(self, email: str) -> None: ...
    def locked_until(self, email: str) -> float:
        """Return absolute epoch timestamp when the lock expires; 0 if unlocked."""
        ...
    def clear(self) -> None:
        """Test helper — wipe all state."""
        ...


# ── In-memory backend (default) ────────────────────────────────────────────


class MemoryLockoutBackend:
    def __init__(self) -> None:
        # Exposed so existing tests can `auth_service._login_state.clear()`.
        self.state: dict[str, dict] = {}
        self.lock = threading.Lock()

    def record_failure(self, email: str) -> None:
        key = _normalize(email)
        if not key:
            return
        now = time.time()
        with self.lock:
            entry = self.state.get(key)
            if entry is None or (now - entry["first"]) > LOCKOUT_WINDOW_SECONDS:
                self.state[key] = {"first": now, "fails": 1, "locked_until": 0.0}
                return
            entry["fails"] += 1
            if entry["fails"] >= LOCKOUT_MAX_FAILS:
                entry["locked_until"] = now + LOCKOUT_DURATION_SECONDS

    def record_success(self, email: str) -> None:
        with self.lock:
            self.state.pop(_normalize(email), None)

    def locked_until(self, email: str) -> float:
        key = _normalize(email)
        if not key:
            return 0.0
        with self.lock:
            entry = self.state.get(key)
            if entry is None:
                return 0.0
            return float(entry.get("locked_until", 0.0))

    def clear(self) -> None:
        with self.lock:
            self.state.clear()


# ── Redis backend ──────────────────────────────────────────────────────────


class RedisLockoutBackend:
    """Redis-backed lockout. Two keys per email:

      ``eduly:lockout:fails:{email}``  → INCR'd counter, EXPIRE'd to the rolling window
      ``eduly:lockout:until:{email}``  → epoch ts; presence == locked

    Failure counter auto-expires so a stale failure burst doesn't haunt the
    user forever. Lockout key carries its own TTL.
    """

    KEY_FAILS = "eduly:lockout:fails:{}"
    KEY_UNTIL = "eduly:lockout:until:{}"

    def __init__(self, url: str) -> None:
        # Imported lazily so dev environments without redis-py installed don't
        # explode at module load.
        import redis  # type: ignore

        # decode_responses=True so we get str, not bytes — much friendlier
        # everywhere downstream.
        self.client = redis.Redis.from_url(url, decode_responses=True)
        # Probe the connection eagerly; if Redis isn't reachable, fail fast
        # so an admin notices instead of silently degrading to "no lockout".
        self.client.ping()

    def record_failure(self, email: str) -> None:
        key = _normalize(email)
        if not key:
            return
        fails_key = self.KEY_FAILS.format(key)
        until_key = self.KEY_UNTIL.format(key)
        try:
            pipe = self.client.pipeline()
            pipe.incr(fails_key)
            pipe.expire(fails_key, LOCKOUT_WINDOW_SECONDS)
            fails, _ = pipe.execute()
            if int(fails) >= LOCKOUT_MAX_FAILS:
                self.client.set(
                    until_key,
                    str(time.time() + LOCKOUT_DURATION_SECONDS),
                    ex=LOCKOUT_DURATION_SECONDS,
                )
        except Exception:  # noqa: BLE001
            # Don't let a Redis outage block logins. Log loudly so ops knows
            # lockout is degraded; allow the request through (failing-open is
            # the right choice here — failing-closed locks every user out).
            log.exception("Redis lockout record_failure failed (failing open)")

    def record_success(self, email: str) -> None:
        key = _normalize(email)
        if not key:
            return
        try:
            self.client.delete(self.KEY_FAILS.format(key), self.KEY_UNTIL.format(key))
        except Exception:  # noqa: BLE001
            log.exception("Redis lockout record_success failed")

    def locked_until(self, email: str) -> float:
        key = _normalize(email)
        if not key:
            return 0.0
        try:
            raw = self.client.get(self.KEY_UNTIL.format(key))
            return float(raw) if raw else 0.0
        except Exception:  # noqa: BLE001
            log.exception("Redis lockout locked_until failed (treating as unlocked)")
            return 0.0

    def clear(self) -> None:
        # Test convenience only — dangerous in production.
        try:
            for prefix in ("eduly:lockout:fails:*", "eduly:lockout:until:*"):
                for k in self.client.scan_iter(match=prefix):
                    self.client.delete(k)
        except Exception:  # noqa: BLE001
            log.exception("Redis lockout clear failed")


# ── Factory + module-level singleton ───────────────────────────────────────


def _build_backend() -> LockoutBackend:
    url = os.getenv("REDIS_URL", "").strip()
    if not url:
        return MemoryLockoutBackend()
    try:
        backend = RedisLockoutBackend(url)
        log.info("Login lockout: using Redis backend at %s", url)
        return backend
    except Exception:  # noqa: BLE001
        log.exception(
            "Login lockout: Redis backend unavailable at %s; falling back to memory. "
            "DO NOT run multi-worker uvicorn with this configuration in production.",
            url,
        )
        return MemoryLockoutBackend()


backend: LockoutBackend = _build_backend()
