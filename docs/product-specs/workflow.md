# Business Plan Co-Pilot — workflow

The live application: a guided path from a founder's story to an SDG-aligned, exportable
business plan. Step order is `STEP_ORDER` in `src/constants/steps.js`; prompts are in
`src/constants/prompts.js`.

| # | Step | Produces | What the user controls |
|---|---|---|---|
| 1 | Story | The idea in the founder's words | Free text or guided chat (voice supported); confirms or corrects five inferred facts in the read-back |
| 2 | Driver & Focus | Three focus areas (People, Planet, Prosperity) | Refine with feedback; approve |
| 3 | Issues | 3–4 issues per focus area | Refine; approve |
| 4 | Tension Matrix | Conflicts between drivers | Mark tensions resolved; refine; approve |
| 5 | Dilemmas & Ranking | Four ranked trade-offs with scores | Drag to re-rank; refine; approve |
| 6 | Value Propositions | 2–3 responses to the top dilemmas | Refine; approve |
| 7 | SWOT | A SWOT per proposition + AI recommendation | Edit items; **must choose** a proposition (override is noted) |
| 8 | Business Model Canvas | 11-block canvas incl. social/environmental cost and benefit | Edit items in every block |
| 9 | RAG Evidence | Curated evidence set + Six Capitals profile | Upload documents; include/exclude each item; re-run; re-assess |
| 10 | Business Plan | 10-section plan | Refine; export to Word, PowerPoint, Markdown or text |

An SDG alignment map is generated after the canvas and the plan; the user can override each status.

## Human-in-the-loop rules

- Nothing moves to the next step without the user's approval. Approving builds the next prompt
  from the current outputs, including every edit (`buildContext()` in `src/App.jsx`).
- Refinement keeps the step's JSON schema (`PROMPTS.refine`) and runs through the full multi-agent pipeline.
- The plan is grounded only on the evidence the user kept in step 9 (`curatedContext`).
- Approved steps stay editable; there is no locking or version history yet
  (see [../exec-plans/tech-debt-tracker.md](../exec-plans/tech-debt-tracker.md)).
