"""SMS provider abstraction.

Drop-in strategy pattern. The backend talks to `SMSProvider` only; concrete
implementations live here.

Providers:
- ``MockSMSProvider``   — development default. Logs and pretends to send.
- ``EskizSMSProvider``  — skeleton for https://eskiz.uz (not implemented).
- ``GetSMSProvider``    — production integration for http://getsms.uz.

Switching providers is one env var: ``SMS_PROVIDER=mock|eskiz|getsms``.

GetSMS credentials are read from:
  - ``GETSMS_LOGIN``       — login issued by the provider
  - ``GETSMS_PASSWORD``    — password issued by the provider
  - ``GETSMS_NICKNAME``    — pre-registered alpha sender name
  - ``GETSMS_BASE_URL``    — optional, default ``http://185.8.212.184/smsgateway``

Important: GetSMS only accepts requests from a server with a *whitelisted*
static IP. Notify GetSMS support of the production server IP before going
live, otherwise every request will be rejected.
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from typing import Protocol

import requests

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class SendResult:
    """Outcome of a single SMS send attempt."""

    ok: bool
    provider_message_id: str | None = None
    error: str | None = None


class SMSProvider(Protocol):
    name: str

    def send(self, phone: str, message: str) -> SendResult: ...
    def balance(self) -> int: ...


# ── Mock ──────────────────────────────────────────────────────────────────


class MockSMSProvider:
    """No-op provider — stores nothing, just returns success.

    Intended for development and as the default until a real provider is
    configured. Every call is logged so you can see what *would* have been
    sent.
    """

    name = "mock"

    def send(self, phone: str, message: str) -> SendResult:
        logger.info("[MockSMS] to=%s msg=%r", phone, message)
        return SendResult(ok=True, provider_message_id=f"mock-{id(message)}")

    def balance(self) -> int:
        return 9999


# ── Eskiz (skeleton) ──────────────────────────────────────────────────────


class EskizSMSProvider:
    """Skeleton for Eskiz.uz integration.

    Fill in ``_login`` and ``send`` to go live. Reference docs:
    https://documenter.getpostman.com/view/663428/RzfmES4z

    Expected flow:
    1. POST ``/auth/login`` with email+password → receive access token.
    2. Cache the token; refresh via ``/auth/refresh`` when expired.
    3. POST ``/message/sms/send`` with ``{mobile_phone, message, from}``.
    4. GET ``/user/get-limit`` for balance.
    """

    name = "eskiz"

    def __init__(self) -> None:
        self.email = os.environ.get("ESKIZ_EMAIL", "")
        self.password = os.environ.get("ESKIZ_PASSWORD", "")
        self.sender = os.environ.get("ESKIZ_SENDER", "4546")
        self.base_url = os.environ.get("ESKIZ_BASE_URL", "https://notify.eskiz.uz/api")
        self._token: str | None = None

    # -- internal -------------------------------------------------------
    def _login(self) -> str:
        """POST /auth/login → bearer token. Implement when going live."""
        raise NotImplementedError(
            "EskizSMSProvider._login: implement once Eskiz credentials are ready. "
            "Use httpx to POST {email, password} and cache the returned token."
        )

    def _authed_headers(self) -> dict[str, str]:
        if not self._token:
            self._token = self._login()
        return {"Authorization": f"Bearer {self._token}"}

    # -- public ---------------------------------------------------------
    def send(self, phone: str, message: str) -> SendResult:
        """POST /message/sms/send. Implement when going live."""
        raise NotImplementedError(
            "EskizSMSProvider.send: POST to {base_url}/message/sms/send with "
            "{mobile_phone, message, from=sender} using _authed_headers()."
        )

    def balance(self) -> int:
        """GET /user/get-limit. Implement when going live."""
        raise NotImplementedError(
            "EskizSMSProvider.balance: GET {base_url}/user/get-limit and return "
            "the remaining SMS count."
        )


# ── GetSMS (http://getsms.uz) ─────────────────────────────────────────────


class GetSMSProvider:
    """Production integration for the GetSMS gateway.

    Endpoints:
      * Send:   ``POST {base_url}/``         form: login, password, nickname, data
      * Status: ``POST {base_url}/status/``  form: login, password, data
      * Balance: GetSMS does not expose a balance endpoint, so ``balance()``
        returns ``-1`` and the service layer falls back to the locally
        tracked counter.

    ``data`` is a JSON-encoded array of ``{"phone": "...", "text": "..."}``
    objects (up to 100 per call). For the single-send method we always send
    a 1-element array.
    """

    name = "getsms"

    # Map GetSMS error_no → human description (used when the gateway returns
    # a per-message error object). Reference: provider documentation.
    _ERRORS: dict[int, str] = {
        100: "Login or Password is NULL",
        101: "Incorrect Login or Password",
        102: "Account blocked",
        103: "Limit is over",
        200: "Array is not a JSON",
        201: "Array is invalid",
        202: "Nickname didn't set",
        203: "Incorrect nickname",
        300: "Phone number is invalid",
        400: "request_id is wrong",
    }

    def __init__(self) -> None:
        self.login = os.environ.get("GETSMS_LOGIN", "")
        self.password = os.environ.get("GETSMS_PASSWORD", "")
        self.nickname = os.environ.get("GETSMS_NICKNAME", "")
        self.base_url = os.environ.get(
            "GETSMS_BASE_URL", "http://185.8.212.184/smsgateway"
        ).rstrip("/")
        self.timeout = float(os.environ.get("GETSMS_TIMEOUT", "15"))

    # -- helpers --------------------------------------------------------
    @staticmethod
    def _normalize_phone(phone: str) -> str:
        """GetSMS expects digits only — international format without ``+``."""
        return "".join(ch for ch in phone if ch.isdigit())

    def _assert_configured(self) -> None:
        missing = [
            name
            for name, value in (
                ("GETSMS_LOGIN", self.login),
                ("GETSMS_PASSWORD", self.password),
                ("GETSMS_NICKNAME", self.nickname),
            )
            if not value
        ]
        if missing:
            raise RuntimeError(
                f"GetSMS provider is not configured: missing {', '.join(missing)}"
            )

    # -- public ---------------------------------------------------------
    def send(self, phone: str, message: str) -> SendResult:
        try:
            self._assert_configured()
        except RuntimeError as exc:
            return SendResult(ok=False, error=str(exc))

        payload = [{"phone": self._normalize_phone(phone), "text": message}]
        try:
            response = requests.post(
                f"{self.base_url}/",
                data={
                    "login": self.login,
                    "password": self.password,
                    "nickname": self.nickname,
                    "data": json.dumps(payload, ensure_ascii=False),
                },
                timeout=self.timeout,
            )
        except requests.RequestException as exc:
            logger.warning("[GetSMS] network error: %s", exc)
            return SendResult(ok=False, error=f"Network error: {exc}")

        # Gateway always replies with HTTP 200 and a JSON body — either an
        # array of per-message results or a single error object.
        try:
            body = response.json()
        except ValueError:
            return SendResult(
                ok=False,
                error=f"Invalid response (HTTP {response.status_code}): {response.text[:200]}",
            )

        if isinstance(body, dict) and body.get("error"):
            return SendResult(ok=False, error=self._format_error(body))

        if isinstance(body, list) and body:
            first = body[0]
            if first.get("error"):
                return SendResult(ok=False, error=self._format_error(first))
            request_id = first.get("request_id") or first.get("message_id")
            return SendResult(
                ok=True, provider_message_id=str(request_id) if request_id else None
            )

        return SendResult(ok=False, error="Unexpected GetSMS response shape")

    def balance(self) -> int:
        # No balance endpoint — let the service keep using the local counter.
        return -1

    def status(self, request_id: str) -> dict | None:
        """Look up the delivery status of a previously sent message.

        Returns the raw status dict from the gateway, or ``None`` on error.
        Useful for a future delivery-status webhook / polling job.
        """
        try:
            self._assert_configured()
        except RuntimeError:
            return None
        try:
            response = requests.post(
                f"{self.base_url}/status/",
                data={
                    "login": self.login,
                    "password": self.password,
                    "data": json.dumps([{"request_id": str(request_id)}]),
                },
                timeout=self.timeout,
            )
            body = response.json()
        except (requests.RequestException, ValueError) as exc:
            logger.warning("[GetSMS] status lookup failed: %s", exc)
            return None
        if isinstance(body, list) and body:
            return body[0]
        if isinstance(body, dict):
            return body
        return None

    # -- internal -------------------------------------------------------
    def _format_error(self, obj: dict) -> str:
        code = obj.get("error_no")
        description = obj.get("error_text") or self._ERRORS.get(int(code) if code else -1)
        return f"GetSMS error {code}: {description or 'unknown error'}"


# ── Factory ───────────────────────────────────────────────────────────────


_provider_cache: SMSProvider | None = None


def get_provider() -> SMSProvider:
    """Return the currently configured SMS provider (singleton).

    Controlled by ``SMS_PROVIDER`` env var. Defaults to ``mock``.
    """
    global _provider_cache
    if _provider_cache is not None:
        return _provider_cache

    choice = os.environ.get("SMS_PROVIDER", "mock").lower()
    if choice == "eskiz":
        _provider_cache = EskizSMSProvider()
    elif choice == "getsms":
        _provider_cache = GetSMSProvider()
    else:
        _provider_cache = MockSMSProvider()
    return _provider_cache


def reset_provider_cache() -> None:
    """Clear the cached provider (useful in tests / after env var change)."""
    global _provider_cache
    _provider_cache = None
