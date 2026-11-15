# Tech-debt tracker

Known gaps, ordered by impact. Add an entry when you knowingly leave something imperfect;
close it (move to "Resolved") when it is fixed. Grades in [../QUALITY_SCORE.md](../QUALITY_SCORE.md) reference these IDs.

| ID | Area | Debt | Impact | Proposed fix |
|---|---|---|---|---|
| TD-01 | Security | No user accounts; a browser-generated session ID is the only isolation key | Anyone holding an ID could list or delete that session's uploads | Accounts or signed session tokens |
| TD-02 | Data | Session ID is not persisted; a resumed session gets a new one | Uploads must be re-added after a reload (UI warns) | Persist the ID with the saved session |
| TD-03 | Data | Render free tier disk is ephemeral; no retention policy or "delete my data" endpoint | Server-side outputs and uploads vanish on restart; no explicit deletion | Persistent store + TTL + session delete endpoint |
| TD-04 | UX | No version history or step locking; editing an earlier step doesn't flag later ones as stale | Users can't undo; later steps may be out of date | Wire up `useVersionHistory` / `VersionHistoryTimeline` (exist, unused) and add stale markers |
| TD-05 | LLM | Frontend sends `temperature` / `maxTokens`, backend ignores them | Misleading options | Honour or remove them |
| TD-06 | RAG | Relevance cut-off (cosine distance 1.5) filters very little | Weak passages can reach prompts | Calibrate against test queries |
| TD-07 | LLM | No backoff on Gemini 429/5xx | Transient errors surface as failures | Exponential backoff in `gemini_client.py` |
| TD-08 | Prompts | Tone directive not applied to SDG mapping, follow-up questions, Six Capitals, upload suggestions | Inconsistent register | Apply tone centrally to every prompt |
| TD-09 | RAG | Scanned PDFs (images only) yield no text | Uploads rejected | OCR |
| TD-10 | Security | Local-dev-only direct Gemini path in `src/services/geminiClient.js` puts the key in the URL | Dev key visible in browser history (never used in production) | Send `x-goog-api-key` header; extend the architecture test to the frontend |
| TD-11 | Ops | Free tier sleeps after 15 min; ~1 min cold start | First request after idle is slow (loading screen explains it) | Paid instance or keep-warm schedule |
| TD-13 | Tests | Story, Focus, Issues, Tensions, Dilemmas, Values and SWOT step components have no component tests | UI regressions in those steps go unnoticed | Add React Testing Library tests per step |
| TD-12 | Naming | Mixed names: "Symmetra Systems" (UI), "Symetra MIA" (service/infra), "Nexus MIA" (README title, `.kiro/` specs) | Confusing for readers | Settle names in a docs/README pass; infra names can stay |

## Resolved

| ID | Debt | Resolved |
|---|---|---|
| — | `utils/appRoutes.js` imported `STEP_ORDER` from a hook | Moved to `src/constants/steps.js` (Nov 2026) |
| — | Unused `ReflectionCard.jsx`, `StorySummary.jsx` | Deleted (Nov 2026) |
| — | Health reported "healthy" with a revoked Gemini key | `geminiKeyValid` added (Nov 2026) |
