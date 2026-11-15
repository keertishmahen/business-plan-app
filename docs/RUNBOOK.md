# Runbook

How to run, check and deploy the app. No secrets belong in this file or anywhere in the repo.

## Run locally

```bash
# Backend (FastAPI on :3002)
cd server_py
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt     # macOS/Linux: .venv/bin/pip
# create server_py/.env (git-ignored) with GEMINI_API_KEY=... and optionally GEMINI_CHAT_MODEL=gemini-2.5-flash
.venv/Scripts/python -m uvicorn app.main:app --port 3002

# Frontend (React on :3000) — talks to http://localhost:3002 by default
npm install
npm start
```

## Check your change

| Command | What it runs |
|---|---|
| `npm run test:ci` | All frontend tests, including the harness rules in `src/__harness__/` |
| `cd server_py && .venv/Scripts/python -m pytest -q` | All backend tests, including `tests/test_architecture.py` |
| `CI=true npm run build` | Production build (warnings fail the build in CI) |
| `node scripts/rag-smoke.js <api-url> [--no-plan]` | End-to-end check of RAG, uploads and plan generation against a running API |

A harness failure message names the rule and how to fix it; follow it rather than weakening the test.

## Deploy

Push to `main`. GitHub Actions then:

- **Deploy frontend (GitHub Pages)** — runs on changes outside `server_py/`: tests → build → Pages.
- **Backend tests** — runs on `server_py/**`; when it passes, Render rebuilds the API from
  `render.yaml` (`autoDeployTrigger: checksPass`).

Live URLs: app `https://keertishmahen.github.io/business-plan-app/`, API `https://symetra-mia-api.onrender.com`.

## Verify a deployment

```bash
curl https://symetra-mia-api.onrender.com/api/health
```

Expect `"status": "healthy"`, 93 knowledge documents across the five knowledge collections, and
`"geminiKeyValid": true`. The first call after ~15 minutes idle can take about a minute (free tier).

## Common problems

| Symptom | Cause | Fix |
|---|---|---|
| `geminiKeyValid: false`, generation errors "API key not valid" | Gemini key on Render revoked or wrong | Render → `symetra-mia-api` → Environment → update `GEMINI_API_KEY` → save and redeploy |
| Frontend stuck on "Connecting to the Symmetra Systems server…" | API asleep or down | Wait a minute; check `/api/health` and the Render logs |
| CORS error in the browser console | Origin not in `CORS_ORIGIN` (`render.yaml`) | Add the origin there and redeploy |
| Uploaded documents missing after a while | Free-tier restart cleared the disk (TD-03) | Re-upload; the UI warns about this |
