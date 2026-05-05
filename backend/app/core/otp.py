"""One-time password (OTP) service for phone-based login and password reset.

Two backends mirror the lockout abstraction in ``app/core/lockout.py``:
  - In-memory (default; single-process dev/test).
  - Redis (production; shared across uvicorn workers).

Selection: Redis when ``REDIS_URL`` is set, in-memory otherwise.

Security notes:
  - We store ONLY a salted SHA-256 of the code, never the plaintext.
  - One active code per phone — requesting a new code invalidates the old.
  - Codes expire after ``OTP_TTL_SECONDS`` (default 5 minutes).
  - Per-phone send rate limit (one code per ``OTP_MIN_INTERVAL_SECONDS``)
    plus a daily cap (``OTP_DAILY_MAX``) to bound SMS spend.
  - Verification has its own attempt counter; ``OTP_MAX_VERIFY_ATTEMPTS``
    failures invalidate the code (forces a fresh send).
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import os
import secrets
import threading
import time
from dataclasses import dataclass, field
from typing import Literal, Protocol

log = logging.getLogger(__name__)


# ── Tunables ───────────────────────────────────────────────────────────────

OTP_LENGTH = int(os.getenv("OTP_LENGTH", "6"))
OTP_TTL_SECONDS = int(os.getenv("OTP_TTL_SECONDS", "300"))                 # 5 min
OTP_MIN_INTERVAL_SECONDS = int(os.getenv("OTP_MIN_INTERVAL_SECONDS", "60"))
OTP_DAILY_MAX = int(os.getenv("OTP_DAILY_MAX", "10"))
OTP_MAX_VERIFY_ATTEMPTS = int(os.getenv("OTP_MAX_VERIFY_ATTEMPTS", "5"))
# Salt mixed into the code hash. Keeps stolen DB / Redis snapshots from being
# trivially crackable — production must override this.
_OTP_SALT = os.getenv("OTP_HASH_SALT", "change-me-in-production").encode()


OtpPurpose = Literal["login", "password_reset"]


def _normalize_phone(phone: str) -> str:
    return (phone or "").strip().replace(" ", "")


def _hash_code(code: str) -> str:
    return hmac.new(_OTP_SALT, code.encode(), hashlib.sha256).hexdigest()


def _generate_code() -> str:
    # secrets.choice avoids the modulo bias of randrange.
    return "".join(secrets.choice("0123456789") for _ in range(OTP_LENGTH))


@dataclass
class _Entry:
    code_hash: str
    expires_at: float
    attempts: int = 0


@dataclass
class _Rate:
    last_sent: float = 0.0
    sent_today: int = 0
    day_started_at: float = field(default_factory=time.time)


# ── Backend protocol ───────────────────────────────────────────────────────


class OtpBackend(Protocol):
    def issue(self, phone: str, purpose: OtpPurpose, code_hash: str, ttl: int) -> None: ...
    def get(self, phone: str, purpose: OtpPurpose) -> _Entry | None: ...
    def consume(self, phone: str, purpose: OtpPurpose) -> None: ...
    def bump_attempt(self, phone: str, purpose: OtpPurpose) -> int: ...
    def rate_check(self, phone: str) -> tuple[bool, str | None]:
        """Returns (allowed, reason). Reason is a user-facing Uzbek message."""
        ...
    def rate_record(self, phone: str) -> None: ...
    def clear(self) -> None: ...


# ── In-memory backend ─────────────────────────────────────────────────────


class MemoryOtpBackend:
    def __init__(self) -> None:
        self._codes: dict[tuple[str, str], _Entry] = {}
        self._rates: dict[str, _Rate] = {}
        self._lock = threading.Lock()

    def issue(self, phone: str, purpose: OtpPurpose, code_hash: str, ttl: int) -> None:
        with self._lock:
            self._codes[(phone, purpose)] = _Entry(
                code_hash=code_hash,
                expires_at=time.time() + ttl,
            )

    def get(self, phone: str, purpose: OtpPurpose) -> _Entry | None:
        with self._lock:
            entry = self._codes.get((phone, purpose))
            if entry is None:
                return None
            if entry.expires_at < time.time():
                self._codes.pop((phone, purpose), None)
                return None
            return entry

    def consume(self, phone: str, purpose: OtpPurpose) -> None:
        with self._lock:
            self._codes.pop((phone, purpose), None)

    def bump_attempt(self, phone: str, purpose: OtpPurpose) -> int:
        with self._lock:
            entry = self._codes.get((phone, purpose))
            if entry is None:
                return 0
            entry.attempts += 1
            if entry.attempts >= OTP_MAX_VERIFY_ATTEMPTS:
                self._codes.pop((phone, purpose), None)
            return entry.attempts

    def rate_check(self, phone: str) -> tuple[bool, str | None]:
        with self._lock:
            now = time.time()
            r = self._rates.get(phone)
            if r is None:
                return True, None
            # Roll the daily window.
            if now - r.day_started_at > 86400:
                r.sent_today = 0
                r.day_started_at = now
            if now - r.last_sent < OTP_MIN_INTERVAL_SECONDS:
                wait = int(OTP_MIN_INTERVAL_SECONDS - (now - r.last_sent))
                return False, f"Iltimos, {wait} soniyadan keyin urinib ko'ring"
            if r.sent_today >= OTP_DAILY_MAX:
                return False, "Bugungi SMS kvotasi tugadi. Ertaga urinib ko'ring."
            return True, None

    def rate_record(self, phone: str) -> None:
        with self._lock:
            now = time.time()
            r = self._rates.get(phone) or _Rate(day_started_at=now)
            if now - r.day_started_at > 86400:
                r.sent_today = 0
                r.day_started_at = now
            r.last_sent = now
            r.sent_today += 1
            self._rates[phone] = r

    def clear(self) -> None:
        with self._lock:
            self._codes.clear()
            self._rates.clear()


# ── Redis backend ──────────────────────────────────────────────────────────


class RedisOtpBackend:
    KEY_CODE = "eduly:otp:code:{purpose}:{phone}"
    KEY_RATE_LAST = "eduly:otp:rate:last:{phone}"
    KEY_RATE_DAY = "eduly:otp:rate:day:{phone}"
    KEY_ATTEMPTS = "eduly:otp:attempts:{purpose}:{phone}"

    def __init__(self, url: str) -> None:
        import redis  # type: ignore
        self.client = redis.Redis.from_url(url, decode_responses=True)
        self.client.ping()

    def issue(self, phone: str, purpose: OtpPurpose, code_hash: str, ttl: int) -> None:
        try:
            pipe = self.client.pipeline()
            # Write the code as a hash so we can store expiry alongside.
            key = self.KEY_CODE.format(purpose=purpose, phone=phone)
            pipe.delete(key, self.KEY_ATTEMPTS.format(purpose=purpose, phone=phone))
            pipe.hset(key, mapping={"hash": code_hash, "expires_at": str(time.time() + ttl)})
            pipe.expire(key, ttl)
            pipe.execute()
        except Exception:  # noqa: BLE001
            log.exception("Redis OTP issue failed")
            raise

    def get(self, phone: str, purpose: OtpPurpose) -> _Entry | None:
        try:
            key = self.KEY_CODE.format(purpose=purpose, phone=phone)
            data = self.client.hgetall(key)
            if not data:
                return None
            attempts_raw = self.client.get(self.KEY_ATTEMPTS.format(purpose=purpose, phone=phone))
            attempts = int(attempts_raw) if attempts_raw else 0
            return _Entry(
                code_hash=data["hash"],
                expires_at=float(data["expires_at"]),
                attempts=attempts,
            )
        except Exception:  # noqa: BLE001
            log.exception("Redis OTP get failed")
            return None

    def consume(self, phone: str, purpose: OtpPurpose) -> None:
        try:
            self.client.delete(
                self.KEY_CODE.format(purpose=purpose, phone=phone),
                self.KEY_ATTEMPTS.format(purpose=purpose, phone=phone),
            )
        except Exception:  # noqa: BLE001
            log.exception("Redis OTP consume failed")

    def bump_attempt(self, phone: str, purpose: OtpPurpose) -> int:
        try:
            key = self.KEY_ATTEMPTS.format(purpose=purpose, phone=phone)
            n = self.client.incr(key)
            self.client.expire(key, OTP_TTL_SECONDS)
            if int(n) >= OTP_MAX_VERIFY_ATTEMPTS:
                self.consume(phone, purpose)
            return int(n)
        except Exception:  # noqa: BLE001
            log.exception("Redis OTP bump_attempt failed")
            return 0

    def rate_check(self, phone: str) -> tuple[bool, str | None]:
        try:
            now = time.time()
            last_raw = self.client.get(self.KEY_RATE_LAST.format(phone=phone))
            if last_raw:
                last = float(last_raw)
                if now - last < OTP_MIN_INTERVAL_SECONDS:
                    wait = int(OTP_MIN_INTERVAL_SECONDS - (now - last))
                    return False, f"Iltimos, {wait} soniyadan keyin urinib ko'ring"
            day_raw = self.client.get(self.KEY_RATE_DAY.format(phone=phone))
            if day_raw and int(day_raw) >= OTP_DAILY_MAX:
                return False, "Bugungi SMS kvotasi tugadi. Ertaga urinib ko'ring."
            return True, None
        except Exception:  # noqa: BLE001
            log.exception("Redis OTP rate_check failed (failing open)")
            return True, None

    def rate_record(self, phone: str) -> None:
        try:
            now = time.time()
            self.client.set(
                self.KEY_RATE_LAST.format(phone=phone),
                str(now),
                ex=OTP_MIN_INTERVAL_SECONDS,
            )
            day_key = self.KEY_RATE_DAY.format(phone=phone)
            self.client.incr(day_key)
            self.client.expire(day_key, 86400)
        except Exception:  # noqa: BLE001
            log.exception("Redis OTP rate_record failed")

    def clear(self) -> None:
        try:
            for pat in (
                "eduly:otp:code:*",
                "eduly:otp:rate:*",
                "eduly:otp:attempts:*",
            ):
                for k in self.client.scan_iter(match=pat):
                    self.client.delete(k)
        except Exception:  # noqa: BLE001
            log.exception("Redis OTP clear failed")


# ── Factory + singleton ────────────────────────────────────────────────────


def _build_backend() -> OtpBackend:
    url = os.getenv("REDIS_URL", "").strip()
    if not url:
        return MemoryOtpBackend()
    try:
        backend = RedisOtpBackend(url)
        log.info("OTP: using Redis backend at %s", url)
        return backend
    except Exception:  # noqa: BLE001
        log.exception("OTP: Redis unavailable at %s; falling back to memory", url)
        return MemoryOtpBackend()


backend: OtpBackend = _build_backend()


# ── Public API ─────────────────────────────────────────────────────────────


@dataclass
class OtpIssueResult:
    code: str        # plaintext — the caller sends it via SMS, never stored
    expires_in: int  # seconds


def issue(phone: str, purpose: OtpPurpose) -> OtpIssueResult:
    """Generate, store the hash, and return the plaintext code so the caller
    can send it. Caller is responsible for ``rate_check``ing first.
    """
    phone = _normalize_phone(phone)
    code = _generate_code()
    backend.issue(phone, purpose, _hash_code(code), OTP_TTL_SECONDS)
    backend.rate_record(phone)
    return OtpIssueResult(code=code, expires_in=OTP_TTL_SECONDS)


def verify(phone: str, purpose: OtpPurpose, code: str) -> bool:
    """Constant-time check. On mismatch, increments the attempt counter and
    invalidates the code if the limit is reached."""
    phone = _normalize_phone(phone)
    code = (code or "").strip()
    entry = backend.get(phone, purpose)
    if entry is None:
        return False
    expected = entry.code_hash
    actual = _hash_code(code)
    if not hmac.compare_digest(expected, actual):
        backend.bump_attempt(phone, purpose)
        return False
    backend.consume(phone, purpose)
    return True


def can_send(phone: str) -> tuple[bool, str | None]:
    return backend.rate_check(_normalize_phone(phone))
