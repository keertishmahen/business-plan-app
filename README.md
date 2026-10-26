# Business Plan Co-Pilot — Nexus MIA

An AI-powered, step-by-step business plan generator built with React and Google Gemini.

## Features

- **9-step guided workflow** — Story → Focus → Issues → Tensions → Dilemmas → Value Props → SWOT → BMC → Business Plan
- **Gemini 2.0 Flash** — fast, high-quality generation at each step
- **Refine at every step** — provide feedback and regenerate without losing context
- **SDG alignment** — colour-coded UN SDG chips throughout
- **Principle 3** — agent shows its inferences before generating, so misreadings are caught early
- **Principle 4** — all LLM output rendered as polished UI, never raw text or JSON
- **Principle 5** — dilemma scores are inspectable (hover to see Severity × Reversibility × Reach)
- **Export** — Word (.docx) with SWOT + BMC appendices, plain text, and print-to-PDF

## Getting Started

### 1. Prerequisites

- Node.js 18+
- A free Gemini API key from [aistudio.google.com](https://aistudio.google.com/app/apikey)

### 2. Install

```bash
npm install
```

### 3. Run

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000), enter your Gemini API key, and start co-creating.

### 4. Build for production

```bash
npm run build
```

The `build/` folder contains the static site — deploy to Vercel, Netlify, or any static host.

### 5. Hosting (free, deployed from GitHub)

Every push to `main` deploys through GitHub Actions:

| Piece | Host | Workflow |
|---|---|---|
| React frontend | GitHub Pages — https://keertishmahen.github.io/business-plan-app/ | [deploy-frontend.yml](.github/workflows/deploy-frontend.yml) |
| FastAPI backend | Hugging Face Docker Space — https://keertishmahen-symetra-mia-api.hf.space | [deploy-backend.yml](.github/workflows/deploy-backend.yml) (runs when `server_py/**` changes) |

Repo secrets: `HF_TOKEN` (Hugging Face write token) and `GEMINI_API_KEY`. Repo variables: `RAG_URL` (API URL baked into the frontend), plus optional `HF_SPACE` and `CORS_ORIGIN`. The Space sleeps after 48h idle; the first request after that takes about a minute while it wakes. Per-session uploads don't survive a restart, but the knowledge base reseeds itself.

Never upload a locally built `build/` folder: a local `.env` can bake `REACT_APP_GEMINI_API_KEY` into it. The Azure deploy script ([scripts/deploy-azure.ps1](scripts/deploy-azure.ps1)) is kept as a fallback.

## Project Structure

```
src/
├── App.jsx                        # Main orchestrator — state, routing, API calls
├── index.js                       # React entry point
├── index.css                      # Global styles & CSS variables
├── constants/
│   ├── steps.js                   # Step metadata, SDG colours, driver styles
│   └── prompts.js                 # All Gemini prompt functions (one per step)
├── utils/
│   ├── gemini.js                  # Gemini API client + JSON parser
│   └── export.js                  # Word (.docx) + plain text export
└── components/
    ├── ApiKeyScreen.jsx            # Landing / API key entry
    ├── StepNav.jsx                 # Progress stepper at the top
    ├── shared/
    │   ├── SDGChip.jsx             # SDG colour badge
    │   ├── FeedbackBar.jsx         # Refine + Approve bar (all steps)
    │   └── LoadingState.jsx        # Spinner
    └── steps/
        ├── StoryStep.jsx           # Free-text story input
        ├── FocusStep.jsx           # Driver & Focus + inference card
        ├── IssuesStep.jsx          # Issues per focus area
        ├── TensionsStep.jsx        # Interactive tension matrix
        ├── DilemmasStep.jsx        # Ranked dilemmas with inspectable scores
        ├── ValuesStep.jsx          # Value propositions
        ├── SwotStep.jsx            # SWOT analysis + selection
        ├── BMCStep.jsx             # Business Model Canvas (9 blocks)
        └── BusinessPlanStep.jsx    # Full plan + export
```

## Design Principles Implemented

| Principle | Description | Where |
|-----------|-------------|-------|
| 1 · Make co-creation legible | Refinement actions tied to each step | `FeedbackBar.jsx` |
| 2 · Speak the user's language | Plain-English subtitles, tooltip definitions | `steps.js`, `StepNav.jsx` |
| 3 · Show what the agent inferred | Inference card before generation | `FocusStep.jsx` |
| 4 · Render outputs as readable artefacts | Structured UI, never raw text | All step components |
| 5 · Make ranking and codes inspectable | Hover score breakdown, SDG chips | `DilemmasStep.jsx`, `SDGChip.jsx` |

## Environment

No `.env` file needed. The Gemini API key is entered at runtime and kept in React state only.

## Credits

- Business methodology: Dilemma Triangle (People · Planet · Prosperity)
- BMC: Osterwalder & Pigneur (2010)
- Design principles: Milisavljevic-Syed (2025), Ashtari et al. (2025)
- AI: Google Gemini 2.0 Flash
