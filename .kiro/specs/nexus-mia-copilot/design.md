# Design Document

## Overview

This design describes the complete architecture for the Nexus MIA Business Model Co-Pilot — a React 18 single-page application that guides users through a 9-step AI-assisted workflow to co-create SDG-aligned business plans. The rebuild transforms the existing Streamlit prototype into a production-quality React app with conversational input, rich visualizations, version history, multi-format export, and full accessibility compliance.

## Architecture

### System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  Browser (React 18 SPA)                                              │
│                                                                       │
│  ┌─────────────┐   ┌──────────────────┐   ┌───────────────────────┐ │
│  │ Onboarding  │   │  Guided Input    │   │  Step Workflow Engine  │ │
│  │ Screen      │──>│  (4 phases)      │──>│  (9 steps)            │ │
│  └─────────────┘   └──────────────────┘   └───────────────────────┘ │
│                                                    │                  │
│  ┌─────────────────────────────────────────────────┼────────────┐   │
│  │ State Layer                                     │            │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────┴──────┐     │   │
│  │  │ WorkflowState│  │ AuditTrail   │  │ VersionHistory│     │   │
│  │  │ (useReducer) │  │ (append-only)│  │ (per-step)    │     │   │
│  │  └──────────────┘  └──────────────┘  └───────────────┘     │   │
│  │                                                              │   │
│  │  ┌──────────────┐  ┌──────────────┐                         │   │
│  │  │ localStorage │  │ Context API  │                         │   │
│  │  │ Persistence  │  │ (theme/prefs)│                         │   │
│  │  └──────────────┘  └──────────────┘                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Service Layer                                                 │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │   │
│  │  │ GeminiClient │  │ ExportModule │  │ VoiceInputService│   │   │
│  │  │ (API calls)  │  │ (docx/pptx)  │  │ (Web Speech API) │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
                         │
                         │ HTTPS (REST)
                         ▼
        ┌────────────────────────────────┐
        │  Google Gemini 2.0 Flash API   │
        │  generativelanguage.googleapis │
        └────────────────────────────────┘
```

### Component Hierarchy

```
App
├── OnboardingScreen
│   ├── CapabilityCards (3 cards)
│   ├── GlossaryPreview
│   ├── StepProgressPreview
│   └── CTAButtons (Take a tour / Start co-creating)
├── GuidedInput
│   ├── PhaseIndicator (4 phases)
│   ├── ChatInterface
│   │   ├── AIMessage
│   │   ├── UserMessage
│   │   └── ReflectionCard
│   ├── SidePanel
│   │   ├── WhyAsking
│   │   └── ConfidenceIndicator
│   ├── VoiceInputButton
│   └── PhaseReview
├── WorkflowShell
│   ├── StepProgressBar
│   ├── StepHeader (icon, label, subtitle, tooltip)
│   ├── StepContent (dynamic per step)
│   │   ├── FocusStep → InferencePanel + DriverCards
│   │   ├── IssuesStep → IssueCards by focus area
│   │   ├── TensionsStep → TensionMatrix (grid + detail panel)
│   │   ├── DilemmasStep → RankedDilemmaCards (score badges)
│   │   ├── ValuesStep → ValuePropositionCards
│   │   ├── SwotStep → SwotEditor (8-step sub-process + inline edit)
│   │   ├── BMCStep → BMCCanvas (9-block grid)
│   │   └── BusinessPlanStep → FormattedPlan + ExportPanel
│   ├── FeedbackBar (Refine / Confirm & continue)
│   └── AuditTrailDrawer
├── SDGMapper (overlay/modal)
│   ├── SDGGrid (17 SDGs)
│   ├── AntiGreenwashingPanel
│   └── LocalRelevanceFilter
└── Shared
    ├── LoadingState
    ├── ErrorBanner
    ├── SDGChip
    ├── DriverBadge
    ├── EvidenceBadge
    ├── ScoreBadge (circular, with tooltip)
    ├── TooltipDefinition
    ├── VersionHistoryTimeline
    └── ExportModal
