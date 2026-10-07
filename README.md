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

## Put it online (free)

The whole product (website and Python engine) runs as one Docker container. The repository includes
`Dockerfile` and `render.yaml`, so Render can build and run it with no settings to type.

1. Sign up at [render.com](https://render.com) with your GitHub account (free, no card needed).
2. In the dashboard choose **New > Blueprint**, pick this repository and the branch that holds this
   code, then **Apply**. Render builds the image (about 5 minutes) and creates the two secret keys.
3. When it says **Live**, open the address it shows, e.g. `https://prism-abcd.onrender.com`.
   Sign in with one of the demo accounts from **Run it** above.

What the free plan means: the server sleeps after 15 minutes without visitors, so the first visit after
that takes 30 to 60 seconds. Each restart builds a fresh database with the catalogue and the five demo
families, so accounts made by visitors don't last. The hosted site runs with `APP_ENV=demo`: HTTPS only,
secure cookies, rate limits, security headers and encryption are on; the `/demo` reset tools are off.

**Keep using prismav.xo.je (InfinityFree).** InfinityFree only runs PHP, so it can't run PRISM, but it
can forward visitors: in `deploy/infinityfree/`, replace `YOUR-APP.onrender.com` with your Render
address in both files, then upload `.htaccess` and `index.html` to `htdocs/` with the InfinityFree File
Manager (delete the files already there first).

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
