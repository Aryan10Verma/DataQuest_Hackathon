#!/usr/bin/env python3
"""Run the whole PRISM product with one command: python start.py  ->  http://localhost:8000

First run: creates the backend virtualenv, installs dependencies, writes backend/.env, seeds the
database with the demo families, and builds the website. Later runs skip what is already done.

Options:
  --rebuild      rebuild the website even if frontend/dist exists
  --reset-data   wipe the database and seed it again
  --port N       serve on another port (default 8000)
  --dev          development: API on :8000 plus the Vite dev server with hot reload on :5173
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import venv
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
WINDOWS = os.name == "nt"
VENV = BACKEND / ".venv"
PY = VENV / ("Scripts/python.exe" if WINDOWS else "bin/python")
NPM = shutil.which("npm.cmd" if WINDOWS else "npm")

# Local product defaults. DEMO_MODE turns on the demo endpoints judges use; DEMO_TODAY freezes "today"
# so exam and scholarship deadlines in the seed data never slip into the past during a demo.
ENV_OVERRIDES = {
    "MOCK_MODE": "false",
    "DEMO_MODE": "true",
    "DEMO_TODAY": "2026-10-07",
    "RATE_LIMIT_PER_MINUTE": "600",
    "CORS_ORIGINS": "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000",
}


def step(msg: str) -> None:
    print(f"\n\033[36m›\033[0m {msg}", flush=True)


def run(cmd: list[str | Path], cwd: Path) -> None:
    subprocess.run([str(c) for c in cmd], cwd=cwd, check=True)


def ensure_backend() -> None:
    if not PY.exists():
        step("Creating the Python environment (backend/.venv)")
        venv.EnvBuilder(with_pip=True).create(VENV)
    try:
        subprocess.run([str(PY), "-c", "import fastapi, sqlalchemy, argon2"], check=True, capture_output=True)
    except subprocess.CalledProcessError:
        step("Installing backend dependencies")
        run([PY, "-m", "pip", "install", "-q", "-e", ".[dev]"], BACKEND)

    env_file = BACKEND / ".env"
    if not env_file.exists():
        step("Writing backend/.env")
        lines = (BACKEND / ".env.example").read_text(encoding="utf-8").splitlines()
        out = []
        for line in lines:
            key = line.split("=", 1)[0]
            out.append(f"{key}={ENV_OVERRIDES.pop(key)}" if key in ENV_OVERRIDES else line)
        out += [f"{k}={v}" for k, v in ENV_OVERRIDES.items()]
        env_file.write_text("\n".join(out) + "\n", encoding="utf-8")


def ensure_data(reset: bool) -> None:
    if reset or not (BACKEND / "prism.db").exists():
        step("Seeding the database with the catalogue and five demo families")
        run([PY, "scripts/seed.py", "--demo", "--reset"], BACKEND)


def ensure_frontend(rebuild: bool, build: bool = True) -> None:
    if NPM is None:
        sys.exit("npm was not found. Install Node.js 18 or newer from https://nodejs.org and run this again.")
    if not (FRONTEND / "node_modules").exists():
        step("Installing website dependencies")
        run([NPM, "ci", "--no-audit", "--no-fund"], FRONTEND)
    if build and (rebuild or not (FRONTEND / "dist" / "index.html").exists()):
        step("Building the website")
        run([NPM, "run", "build"], FRONTEND)


def main() -> None:
    ap = argparse.ArgumentParser(description="Run PRISM locally.")
    ap.add_argument("--rebuild", action="store_true")
    ap.add_argument("--reset-data", action="store_true")
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--dev", action="store_true")
    args = ap.parse_args()

    ensure_backend()
    ensure_data(args.reset_data)
    ensure_frontend(args.rebuild, build=not args.dev)

    uvicorn = [PY, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", str(args.port)]
    if args.dev:
        step("Development mode: API on http://localhost:8000, website on http://localhost:5173")
        api = subprocess.Popen([str(c) for c in uvicorn + ["--reload"]], cwd=BACKEND, env={**os.environ, "FRONTEND_DIST": "none"})
        try:
            run([NPM, "run", "dev"], FRONTEND)
        finally:
            api.terminate()
        return

    step(f"PRISM is running at http://localhost:{args.port}  (Ctrl+C to stop)")
    print("  Demo sign-in: creative_risk_averse.parent@prism.example / Prism@Demo2026 (more in README.md)")
    try:
        run(uvicorn, BACKEND)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