```

### State Management

The application uses React's built-in state management (useReducer + Context) rather than an external library, keeping the dependency footprint small:

```javascript
// Core workflow state (useReducer)
{
  phase: "onboarding" | "guided-input" | "workflow",
  currentStep: "story" | "focus" | ... | "plan",
  completedSteps: string[],
  outputs: { [stepId]: any },
  story: string,
  guidedInputPhases: { basics: string, problem: string, customers: string },
  inferences: { sector, audience, sdg_focus, stage, hidden_stakeholder },
  selectedSwotTitle: string,
  loading: boolean,
  error: string | null
}

// Audit trail (append-only array)
{
  events: [
    { timestamp, type: "generation"|"refinement"|"manual_edit", step, summary }
  ]
}

// Version history (per step, append-only)
{
  [stepId]: [
    { timestamp, snapshot, changeDescription }
  ]
}
```

State is persisted to localStorage on every meaningful change via a `useEffect` that debounces writes.

### Data Flow

1. **Onboarding → Guided Input**: User clicks "Start co-creating" → phase transitions to `guided-input`
2. **Guided Input → Workflow**: All 4 phases completed → story compiled → phase transitions to `workflow`, step set to `focus`, auto-generation triggers
3. **Step Generation**: `callGemini(prompt)` → parse JSON → validate schema → store in `outputs[stepId]` → record audit event
4. **Refinement**: User provides feedback → `callGemini(refinePrompt)` → replace output → record audit event + version history entry
5. **Step Approval**: User clicks "Confirm & continue" → mark completed → advance step → auto-generate next
6. **Export**: User selects format → Export_Module builds document from accumulated outputs → trigger download

## Components and Interfaces

### 1. OnboardingScreen

**Purpose**: Welcome first-time users, explain capabilities, and provide entry to the workflow.

**Props**: `onStartCreating: () => void`, `onTakeTour: () => void`

**Behavior**:
- Renders 3 capability cards (what it can do, cannot do, data handling)
- Shows glossary preview with 5 key terms
- Displays a preview of the 9-step progress bar
- "Start co-creating" button transitions to guided input
- "Take a tour" button triggers a guided overlay walkthrough

### 2. GuidedInput

**Purpose**: Conversational multi-phase story collection replacing the single textarea.

**Props**: `onComplete: (compiledStory: string) => void`

**State**: Current phase (1-4), messages per phase, confidence scores

**Phases**:
1. **Business basics**: Name, sector, stage, location
2. **Problem & solution**: What problem, how you solve it, what's different
3. **Your customers**: Who they are, how you reach them, what they need
4. **Review & finish**: Compiled summary with edit option

**Sub-components**:
- `ChatInterface`: Renders AI questions and user responses in chat bubbles
- `ReflectionCard`: "I heard you say" summary after each user response
- `SidePanel`: "Why we're asking this" + `ConfidenceIndicator` (visual progress bar)
- `VoiceInputButton`: Microphone button, recording indicator, transcript stream

### 3. TensionMatrix

**Purpose**: Interactive grid visualization of conflicts between business drivers.

**Props**: `data: TensionsData`, `onResolve: (index: number) => void`

**Layout**: Two-column — left is the tension list/grid, right is the detail panel (sticky).

**Features**:
- Grid view with driver columns and issue rows
- Evidence badges (High/Medium/Low) with color coding
- Click a tension → detail panel shows full explanation, affected drivers, sources
- "Resolve" button marks a tension as addressed

### 4. SwotEditor

**Purpose**: Interactive SWOT analysis with inline editing and version history.

**Props**: `data: SwotData`, `selectedTitle: string`, `onSelect`, `onEdit`, `versionHistory`

**Features**:
- 8-step sub-process navigation (Define Purpose → ... → Finalize)
- Each SWOT bullet point is clickable for inline editing
- Rename, delete, add new items
- Edit Timeline drawer showing version history with "Restore Version" buttons
- Changes automatically recorded in version history

### 5. SDGMapper

**Purpose**: Display all 17 SDGs with alignment status and anti-greenwashing safeguards.

**Props**: `alignments: SDGAlignment[]`, `onStatusChange`

**Features**:
- 17 SDG cards with status badges: ✓ Strong evidence, ~ Inferred, ? You decide
- Anti-greenwashing panel with safeguard warnings
- Local relevance filter dropdown
- Click an SDG to see evidence source

### 6. ExportModal

**Purpose**: Multi-format export with privacy reminder and format selection.

**Props**: `planText`, `outputs`, `story`, `onClose`

**Formats**:
- Word (.docx): Full business plan + SWOT appendix + BMC appendix (existing `docx` library)
- PowerPoint (.pptx): Summary slides (new dependency: `pptxgenjs`)
- Notion: Markdown export formatted for Notion paste
- Plain text: Simple text download

### 7. AuditTrailDrawer

**Purpose**: Slide-out panel showing chronological record of all AI generations and edits.

**Props**: `events: AuditEvent[]`, `onClose`

**Features**:
- Timeline visualization with event type icons
- Each event shows: timestamp, type badge, step context, change summary
- Filterable by event type

## Data Models

### WorkflowState

```typescript
interface WorkflowState {
  phase: "onboarding" | "guided-input" | "workflow";
  currentStep: StepId;
  completedSteps: StepId[];
  outputs: Record<StepId, StepOutput>;
  story: string;
  guidedInputPhases: {
    basics: string;
    problem: string;
    customers: string;
  };
  inferences: {
    sector: string;
    audience: string;
    sdg_focus: string;
    stage: string;
    hidden_stakeholder: string;
  };
  selectedSwotTitle: string;
  loading: boolean;
  error: string | null;
}

