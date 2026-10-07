"""Security controls: headers, request limits, cookie sessions, record checks on alias routes, bot trap
and field encryption."""

import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.mocks import demo_families as df
from tests.test_live import live, login  # noqa: F401 - shared live-mode fixture

PW = df.DEMO_PASSWORD


def _app_with(monkeypatch, **env: str) -> TestClient:
    for k, v in env.items():
        monkeypatch.setenv(k, v)
    get_settings.cache_clear()
    from app.main import create_app

    try:
        return TestClient(create_app())
    finally:
        get_settings.cache_clear()


# ---------------------------------------------------------------- headers and limits
def test_security_headers_on_api_responses(client):
    h = client.get("/api/v1/system/health").headers
    assert "default-src 'self'" in h["content-security-policy"]
    assert "frame-ancestors 'none'" in h["content-security-policy"]
    assert h["x-content-type-options"] == "nosniff"
    assert h["x-frame-options"] == "DENY"
    assert h["referrer-policy"] == "strict-origin-when-cross-origin"
    assert h["cache-control"] == "no-store"
    assert "strict-transport-security" not in h  # plain-http development


def test_docs_keep_working_without_csp(client):
    r = client.get("/docs")
    assert r.status_code == 200 and "content-security-policy" not in r.headers


def test_oversized_body_is_refused(client):
    r = client.post(
        "/api/v1/auth/login",
        content=b'{"email": "a@b.co", "password": "' + b"x" * 1_100_000 + b'"}',
        headers={"Content-Type": "application/json"},
    )
    assert r.status_code == 413 and r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_sign_in_has_its_own_tight_rate_limit(monkeypatch):
    c = _app_with(monkeypatch, AUTH_RATE_LIMIT_PER_MINUTE="3")
    body = {"email": "nobody@prism.example", "password": "wrong-password"}
    codes = [c.post("/api/v1/auth/login", json=body).status_code for _ in range(4)]
    assert codes[:3] == [200, 200, 200] and codes[3] == 429  # MOCK_MODE accepts any password
    assert c.get("/api/v1/system/health").status_code == 200  # the rest of the API is unaffected


def test_https_is_forced_when_asked(monkeypatch):
    c = _app_with(monkeypatch, FORCE_HTTPS="true")
    r = c.get("/api/v1/careers", follow_redirects=False)
    assert r.status_code == 308 and r.headers["location"].startswith("https://")
    assert c.get("/api/v1/system/health").status_code == 200  # load balancers may probe over http
    secure = TestClient(c.app, base_url="https://testserver")
    assert "max-age=31536000" in secure.get("/api/v1/system/health").headers["strict-transport-security"]


def test_production_needs_real_secrets():
    from pydantic import ValidationError

    from app.core.config import Settings

    base = {"app_env": "production", "demo_mode": False, "mock_mode": False}
    with pytest.raises(ValidationError, match="JWT_SECRET"):
        Settings(**base, jwt_secret="change-me-in-production-at-least-32-chars", data_encryption_key="k" * 44)
    with pytest.raises(ValidationError, match="DATA_ENCRYPTION_KEY"):
        Settings(**base, jwt_secret="x" * 48, data_encryption_key="")
    s = Settings(**base, jwt_secret="x" * 48, data_encryption_key="k" * 44)
    assert s.https_only  # production redirects to https unless told otherwise


def test_bot_trap_field_rejects_registration(client):
    r = client.post(
        "/api/v1/auth/register",
        json={
            "email": "bot@example.com",
            "password": "password123",
            "full_name": "Bot",
            "role": "parent",
            "website": "http://spam.example",
        },
    )
    assert r.status_code == 422 and r.json()["error"]["message"] == "Registration could not be completed"


# ---------------------------------------------------------------- live mode
def _cookie(r) -> str:
    raw = r.headers["set-cookie"]
    assert "HttpOnly" in raw and "SameSite=strict" in raw and "Path=/api/v1/auth" in raw and "Secure" in raw
    return raw.split(";", 1)[0]  # "prism_refresh=<token>"


