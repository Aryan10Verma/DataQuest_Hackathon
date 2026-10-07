# The whole PRISM product in one container: the website is built with Node, then served by the
# Python engine next to the API. Used by Render (render.yaml) and any host that runs Docker.

# ---- 1. Build the website
FROM node:22-slim AS web
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ---- 2. Run the engine and serve the website
FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    # A public demo, not production: the five demo families (published password) are created, so the
    # production guard against demo accounts is not used. Everything else that matters online is on:
    # HTTPS only, secure cookies, rate limits, headers, encryption. The /demo reset tools stay off.
    APP_ENV=demo \
    FORCE_HTTPS=true \
    MOCK_MODE=false \
    DEMO_MODE=false \
    DATABASE_URL=sqlite:///./prism.db \
    PORT=8000
WORKDIR /app/backend
COPY backend/pyproject.toml backend/README.md ./
COPY backend/app ./app
RUN pip install --no-cache-dir .
COPY backend/ ./
COPY --from=web /app/frontend/dist /app/frontend/dist
RUN useradd --system --uid 10001 prism && chown -R prism /app/backend
USER prism
EXPOSE 8000
# The free tier has no lasting disk, so each start builds a fresh database: the catalogue plus the five
# demo families. --proxy-headers lets the app see the visitor's real address and that they used https.
CMD ["sh", "-c", "python scripts/seed.py --demo --reset && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*'"]
