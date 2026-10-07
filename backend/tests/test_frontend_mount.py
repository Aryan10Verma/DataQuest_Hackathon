"""The backend can serve the built website next to the API (one server for the whole product)."""

from fastapi.testclient import TestClient

from app.main import _mount_frontend, create_app


def _site(tmp_path):
    (tmp_path / "assets").mkdir()
    (tmp_path / "index.html").write_text("<!doctype html><title>PRISM</title>")
    (tmp_path / "assets" / "app.js").write_text("console.log(1)")
    (tmp_path / "favicon.svg").write_text("<svg/>")
    return tmp_path


def _client(tmp_path, monkeypatch):
    monkeypatch.setenv("FRONTEND_DIST", "none")
    from app.core.config import get_settings

    get_settings.cache_clear()
    app = create_app()
    _mount_frontend(app, str(_site(tmp_path)))
    get_settings.cache_clear()
    return TestClient(app)


def test_serves_index_for_client_routes(tmp_path, monkeypatch):
    c = _client(tmp_path, monkeypatch)
    for path in ("/", "/signin", "/app/results/career/abc"):
        r = c.get(path)
        assert r.status_code == 200
        assert "<title>PRISM</title>" in r.text


def test_serves_static_files(tmp_path, monkeypatch):
    c = _client(tmp_path, monkeypatch)
    assert c.get("/assets/app.js").text == "console.log(1)"
    assert c.get("/favicon.svg").text == "<svg/>"


def test_api_routes_still_win_and_unknown_api_paths_stay_json(tmp_path, monkeypatch):
    c = _client(tmp_path, monkeypatch)
    assert c.get("/api/v1/system/health").json()["success"] is True
    r = c.get("/api/v1/no-such-thing")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "NOT_FOUND"


def test_does_not_escape_the_site_folder(tmp_path, monkeypatch):
    c = _client(tmp_path, monkeypatch)
    r = c.get("/..%2F..%2Fetc%2Fpasswd")
    assert r.status_code == 200
    assert "<title>PRISM</title>" in r.text
