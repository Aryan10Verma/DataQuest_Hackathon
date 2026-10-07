"""Request-id, access logging, rate limits, security headers, HTTPS redirect and a request-size cap."""

import logging
import threading
import time
from collections import defaultdict, deque

from fastapi.responses import JSONResponse, RedirectResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.envelope import fail
from app.core.errors import ErrorCode
from app.core.request_context import new_request_id, set_request_id

log = logging.getLogger("prism.access")

REQUEST_ID_HEADER = "X-Request-ID"


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        incoming = request.headers.get(REQUEST_ID_HEADER, "")
        rid = (
            incoming if 8 <= len(incoming) <= 64 and incoming.replace("-", "").isalnum() else new_request_id()
        )
        set_request_id(rid)
        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        response.headers[REQUEST_ID_HEADER] = rid
        response.headers["X-Response-Time-ms"] = str(elapsed_ms)
        log.info(
            "request",
            extra={
                "extra_fields": {
                    "method": request.method,
                    "path": request.url.path,
                    "status": response.status_code,
                    "elapsed_ms": elapsed_ms,
                }
            },
        )
        return response


# Sign-in, sign-up and token refresh: a much smaller budget per IP, so passwords can't be guessed in bulk.
AUTH_PATHS = (
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/refresh",
    "/api/login",
    "/api/users",
)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Sliding 60 s windows per client IP: one for the whole API, a tighter one for sign-in.

    Single-process only; swap for Redis when scaling out. Behind a proxy, run uvicorn with
    --proxy-headers so the client's own address is used.
    """

    def __init__(self, app, per_minute: int, auth_per_minute: int = 0) -> None:  # noqa: ANN001
        super().__init__(app)
        self.per_minute = per_minute
        self.auth_per_minute = auth_per_minute
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def _over(self, key: str, limit: int, now: float) -> int | None:
        """Record a hit; return seconds to wait when the window is already full."""
        q = self._hits[key]
        while q and now - q[0] > 60:
            q.popleft()
        if len(q) >= limit:
            return max(1, int(60 - (now - q[0])))
        q.append(now)
        return None

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        path = request.url.path
        # Only the API is limited; the website's static files (served alongside it) are not.
        if not path.startswith("/api") or path.endswith("/health"):
            return await call_next(request)
        client = request.client.host if request.client else "unknown"
        now = time.monotonic()
        is_auth = request.method == "POST" and path.rstrip("/") in AUTH_PATHS
        with self._lock:
            retry = None
            if self.auth_per_minute > 0 and is_auth:
                retry = self._over(f"auth:{client}", self.auth_per_minute, now)
            if retry is None and self.per_minute > 0:
                retry = self._over(client, self.per_minute, now)
        if retry is not None:
            msg = "Too many sign-in attempts; wait a minute and try again" if is_auth else "Too many requests"
            body = fail(ErrorCode.RATE_LIMITED, msg, {"retry_after_s": retry})
            return JSONResponse(body, status_code=429, headers={"Retry-After": str(retry)})
        return await call_next(request)


# The website is built to need nothing from other origins: scripts, styles, fonts and images are all
# served from here. Inline style attributes are allowed (animations set them); inline scripts are not.
CSP = "; ".join(
    (
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
    )
)
# Swagger and ReDoc load their own scripts from a CDN; they get the other headers but no CSP.
_DOCS = ("/docs", "/redoc")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, hsts: bool) -> None:  # noqa: ANN001
        super().__init__(app)
        self.hsts = hsts

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        h = response.headers
        if not request.url.path.startswith(_DOCS):
            h.setdefault("Content-Security-Policy", CSP)
        h.setdefault("X-Content-Type-Options", "nosniff")
        h.setdefault("X-Frame-Options", "DENY")
        h.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        h.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()")
        h.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        h.setdefault("Cross-Origin-Resource-Policy", "same-origin")
        if request.url.path.startswith("/api"):
            h.setdefault("Cache-Control", "no-store")  # personal data never sits in shared caches
        if self.hsts:
            h.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        return response


class HTTPSRedirectMiddleware(BaseHTTPMiddleware):
    """Send plain-http visitors to https. The health check stays reachable for load balancers."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.url.scheme == "http" and not request.url.path.endswith("/health"):
            return RedirectResponse(str(request.url.replace(scheme="https")), status_code=308)
        return await call_next(request)


class BodySizeLimitMiddleware:
    """Refuse request bodies over `max_bytes`, by Content-Length up front and by counting chunked bodies."""

    def __init__(self, app: ASGIApp, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        declared = dict(scope.get("headers") or []).get(b"content-length")
        if declared is not None and (not declared.isdigit() or int(declared) > self.max_bytes):
            await self._too_large(scope, receive, send)
            return
        seen = 0

        async def counted() -> Message:
            nonlocal seen
            message = await receive()
            if message["type"] == "http.request":
                seen += len(message.get("body", b""))
                if seen > self.max_bytes:
                    raise _TooLarge
            return message

        try:
            await self.app(scope, counted, send)
        except _TooLarge:
            await self._too_large(scope, receive, send)

    async def _too_large(self, scope: Scope, receive: Receive, send: Send) -> None:
        body = fail(ErrorCode.VALIDATION_ERROR, "Request body too large", {"max_bytes": self.max_bytes})
        await JSONResponse(body, status_code=413)(scope, receive, send)


class _TooLarge(Exception):
    pass
