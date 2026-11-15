# Quality score

A periodic, honest grade per area. Re-grade when an area changes; link gaps to
[exec-plans/tech-debt-tracker.md](exec-plans/tech-debt-tracker.md). Last reviewed: November 2026.

| Area | Grade | Evidence | Main gaps |
|---|---|---|---|
| Workflow UI | B | 10-step flow, approvals, refinement; reducer and routing tests; 6 of 13 step components have tests | No version history or stale-step markers (TD-04); Story, Focus, Issues, Tensions, Dilemmas, Values and SWOT steps lack component tests (TD-13) |
| Multi-agent pipeline | B | 4 specialists in parallel, QA agents, bounded rewrites, reliability tests | No 429/5xx backoff (TD-07); client generation options unused (TD-05) |
| RAG | B | Hybrid retrieval, user curation, upload hardening, 3 test suites | Uncalibrated cut-off (TD-06); no OCR (TD-09) |
| Data and security | C+ | Key server-side and out of logs; CORS locked; session isolation tested | No accounts (TD-01); ephemeral storage, no retention policy (TD-02, TD-03) |
| Export | B | Word, PowerPoint, Markdown, text; tests | — |
| Deploy and ops | B | Tests gate both deploys; health reports key validity; runbook | Free-tier cold starts (TD-11) |
| Brand and accessibility | B+ | One logo component, lucide icons with ARIA, emoji ban enforced | Mixed product names in older docs (TD-12) |
| Docs and harness | B | `AGENTS.md` map, architecture rules enforced in CI, docs link check | Rules cover layering and icons only; add more as patterns emerge |

Grades: **A** solid and well tested · **B** works, with known gaps · **C** works, with material
risks · **D** fragile or missing.