def test_cookie_session_keeps_refresh_token_away_from_scripts(live):  # noqa: F811
    email = df.parent_email("aligned_family")
    r = live.post(
        "/api/v1/auth/login", json={"email": email, "password": PW}, headers={"X-Session-Mode": "cookie"}
    )
    assert r.status_code == 200 and r.json()["data"]["tokens"]["refresh_token"] is None
    first = _cookie(r)

    r = live.post("/api/v1/auth/refresh", headers={"Cookie": first, "X-Session-Mode": "cookie"})
    assert r.status_code == 200 and r.json()["data"]["access_token"]
    second = _cookie(r)
    assert second != first  # rotated

    assert live.post("/api/v1/auth/logout", headers={"Cookie": second}).status_code == 200
    r = live.post("/api/v1/auth/refresh", headers={"Cookie": second})
    assert r.status_code == 401
    assert 'prism_refresh=""' in r.headers["set-cookie"]  # the dead cookie is cleared


def test_body_tokens_still_work_for_api_clients(live):  # noqa: F811
    r = live.post("/api/v1/auth/login", json={"email": df.parent_email("aligned_family"), "password": PW})
    token = r.json()["data"]["tokens"]["refresh_token"]
    assert token
    assert live.post("/api/v1/auth/refresh", json={"refresh_token": token}).status_code == 200


def test_unknown_email_and_wrong_password_look_the_same(live):  # noqa: F811
    a = live.post("/api/v1/auth/login", json={"email": "nobody@prism.example", "password": "x" * 10})
    b = live.post(
        "/api/v1/auth/login", json={"email": df.student_email("aligned_family"), "password": "x" * 10}
    )
    assert a.status_code == b.status_code == 401
    assert a.json()["error"] == b.json()["error"]


def test_alias_routes_need_sign_in_and_respect_families(live):  # noqa: F811
    mine, me = login(live, df.parent_email("aligned_family"))
    theirs, them = login(live, df.parent_email("creative_risk_averse"))
    their_student = df.student_email("creative_risk_averse")
    _, s = login(live, their_student)
    their_run = live.get("/api/v1/analysis/runs", headers=theirs).json()["data"]["items"][0]["run_id"]

    assert live.get(f"/api/users/{me['user']['id']}").status_code == 401
    assert live.get(f"/api/results/{their_run}").status_code == 401
    assert live.post("/api/predict", json={"student_id": s["user"]["id"]}).status_code == 401

    assert live.get(f"/api/users/{me['user']['id']}", headers=mine).status_code == 200
    assert live.get(f"/api/users/{them['user']['id']}", headers=mine).status_code == 403
    assert live.get(f"/api/results/{their_run}", headers=mine).status_code == 403
    assert live.post("/api/predict", json={"student_id": s["user"]["id"]}, headers=mine).status_code == 403
    assert live.get(f"/api/results/{their_run}", headers=theirs).status_code == 200


def test_notes_are_encrypted_at_rest(live):  # noqa: F811
    from sqlalchemy import text

    from app.db import session as dbs

    h, d = login(live, df.parent_email("aligned_family"))
    sid = live.get("/api/v1/analysis/runs", headers=h).json()["data"]["items"][0]["student_id"]
    secret = "Chose the college near grandma's house"
    r = live.post(f"/api/v1/students/{sid}/outcomes", json={"status": "waiting", "notes": secret}, headers=h)
    assert r.status_code == 201 and r.json()["data"]["notes"] == secret
    with dbs.get_sessionmaker()() as db:
        stored = db.execute(text("SELECT notes FROM outcomes WHERE notes IS NOT NULL")).scalars().all()
    assert stored and all(v.startswith("enc1:") and secret not in v for v in stored)
    listed = live.get(f"/api/v1/students/{sid}/outcomes", headers=h).json()["data"]
    assert secret in [o["notes"] for o in listed]


def test_dev_secrets_never_reach_the_website():
    dist = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
    if not os.path.isdir(dist):
        pytest.skip("website not built")
    names = ("JWT_SECRET", "DATA_ENCRYPTION_KEY", "GROK_API_KEY", "ADZUNA_APP_KEY", "TWILIO_AUTH_TOKEN")
    for root, _, files in os.walk(dist):
        for f in files:
            if f.endswith((".js", ".html", ".css")):
                body = Path(root, f).read_text(encoding="utf-8", errors="ignore")
                assert not any(n in body for n in names), f
