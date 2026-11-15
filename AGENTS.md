# AGENTS.md

A map of this repository for coding agents and new contributors. It points to the detail;
it doesn't repeat it. Keep this file short (~100 lines) and keep `docs/` accurate.

## What this is

**Symmetra Systems** — the SRG – Symmetra Systems Design Studio (Systems Realization Group,
Cranfield University). The live product is the **Business Plan Co-Pilot**: a 10-step,
human-in-the-loop workflow that turns a founder's story into an SDG-aligned business plan,
using four specialist AI agents and retrieval-augmented generation over a knowledge base and
the user's own documents.

- App: https://keertishmahen.github.io/business-plan-app/ (React, GitHub Pages)
- API: https://symetra-mia-api.onrender.com (FastAPI + ChromaDB, Docker on Render)
- Model: Gemini 2.5 Flash; embeddings `gemini-embedding-001`

## Repo map

| Path | What lives there |
|---|---|
| `src/components/` | Screens and the 10 workflow steps (`steps/`), dashboard, shared UI |
| `src/hooks/` | Workflow reducer, routing, persistence, voice, tour |
| `src/services/` | **All** network I/O (`geminiClient.js`) and document export |
| `src/constants/` | Prompts, steps, branding, tone, SDG and BMC definitions |
| `src/__harness__/` | Structural tests that enforce the rules below |
| `server_py/app/` | API: `routers/` → `agents/` → `services/` → `config.py` |
| `server_py/tests/` | Backend tests, including `test_architecture.py` |
| `public/brand/` | Logo files (see the brand doc) |
| `docs/` | The system of record — start with the table below |
| `server/` | Retired Node backend; do not use |

## Read before changing

| Doc | When |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Any code change — layers and dependency rules |
| [docs/design-docs/core-beliefs.md](docs/design-docs/core-beliefs.md) | Always — the golden principles |
| [docs/design-docs/brand-and-icons.md](docs/design-docs/brand-and-icons.md) | UI work — logo and icon rules (no emoji) |
| [docs/product-specs/workflow.md](docs/product-specs/workflow.md) | Changing a step, prompt or approval flow |
| [docs/product-specs/about-symmetra.md](docs/product-specs/about-symmetra.md) | Public copy — what may and may not be published |
| [docs/RUNBOOK.md](docs/RUNBOOK.md) | Running, testing, deploying, troubleshooting |
| [docs/QUALITY_SCORE.md](docs/QUALITY_SCORE.md) | Where the weak spots are |
| [docs/exec-plans/index.md](docs/exec-plans/index.md) | Active and completed plans, tech-debt tracker |

## Commands

```bash
npm run test:ci                                   # frontend tests + harness rules
cd server_py && .venv/Scripts/python -m pytest -q # backend tests + architecture rules
CI=true npm run build                             # production build
node scripts/rag-smoke.js <api-url> --no-plan     # end-to-end check against a running API
```

## Rules that CI enforces

- Network I/O only in `src/services/`; `constants/` and `utils/` never import components or hooks.
- No emoji or glyph icons in UI source — use `lucide-react`.
- Backend: only `services/gemini_client.py` makes HTTP calls; env vars only in `config.py`;
  services and agents never import routers; API keys never in URLs.
- Every relative link in `AGENTS.md` and `docs/` resolves, and every doc is listed in its folder's `index.md`.

Failure messages explain the fix. Fix the code; don't loosen the rule without updating the docs.

## Never

- Commit secrets, `.env` files, a local `build/`, or the private PDFs at the repo root.
- Let the browser call Gemini directly in production, or put a key in a URL.
- Publish names, funding, internal dates or unvalidated results (see the about-symmetra spec).
- Let the AI approve on the user's behalf — every step is approved by a person.

## Definition of done

1. Tests and harness rules pass (`npm run test:ci`, `pytest`); `CI=true npm run build` succeeds.
2. Docs updated where behaviour, layers or public copy changed; new debt added to the tracker.
3. Multi-step work has an exec plan in `docs/exec-plans/`, moved to `completed/` when shipped.
4. After deploy: `/api/health` is healthy with `geminiKeyValid: true`.

## Housekeeping

When you touch an area, re-check its grade in `docs/QUALITY_SCORE.md`, delete dead code you
find (and say so in the plan), and close tech-debt items you fix.