type StepId = "story" | "focus" | "issues" | "tensions" | "dilemmas" | "values" | "swot" | "bmc" | "plan";
```

### StepOutput (per step)

```typescript
interface FocusOutput {
  drivers: Array<{ name: string; description: string; relevance: string }>;
  primaryFocus: string;
}

interface IssuesOutput {
  issues: Array<{ title: string; description: string; driver: "People" | "Planet" | "Prosperity"; evidence: "High" | "Low" | "Inferred" }>;
}

interface TensionsOutput {
  tensions: Array<{ id: string; title: string; description: string; columns: string[]; rows: string[]; evidenceLevel: string; resolved: boolean }>;
}

interface DilemmaOutput {
  dilemmas: Array<{ title: string; description: string; severity: number; reversibility: number; reach: number; score: number; sdgs: string[]; drivers: string[] }>;
}

interface ValuesOutput {
  propositions: Array<{ title: string; description: string; customerSegment: string; differentiator: string }>;
}

interface SwotOutput {
  strengths: Array<{ id: string; text: string }>;
  weaknesses: Array<{ id: string; text: string }>;
  opportunities: Array<{ id: string; text: string }>;
  threats: Array<{ id: string; text: string }>;
}

interface BMCOutput {
  blocks: Record<BMCBlockId, Array<{ id: string; text: string }>>;
}

type BMCBlockId = "keyPartners" | "keyActivities" | "keyResources" | "valuePropositions" | "customerRelationships" | "channels" | "customerSegments" | "revenueStreams" | "costStructure";

interface PlanOutput {
  sections: Array<{ heading: string; content: string }>;
  markdown: string;
}
```

### AuditEvent

```typescript
interface AuditEvent {
  id: string;
  timestamp: string; // ISO 8601
  type: "generation" | "refinement" | "manual_edit";
  step: StepId;
  summary: string;
}
```

### VersionHistoryEntry

```typescript
interface VersionHistoryEntry {
  timestamp: string; // ISO 8601
  snapshot: any; // Copy of the step output at that point
  changeDescription: string;
}

