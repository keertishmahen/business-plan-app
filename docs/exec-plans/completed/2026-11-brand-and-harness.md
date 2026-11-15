# Exec plan: Symmetra brand, professional icons, About page, harness engineering

**Status:** completed · **Window:** November 2026

## Goal

1. Put the Symmetra Systems logo on every screen and as the favicon.
2. Replace emoji / glyph icons with lucide-react icons.
3. Rewrite the main page around Symmetra Systems and its goals, from the studio brief.
4. Apply harness-engineering practices so coding agents (and people) can work in the repo reliably.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Main-page content | Public-safe summary of the brief | The brief is internal: no names, funding, dates or unvalidated targets on a public site |
| Positioning | Studio first; Business Plan Co-Pilot as the live tool; Change Impact "in development" | Matches what actually exists today |
| Colours | Keep the green theme; add the logo as-is | Green came from capstone feedback; teal sits close enough |
| SDG chips | Colour swatch instead of emoji | Keeps the full "SDG n · name" label (tests and readability) without emoji |
| Exports | Plain-text headings in Markdown | Professional documents; Word/PowerPoint already emoji-free |
| Harness reference | OpenAI "Harness engineering" post via OpenAI's summary and secondary write-ups | The article itself returned HTTP 403 to automated fetches |

## Progress log

- Logo cut out from the supplied master (background → alpha); lockup, mark, favicon, touch icon.
- `BrandLogo` component; placed on main page, dashboard, guided input, API-key screen, loading screen, resume dialog.
- ~60 emoji/glyph icons replaced across 25 files; SDG emoji removed; Markdown export headings plain.
- Main page rewritten: About, Goals, Principles, Co-pilot (available now), Change Impact (in development).
- `STEP_ORDER` moved to `constants/steps.js` (layering fix); two unused components deleted.
- Harness: `AGENTS.md`, `docs/` knowledge base, frontend and backend structural tests with fix-it
  messages, docs integrity test. Each rule was shown to fail on a deliberate violation.

## Follow-ups

Tracked in [../tech-debt-tracker.md](../tech-debt-tracker.md) (TD-10 extends the key-in-URL rule to the frontend).
