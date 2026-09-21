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
