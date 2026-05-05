"""Response envelope middleware — wraps all JSON responses in a consistent shape.

Success:  {"success": true,  "data": <original>,  "error": null}
Error:    {"success": false, "data": null, "error": {"message": str, "code": str}}

OpenAPI/Swagger routes (/docs, /redoc, /openapi.json) are passed through untouched.
"""

import json
import logging
from typing import Any

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

logger = logging.getLogger(__name__)

_PASSTHROUGH_PREFIXES = ("/docs", "/redoc", "/openapi.json")


def _success(data: Any) -> dict:
    return {"success": True, "data": data, "error": None}


def _error(message: str, code: str) -> dict:
    return {"success": False, "data": None, "error": {"message": message, "code": code}}


class ResponseEnvelopeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        if request.url.path.startswith(_PASSTHROUGH_PREFIXES):
            return await call_next(request)

        response = await call_next(request)

        if response.headers.get("content-type", "").startswith("application/json"):
            raw = b"".join([chunk async for chunk in response.body_iterator])
            try:
                body = json.loads(raw)
            except ValueError:
                return response  # non-JSON body — pass through

            headers = {
                k: v
                for k, v in response.headers.items()
                if k.lower() not in {"content-length", "content-type"}
            }

            # Skip re-wrapping if the body is already in envelope form
            if isinstance(body, dict) and "success" in body and "error" in body:
                return JSONResponse(content=body, status_code=response.status_code, headers=headers)

            if response.status_code < 400:
                wrapped = _success(body)
            else:
                detail = body.get("detail", "An unexpected error occurred") if isinstance(body, dict) else "An unexpected error occurred"
                message = detail if isinstance(detail, str) else str(detail)
                code = _status_to_code(response.status_code)
                wrapped = _error(message, code)

            return JSONResponse(content=wrapped, status_code=response.status_code,
                                headers=headers)

        return response


# ── Exception handlers (register these on the app, not the middleware) ────────

async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    code = _status_to_code(exc.status_code)
    message = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    return JSONResponse(status_code=exc.status_code, content=_error(message, code))


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    first = exc.errors()[0]
    field = " → ".join(str(loc) for loc in first["loc"] if loc != "body")
    message = f"{field}: {first['msg']}" if field else first["msg"]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=_error(message, "VALIDATION_ERROR"),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_error("Internal server error", "INTERNAL_ERROR"),
    )


def _status_to_code(status_code: int) -> str:
    return {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        422: "VALIDATION_ERROR",
        429: "RATE_LIMITED",
        500: "INTERNAL_ERROR",
    }.get(status_code, f"HTTP_{status_code}")
