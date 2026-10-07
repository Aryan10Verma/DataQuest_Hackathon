# PRISM Engine — DataQuest 3.0

Multi-dimensional STEAM career guidance and hyper-local innovation platform, for Indian Grade 9–12 students and their parents.

A student answers a 25-minute questionnaire, and parents privately add the family budget and their hopes. PRISM then ranks careers on six weighted parts: fit, job market, affordability, return on cost, family agreement and automation risk. It also produces:
- a costed plan for each course, with scholarships and loans;
- a parent–student conversation guide;
- a what-if simulator;
- a five-year roadmap;
- real problems to work on in the student's own district.

Every figure shows its source and whether it has been checked.

## Run it

You need Python 3.11 or newer and Node.js 18 or newer.

```sh
python start.py
```

Then open **http://localhost:8000** and sign in with `creative_risk_averse.parent@prism.example`, password `Prism@Demo2026`. More demo accounts are listed in `frontend/README.md`.

The first run takes a few minutes:
1. It creates `backend/.venv` and installs the API.
2. It writes `backend/.env`.
3. It seeds a SQLite database with the catalogue and five demo families.
4. It builds the website.

Later runs start straight away.

| Option | Use |
|---|---|
| `python start.py --dev` | Development: API on :8000, website with hot reload on :5173 |
| `python start.py --rebuild` | Rebuild the website after changing it |
| `python start.py --reset-data` | Wipe the database and seed it again |
| `python start.py --port 9000` | Serve on another port |

## What's here

- `frontend/`: the website (React, TypeScript, Vite). See `frontend/README.md`.
- `backend/`: the FastAPI service and scoring engine. It also serves the built website. See `backend/README.md`.
- `design/`: the design plan (`PLAN.md`), plus the motion and style references the website follows.
- `docs/ARCHITECTURE.md`: assumptions, layering, MOCK_MODE, folder tree.
- `docs/ER_DIAGRAM.md`: database design (Mermaid).
- `docs/API_CONTRACT.md`: endpoint list, examples, privacy matrix.
- `docs/DEMO_PLAN.md`: demo script, fail-safes, persona switcher, judge Q&A.
- `docs/DATA_TRUTH.md`: what "real-time" means here, how every figure is checked, sources, pre-demo audit.
- `docs/QUESTIONNAIRE.md`: the 74-item questionnaire, scoring, quality checks, pilot plan.
- `backend/contracts/`: frozen OpenAPI spec and example JSON for every endpoint.

## Checks

```sh
cd backend && .venv/bin/pytest && .venv/bin/ruff check .        # API: 187 tests
cd frontend && npm test && npm run lint && npm run build        # website
```
