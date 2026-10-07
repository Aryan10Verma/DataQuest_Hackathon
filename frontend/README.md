# PRISM website

The PRISM frontend: a React + TypeScript single-page app built with Vite. It talks to the FastAPI backend in `../backend` through the `/api/v1` envelope.

The design is described in `../design/PLAN.md`: dark only, one cyan accent, and the six score colours used only inside charts. The landing page is a scroll-driven scan of a holographic body, where each view is one part of the questionnaire.

## Run it

The easiest way is from the repository root, which runs everything on one port:

```sh
python start.py          # http://localhost:8000
```

For frontend development with hot reload:

```sh
python start.py --dev    # API on :8000, website on http://localhost:5173 (proxied to the API)
```

Or by hand:

```sh
cd frontend
npm ci
npm run dev              # needs the API running on :8000
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on :5173, proxying `/api` to :8000 |
| `npm run build` | Type-check and build to `dist/` (FastAPI serves this folder) |
| `npm run lint` | ESLint |
| `npm test` | Vitest: money formatting, the API envelope, score bar layout |
| `npm run types` | Regenerate `src/api/schema.ts` from `../backend/contracts/openapi.json` |
| `npm run fixtures` | Copy `../backend/contracts/fixtures/*.json` into `src/fixtures` |

## Settings (`.env`, see `.env.example`)

| Variable | Values | Meaning |
|---|---|---|
| `VITE_API_URL` | empty (default) or a URL | Where the API lives. Empty means same origin. |
| `VITE_AUTH_MODE` | `live` (default) or `mock` | `mock` skips sign-in and sends `X-Mock-Role` (developers only) |
| `VITE_DATA_MODE` | `api` (default) or `fixtures` | `fixtures` answers from `src/fixtures` with no server at all. It is the safety net for a failed network on stage. Sign in with any password; the role comes from the email (`…parent@…`, `…educator@…`, `…admin@…`). |
| `VITE_DEV_TOOLS` | unset (default) or `true` | Adds the developer panel and presenter mode. Unset, none of that code is in the build. |

Mock auth and fixture data are compiled in only when their variables are set, so a normal build contains no demo or mock code:

```sh
npm run build && grep -rli "persona\|X-Mock-Role\|presenter" dist/   # finds nothing
```

## Deploy

- **With the backend:** build, then run the API. It serves `frontend/dist` automatically. Set `FRONTEND_DIST` in `backend/.env` to point elsewhere, or `none` for an API-only server.
- **Static host (Vercel, Netlify):**
  1. Build with `VITE_API_URL=https://your-api.example`.
  2. Add the site's URL to the backend's `CORS_ORIGINS`.
  3. Rewrite all paths to `/index.html` so client-side routes work.
- **Offline copy:** `VITE_DATA_MODE=fixtures npm run build` gives a build that needs no server.

## Layout

```
src/
  api/          client.ts (envelope, auth, refresh), hooks.ts (TanStack Query), fixtures.ts, generated types
  auth/         session: sign-in, roles, which student and run a screen is about
  components/   ScoreBar, FundingMeter, ConfidenceChip, TrustBadge, ProvenanceBadge, Ring, …
  landing/      the scroll-driven scan (GSAP + ScrollTrigger + Lenis)
  pages/        one file per screen
  shell/        top bar, the text rail (desktop) and bottom bar (phones)
  devtools/     developer panel and presenter mode (only with VITE_DEV_TOOLS=true)
public/scan/    the five body views
scripts/        copy-fixtures.mjs, cut_views.py
```

## The body scan images

The five views in `public/scan/` come from one 988×394 concept image (`../design/reference/anatomy/scan-sheet-original.webp`). To make them sharp:
1. The image was upscaled 4× with Real-ESRGAN (`realesrgan-x4plus`, run on the CPU through ncnn) to `scan-sheet-4x.webp`.
2. Each view was cut out of the upscaled image. The baked-in UI boxes were painted out, and the dark background was turned into transparency so the giant headline can sit behind the body:

```sh
python scripts/cut_views.py ../design/reference/anatomy/scan-sheet-4x.webp public/scan 4   # needs Pillow
```

## Developer and judging

The backend's demo seed (`python start.py` runs it) creates five families. Every account's password is `Prism@Demo2026`.

| Family | Student | Parent | Shows |
|---|---|---|---|
| Ananya, Coimbatore | `creative_risk_averse.student@prism.example` | `creative_risk_averse.parent@prism.example` | Family conversation, bridge careers |
| Karthik, Madurai | `high_aptitude_low_budget.student@prism.example` | `high_aptitude_low_budget.parent@prism.example` | Scholarships make a course affordable |
| Meena, Dharmapuri | `rural_steam_innovator.student@prism.example` | `rural_steam_innovator.parent@prism.example` | Local problems near you |
| Rahul, Pune | `loan_dependent_family.student@prism.example` | `loan_dependent_family.parent@prism.example` | Loans, monthly payments, what-if |
| Sara, Bengaluru | `aligned_family.student@prism.example` | `aligned_family.parent@prism.example` | Low family difference |

Also `counsellor@prism.example` (counsellor dashboard) and `admin@prism.example` (analytics).

For judging, a build with `VITE_DEV_TOOLS=true` adds a **Dev** button with one-click demo sign-in, plus presenter mode at `/presenter`. Presenter mode steps through the backend's scripted walkthrough and moves the app to the matching screen.
