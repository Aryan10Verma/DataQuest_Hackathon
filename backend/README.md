# PRISM Engine — Backend

FastAPI backend for **PRISM Engine: Multi-Dimensional STEAM Career Guidance & Hyper-Local Innovation Platform**
(DataQuest 3.0). Current status: real scoring engine, database, seed catalog and login are done (Phases 0-5).

## Quick start (MOCK_MODE, no database)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env            # MOCK_MODE=true by default
uvicorn app.main:app --reload   # http://localhost:8000/docs
```

```bash
curl -s localhost:8000/api/v1/system/health | jq
curl -s -X POST localhost:8000/api/v1/analysis/runs -H 'Content-Type: application/json' \
     -H 'X-Mock-Role: parent' -d '{"student_id":"132394f2-e097-5d31-8e5b-bfa2fade9b38"}' | jq '.data.recommendations[0]'
curl -s -X POST localhost:8000/api/predict -H 'Content-Type: application/json' -d '{}' | jq
```

## Live mode (database + real engine)

```bash
python scripts/seed.py                 # migrate + load data/seed/*.json (what a real deployment runs)
python scripts/seed.py --demo --reset  # development / judging only: also create 5 demo families (~4 s)
MOCK_MODE=false uvicorn app.main:app --reload
curl -s -X POST localhost:8000/api/v1/auth/login -H 'Content-Type: application/json' \
     -d '{"email":"creative_risk_averse.parent@prism.example","password":"Prism@Demo2026"}' | jq .data.access_token
```

SQLite is the default (`DATABASE_URL=sqlite:///./prism.db`). For PostgreSQL set
`DATABASE_URL=postgresql+psycopg://...`; Postgres also gets immutability triggers on runs and the
admin analytics materialized view.

Demo tools are for developers and judges only and are off by default. Set `DEMO_MODE=true` (optionally
`DEMO_TODAY=2026-10-07`) to enable `/api/v1/demo/*`, which lists the demo logins. `APP_ENV=production`
refuses to start with `DEMO_MODE` or `MOCK_MODE` on, and `seed.py --demo` refuses to run there.
Fees are stored on each pathway row per quota (government / management), not on the institution.

## The website

`python ../start.py` from the repository root sets everything up and serves the whole product on
http://localhost:8000. When `../frontend/dist` exists (after `npm run build`), this API serves it next to
`/api`. Set `FRONTEND_DIST` to use another folder, or `none` for an API-only server. The rate limit applies
to `/api` paths only.

## For teammates

- **Frontend (Person 1)**: build against `contracts/fixtures/*.json` or the running mock server. Shapes are
  identical to live mode. Use the `X-Mock-Role` header to see the student and parent views.
- **ML (Person 3)**: put a `predict(vector: dict[str, float]) -> dict` in a `.py` file and set
  `ML_MODEL_PATH=/path/to/model.py`. Input: the 19 canonical dimensions (`app/core/dimensions.py`).
  Output: `{"scores": {domain: 0..1}, "confidence": 0..1}` (the flat or `domain_scores` shapes also work).
  If the model is missing or fails, the API falls back to a deterministic cosine model.

## Data and questionnaire tools

```bash
python scripts/data_audit.py --demo --strict     # quality gates + figures the demo still shows unchecked
python scripts/pilot_analysis.py responses.csv   # item analysis after a questionnaire pilot
```

Optional live job-postings feed: set `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` (free at developer.adzuna.com).
If the demo network blocks the API, fetch on any open connection and import offline:

```bash
python scripts/market.py fetch --out data/market/postings.csv   # on a hotspot / at home
python scripts/market.py import data/market/postings.csv        # on the demo machine, no internet needed
```

Each import publishes a new dataset version; older runs stay reproducible and are flagged `is_outdated`.

## Plain-language summaries (optional language model)

`GET /api/v1/analysis/runs/{id}/narrative?lang=en|ta|hi` explains a run in English, Tamil or Hindi.
With `GROK_API_KEY` set, xAI Grok (or any OpenAI-compatible endpoint via `GROK_BASE_URL`) rephrases it.
The model only receives the anonymised `facts` shown in the response; an answer with any number not in
those facts is rejected. Without a key, or when the network blocks the call, fixed templates are used.
The language model never scores careers: ranking stays deterministic and reproducible.

## Real-world follow-through

Deadline reminders (calendar file, SMS / WhatsApp outbox), printable family report in Tamil and Hindi,
counsellor dashboard, outcome follow-up, fairness report, loan explainer, mentors and partner-school
local problems: see `../docs/REAL_WORLD.md`.