type VersionHistory = Record<StepId, VersionHistoryEntry[]>;
```

### SDGAlignment

```typescript
interface SDGAlignment {
  sdgNumber: number; // 1-17
  name: string;
  status: "strong" | "inferred" | "undecided";
  evidenceSource?: string;
  localRelevance?: string;
}
```

### GuidedInputMessage

```typescript
interface GuidedInputMessage {
  id: string;
  role: "ai" | "user";
  content: string;
  timestamp: string;
  phase: 1 | 2 | 3 | 4;
}
```

## API Integration

### Gemini Client

```javascript
// src/services/geminiClient.js
const MODEL = "gemini-2.0-flash";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export async function callGemini(prompt, opts = {}) {
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY_MISSING");
  
  const url = `${BASE_URL}/${MODEL}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxTokens ?? 4096,
      topP: 0.95,
    },
  };

  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) { /* error handling */ }
  
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text;
}

export function parseGeminiJSON(text) {
  const stripped = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) return null;
  return JSON.parse(match[0]);
}
```

### Auto-Retry Logic

On JSON parse failure, the client retries once with the same prompt before surfacing the error. This handles transient model formatting issues.

## File Structure

```
src/
├── App.jsx                          # Root — routes between phases
├── index.js                         # Entry point
├── index.css                        # Global styles + CSS custom properties
├── components/
│   ├── OnboardingScreen.jsx
│   ├── GuidedInput/
│   │   ├── GuidedInput.jsx          # Phase orchestrator
│   │   ├── ChatInterface.jsx        # Chat bubble renderer
│   │   ├── ReflectionCard.jsx       # "I heard you say" cards
│   │   ├── SidePanel.jsx            # Why + confidence
│   │   ├── VoiceInputButton.jsx     # Mic button + recording state
│   │   └── PhaseReview.jsx          # Final review/edit before submit
│   ├── WorkflowShell.jsx            # Layout: progress bar + step + feedback
│   ├── StepProgressBar.jsx          # 9-step visual indicator
│   ├── steps/
│   │   ├── FocusStep.jsx
│   │   ├── IssuesStep.jsx
│   │   ├── TensionsStep.jsx         # Tension matrix grid + detail
│   │   ├── DilemmasStep.jsx         # Ranked cards with score badges
│   │   ├── ValuesStep.jsx
│   │   ├── SwotStep.jsx             # SWOT editor with 8-step sub-process
│   │   ├── BMCStep.jsx              # 9-block canvas
│   │   ├── SDGMapperStep.jsx        # 17 SDGs + anti-greenwashing
│   │   └── BusinessPlanStep.jsx     # Plan viewer + export
│   ├── shared/
│   │   ├── FeedbackBar.jsx
│   │   ├── LoadingState.jsx
│   │   ├── ErrorBanner.jsx
│   │   ├── SDGChip.jsx
│   │   ├── DriverBadge.jsx
│   │   ├── EvidenceBadge.jsx
│   │   ├── ScoreBadge.jsx           # Circular score with hover tooltip
│   │   ├── TooltipDefinition.jsx    # Plain-language term tooltips
│   │   ├── VersionHistoryTimeline.jsx
│   │   └── ExportModal.jsx
│   └── AuditTrailDrawer.jsx
├── hooks/
│   ├── useWorkflow.js               # useReducer for workflow state
│   ├── useAuditTrail.js             # Append-only event log
│   ├── useVersionHistory.js         # Per-step version tracking
│   ├── useLocalStorage.js           # Persistence hook
│   └── useVoiceInput.js             # Web Speech API wrapper
├── services/
│   ├── geminiClient.js              # API calls + retry logic
│   └── exportService.js             # Word, PowerPoint, text export
├── constants/
│   ├── prompts.js                   # All Gemini prompt templates
│   ├── steps.js                     # Step metadata (id, label, subtitle, icon)
│   └── sdgs.js                      # 17 SDG definitions + colors
└── utils/
    ├── compileStory.js              # Merge guided input phases → story
    └── validators.js                # JSON schema validation for Gemini responses
```

## Dependencies

### Existing (keep)
- `react` ^18.2.0
- `react-dom` ^18.2.0
- `react-scripts` 5.0.1
- `docx` ^8.5.0 (Word export)
- `file-saver` ^2.0.5 (download trigger)

### New (add)
- `pptxgenjs` ^3.12.0 (PowerPoint export)
- `react-markdown` ^9.0.0 (formatted plan rendering)
- `remark-gfm` ^4.0.0 (GitHub Flavored Markdown tables/lists)

No routing library needed — the app is a single-page wizard. No state management library needed — useReducer + Context suffices.

## Design System

### CSS Custom Properties (extend existing)

The existing `index.css` already defines a comprehensive design token system. Additions:

```css
:root {
  /* Animation tokens */
  --transition-fast: 0.15s ease;
  --transition-medium: 0.25s ease;
  --transition-slow: 0.4s ease;
  
  /* Z-index scale */
  --z-drawer: 100;
  --z-modal: 200;
  --z-tooltip: 300;
  
  /* Spacing scale */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  
  /* Breakpoints (used in media queries) */
  /* --bp-mobile: 480px; --bp-tablet: 768px; --bp-desktop: 1024px; --bp-wide: 1440px; */
}
```

### Typography Scale
- H1: 1.75rem / 600 weight (page titles)
- H2: 1.25rem / 500 weight (section headings)
- H3: 1rem / 500 weight (card titles)
- Body: 0.875rem / 400 weight (paragraphs, inputs)
- Caption: 0.75rem / 400 weight (badges, timestamps)
- Mono: DM Mono for code/technical content

### Accessibility Requirements
- All interactive elements receive visible focus indicators (3px brand-colored outline)
- Color contrast minimum 4.5:1 for body text, 3:1 for large text
- ARIA live region for step transitions: `aria-live="polite"`
- All images/icons have alt text or `aria-hidden="true"`
- Skip-to-content link for keyboard users

## Correctness Properties

### Property 1: Workflow Step Invariant
For any application state, the workflow engine maintains exactly 9 steps in fixed order. The `completedSteps` array only contains valid step IDs and `currentStep` is always a valid step ID.

**Validates: Requirements 5.1**

### Property 2: Story Compilation Completeness
For any set of guided input phase responses (basics, problem, customers), the compiled story string contains all non-empty phase responses concatenated with contextual separators.

**Validates: Requirements 2.5**

### Property 3: Output Schema Preservation on Refinement
For any step output that undergoes refinement, the refined output maintains the same JSON schema (same top-level keys and structure) as the original output.

**Validates: Requirements 6.2**

### Property 4: Dilemma Ranking Order
For any set of generated dilemmas, the display order is always sorted descending by score (severity × reversibility × reach). No dilemma with a lower score appears above one with a higher score.

**Validates: Requirements 8.1**

### Property 5: Version History Monotonicity
For any step with version history, the history array grows monotonically — entries are only appended, never removed or reordered. Each entry's timestamp is greater than or equal to the previous entry's timestamp.

**Validates: Requirements 9.3**

### Property 6: Audit Trail Completeness
For every AI generation call or user edit action, exactly one corresponding audit trail event is created. The audit trail length equals the total count of generations plus manual edits performed.

**Validates: Requirements 14.1**

### Property 7: SDG Display Completeness
The SDG mapper always displays exactly 17 SDGs. Regardless of the alignment data provided, all 17 SDGs are rendered with a status indicator (strong evidence, inferred, or you decide).

**Validates: Requirements 10.1**

### Property 8: BMC Block Completeness
The BMC canvas always renders exactly 9 blocks (Key Partners, Key Activities, Key Resources, Value Propositions, Customer Relationships, Channels, Customer Segments, Revenue Streams, Cost Structure). Missing data renders as an empty block, not a missing block.

**Validates: Requirements 11.1**

### Property 9: LocalStorage Persistence Round-Trip
For any workflow state that is persisted to localStorage, deserializing the stored JSON and comparing it to the original state produces an equivalent object (round-trip property).

**Validates: Requirements 19.1**

### Property 10: Auto-Retry on Parse Failure
When the Gemini client receives a response that fails JSON parsing, it retries exactly once. If the retry also fails, it surfaces the error. The total number of API calls for a single generation request is at most 2.

**Validates: Requirements 18.3**

### Property 11: Navigation Preserves State
When a user navigates backward to a previously completed step, all outputs for all steps remain unchanged. Navigation does not trigger regeneration or modify stored outputs.

**Validates: Requirements 5.5**

### Property 12: Progress Bar Accuracy
For any combination of completed steps, the progress bar displays the correct visual state: completed steps show checkmarks, the current step is highlighted, and future steps are muted. The progress percentage equals `(completedSteps.length / 9) * 100`.

**Validates: Requirements 5.3**

## Error Handling

### API Errors

| Error Condition | User-Facing Behavior | Recovery Action |
|----------------|---------------------|-----------------|
| Missing API key (`REACT_APP_GEMINI_API_KEY` not set) | Redirect to manual API key entry screen | User enters key manually; stored in memory (not localStorage) |
| HTTP 429 (rate limit) | Display "Too many requests — please wait a moment" banner | Auto-retry after 5 seconds with exponential backoff (max 3 retries) |
| HTTP 4xx/5xx | Display "Something went wrong" with status code and "Try again" button | User clicks retry; same prompt is re-sent |
| Network timeout (>30s) | Display "Connection timed out" with retry button | User clicks retry |
| JSON parse failure | Silent retry once; if second attempt fails, display "AI response was malformed — please try again" | Auto-retry once, then user-initiated retry |

### State Errors

| Error Condition | Behavior | Recovery |
|----------------|----------|----------|
| localStorage quota exceeded | Console warning; app continues in-memory only | Notify user that progress won't persist across sessions |
| Corrupted localStorage data | Detect on load via schema validation; if invalid, offer "Start fresh" | User chooses to start fresh or attempt partial recovery |
| Invalid step navigation (e.g., jump to uncompleted step) | Silently redirect to the furthest valid step | No user action needed |

### Voice Input Errors

| Error Condition | Behavior | Recovery |
|----------------|----------|----------|
| Web Speech API not supported | Hide voice button entirely; text-only mode | No recovery needed |
| Microphone permission denied | Display inline message: "Microphone access denied" | User can type instead or grant permission in browser settings |
| Recognition error (no speech detected) | Display "Didn't catch that — try again or type your response" | User retries or switches to typing |

### General Error UI Patterns

- All errors are displayed in an `ErrorBanner` component at the top of the active content area
- Errors auto-dismiss after 10 seconds unless they require user action
- Errors never block navigation — user can always go back to previous steps
- Loading states prevent duplicate submissions by disabling action buttons

## Testing Strategy

### Unit Tests

Unit tests cover individual component logic, utility functions, and hooks using **Jest** and **React Testing Library**.

**Focus areas:**
- `compileStory.js`: Verify story compilation from guided input phases
- `validators.js`: Verify JSON schema validation for each step output type
- `geminiClient.js`: Verify retry logic, error handling, response parsing (with mocked fetch)
- `useWorkflow.js` reducer: Verify state transitions for all action types
- `useAuditTrail.js`: Verify event recording for each action type
- `useVersionHistory.js`: Verify append-only behavior and timestamp ordering
- Component rendering: Verify each step component renders correct structure given valid props

### Property-Based Tests

Property-based tests use **fast-check** to verify universal correctness properties with minimum 100 iterations per property.

**Configuration:**
- Library: `fast-check` (JavaScript PBT library)
- Minimum iterations: 100 per property
- Each test is tagged with a comment referencing the design property

**Properties tested:**
- Property 1: Workflow step invariant (step IDs always valid)
- Property 2: Story compilation completeness (all non-empty phases included)
- Property 3: Output schema preservation on refinement
- Property 4: Dilemma ranking order (descending by score)
- Property 5: Version history monotonicity (append-only, timestamps ordered)
- Property 6: Audit trail completeness (one event per action)
- Property 7: SDG display completeness (always 17 SDGs)
- Property 8: BMC block completeness (always 9 blocks)
- Property 9: LocalStorage persistence round-trip
- Property 10: Auto-retry on parse failure (max 2 calls)
- Property 11: Navigation preserves state
- Property 12: Progress bar accuracy

**Tag format:** `// Feature: nexus-mia-copilot, Property {N}: {title}`

### Integration Tests

Integration tests verify end-to-end user flows with mocked API responses using **React Testing Library** and **MSW** (Mock Service Worker).

**Key flows:**
- Full onboarding → guided input → story compilation → first step generation
- Refinement cycle: generate → provide feedback → regenerate → confirm
- Export flow: complete all steps → select format → verify download trigger
- State persistence: complete steps → reload → resume from saved state

### Accessibility Tests

- **jest-axe**: Automated WCAG 2.1 AA checks on rendered components
- Manual testing with screen reader (VoiceOver/NVDA) for step transitions and ARIA live regions
- Keyboard-only navigation verification for all interactive elements
