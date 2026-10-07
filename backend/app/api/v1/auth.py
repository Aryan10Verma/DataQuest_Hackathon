"""Sign-in. Browsers keep the refresh token in an HttpOnly cookie that page scripts cannot read; the
short-lived access token stays in memory. API clients that can't hold cookies get both tokens in the body."""

from fastapi import APIRouter, Cookie, Header, Response
from fastapi.responses import JSONResponse

from app.api.deps import CurrentUser, Gateway
from app.core.config import get_settings
from app.core.envelope import Envelope, fail, ok
from app.core.errors import AppError
from app.schemas.auth import AuthResult, LoginRequest, RefreshRequest, RegisterRequest, TokenPair, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

COOKIE = "prism_refresh"
COOKIE_PATH = "/api/v1/auth"  # sent only to refresh and sign-out, never to the rest of the API


def _keep(response: Response, tokens: TokenPair, mode: str | None) -> TokenPair:
    s = get_settings()
    response.set_cookie(
        COOKIE,
        tokens.refresh_token or "",
        max_age=s.refresh_token_ttl_days * 86400,
        path=COOKIE_PATH,
        httponly=True,
        secure=s.cookie_secure,
        samesite="strict",
    )
    return tokens.model_copy(update={"refresh_token": None}) if mode == "cookie" else tokens


def _forget(response: Response) -> None:
    s = get_settings()
    response.delete_cookie(COOKIE, path=COOKIE_PATH, httponly=True, secure=s.cookie_secure, samesite="strict")


SessionMode = Header(
    default=None, alias="X-Session-Mode", description="'cookie': keep the refresh token out of the body"
)


@router.post("/register", response_model=Envelope[AuthResult], status_code=201)
def register(body: RegisterRequest, response: Response, mode: str | None = SessionMode, gw=Gateway):
    r = gw.register(body)
    return ok(r.model_copy(update={"tokens": _keep(response, r.tokens, mode)}), mock=gw.mock)


@router.post("/login", response_model=Envelope[AuthResult])
def login(body: LoginRequest, response: Response, mode: str | None = SessionMode, gw=Gateway):
    r = gw.login(body)
    return ok(r.model_copy(update={"tokens": _keep(response, r.tokens, mode)}), mock=gw.mock)


@router.post("/refresh", response_model=Envelope[TokenPair])
def refresh(
    response: Response,
    body: RefreshRequest | None = None,
    cookie: str | None = Cookie(default=None, alias=COOKIE),
    mode: str | None = SessionMode,
    gw=Gateway,
):
    token = (body.refresh_token if body else None) or cookie
    try:
        pair = gw.refresh(RefreshRequest(refresh_token=token))
    except AppError as e:
        # A dead token is cleared from the browser too, so it isn't sent again.
        failed = JSONResponse(fail(e.code, e.message, e.details), status_code=e.status_code)
        _forget(failed)
        return failed
    return ok(_keep(response, pair, mode), mock=gw.mock)


@router.post("/logout", response_model=Envelope[dict])
def logout(
    response: Response,
    body: RefreshRequest | None = None,
    cookie: str | None = Cookie(default=None, alias=COOKIE),
    gw=Gateway,
):
    """Revoke this sign-in everywhere it was refreshed, and clear the cookie."""
    gw.logout((body.refresh_token if body else None) or cookie)
    _forget(response)
    return ok({"signed_out": True}, mock=gw.mock)


@router.get("/me", response_model=Envelope[UserOut])
def me(p=CurrentUser, gw=Gateway):
    return ok(gw.me(p), mock=gw.mock)