```bash
python scripts/send_reminders.py                       # send reminders due today (REMINDER_PROVIDER)
python scripts/local_problems.py data/partners/local_problems_template.csv
```

## Where people live

PRISM covers 24 Indian cities (`data/seed/regions.json`). `data/seed/places.json` says what each is
known for: sector strengths that scale national job demand for that city (estimates, marked as such
everywhere), its main industries and its languages.

- Sign-up takes an optional `region_code` and `pincode`; `PUT /api/v1/auth/me/location` changes them.
- `GET /api/v1/places` (public) lists the cities with their industries and languages.
- `GET/PUT /api/v1/students/me/place` holds the student's "Where you live" answers: interest in each
  local industry (1 to 5), how far they'd move (`home`, `state`, `india`, `abroad`), languages, and
  whether family needs them nearby (`none`, `some`, `strong`). These set willingness to relocate and go
  abroad (capped by home commitments), preferred cities in the same state, and a local pull: job
  demand at home counts up to double for careers in the sectors they liked.
- `GET /api/v1/market/map` (public) summarises demand per city for the map.

When the seed files change, `scripts/seed.py` loads them as a new catalogue version on the next start.

## Security

| Area | What is in place |
|---|---|
| Secrets | API keys, the token-signing secret and the encryption key live only in `backend/.env` (git-ignored, never sent to the website). `start.py` generates random values on first run. `APP_ENV=production` refuses to start with a placeholder secret, without `DATA_ENCRYPTION_KEY`, or with demo/mock mode on. |
| Sign-in | Passwords hashed with argon2id. Accounts lock for 15 minutes after 5 wrong passwords. Sign-in, sign-up and refresh are limited to `AUTH_RATE_LIMIT_PER_MINUTE` per IP (default 10), the rest of the API to `RATE_LIMIT_PER_MINUTE`. Unknown emails and wrong passwords get the same answer in the same time. |
| Sessions | Access tokens last 30 minutes and live only in page memory. The refresh token is an `HttpOnly; Secure; SameSite=Strict` cookie scoped to `/api/v1/auth`, rotated on every use; reuse of an old one revokes the whole sign-in. `POST /api/v1/auth/logout` revokes it. API clients that can't hold cookies still get both tokens in the body. |
| Access to records | Every route needs a bearer token except sign-in, sign-up, public reference data (career catalogue, questionnaire items, loan calculator, methodology, data status) and the `/demo` routes, which exist only with `DEMO_MODE=true`. Each record is checked against the caller: students see their own, parents their family, counsellors their assigned students, admins only k-anonymised totals. Roles are enforced on the server, never by the website. |
| Input | Every request body is a strict schema (unknown fields rejected, lengths and ranges bounded). Bodies over `MAX_BODY_BYTES` are refused. All database access goes through SQLAlchemy with bound parameters; no SQL is built from strings. |
| Output | Responses are filtered through response models (no password hashes, no internal fields). The HTML report escapes every value; React escapes everything it renders. Unexpected errors return a generic message. API docs are off in production. |
| Encryption at rest | Phone numbers and free-text outcome notes are encrypted with Fernet (`DATA_ENCRYPTION_KEY`). Money figures stay plain because the database checks them; protect the database volume itself with disk encryption in production. |
| Headers | Content-Security-Policy (scripts only from this server), `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy, a locked-down permissions policy and `Cache-Control: no-store` on the API. HSTS when HTTPS is on. |
| HTTPS | `FORCE_HTTPS` (on by default in production) redirects http to https. Behind a proxy that ends TLS, run uvicorn with `--proxy-headers`. |
| Bots | Per-IP limits on sign-up and sign-in, plus a hidden form field that only bots fill in. For public launch, add a CAPTCHA such as Cloudflare Turnstile (needs a site key). |
| Uploads | The API accepts no file uploads. Static files are served only from the built website folder. |
| Dependencies | `.github/workflows/security.yml` runs gitleaks over the full git history, `pip-audit`, the backend tests and `npm audit` on every push and weekly; Dependabot opens update pull requests. |

On SQLite there is no row-level security in the database; the record checks above are done by the API on every request and covered by `tests/test_live.py` and `tests/test_security.py`.

## Tests & lint

```bash
pytest                 # contracts, engine properties, fairness, golden personas, live mode
ruff check . && ruff format --check .
python scripts/export_contracts.py   # regenerate contracts/openapi.json + fixtures
```

Docs: `../docs/ARCHITECTURE.md`, `../docs/ER_DIAGRAM.md`, `../docs/API_CONTRACT.md`, `../docs/REAL_WORLD.md`.
