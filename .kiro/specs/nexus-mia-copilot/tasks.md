# Implementation Plan: Nexus MIA Business Model Co-Pilot

## Overview

This implementation plan transforms the existing Streamlit-based prototype into a production-quality React 18 SPA. The plan progresses incrementally: foundation setup, state management hooks, service layer, shared UI components, feature screens (onboarding, guided input, workflow shell), step-specific components, integration wiring, responsive polish, accessibility compliance, and final validation. Each task builds on previous ones, ensuring no orphaned code.

## Tasks

- [x] 1. Project Setup and Design System Foundation
  - [x] 1.1 Create `.env` file with `REACT_APP_GEMINI_API_KEY` environment variable
    - _Requirements: 18.1_
  - [x] 1.2 Install new dependencies: `pptxgenjs`, `react-markdown`, `remark-gfm`
    - _Requirements: 13.1, 12.2_
  - [x] 1.3 Extend `src/index.css` with new CSS custom properties (animation tokens, z-index scale, spacing scale, responsive breakpoints media queries)
    - _Requirements: 15.1_
  - [x] 1.4 Create `src/constants/sdgs.js` with all 17 SDG definitions (id, name, description, color, icon)
    - _Requirements: 10.1_
  - [x] 1.5 Add responsive media queries to `src/index.css` for mobile (≤480px), tablet (≤768px), desktop (≤1024px), and wide (≥1440px)
    - _Requirements: 16.1, 16.2_
  - [x] 1.6 Add accessibility base styles: visible focus indicators (3px brand-colored outline), skip-to-content link styles, reduced-motion media query
    - _Requirements: 17.1, 17.2_

- [x] 2. Core Hooks and State Management
  - [x] 2.1 Create `src/hooks/useWorkflow.js` — useReducer hook managing workflow state (phase, currentStep, completedSteps, outputs, story, loading, error) with actions: SET_PHASE, SET_STEP, COMPLETE_STEP, SET_OUTPUT, SET_STORY, SET_LOADING, SET_ERROR, NAVIGATE_BACK, RESET
    - _Requirements: 5.1, 5.2, 5.4, 5.5_
  - [x] 2.2 Create `src/hooks/useLocalStorage.js` — persistence hook that saves/loads workflow state to localStorage with debounced writes (300ms) and provides `resume` / `clearState` functions
    - _Requirements: 19.1, 19.2, 19.3_
  - [x] 2.3 Create `src/hooks/useAuditTrail.js` — append-only event log with `addEvent(type, step, summary)` function; stores events as `{ timestamp, type, step, summary }`
    - _Requirements: 14.1_
  - [x] 2.4 Create `src/hooks/useVersionHistory.js` — per-step version tracking with `recordVersion(stepId, snapshot, description)` and `restoreVersion(stepId, index)` functions
    - _Requirements: 9.3, 9.4_
  - [x] 2.5 Create `src/hooks/useVoiceInput.js` — Web Speech API wrapper with `startListening`, `stopListening`, `transcript`, `isListening`, `isSupported`, and `error` state
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x]* 2.6 Write property tests for useWorkflow hook
    - **Property 1: Workflow Step Invariant** — workflow maintains exactly 9 steps in fixed order, completedSteps only contains valid step IDs, currentStep is always valid
    - **Validates: Requirements 5.1, 5.4, 5.5**
  - [x]* 2.7 Write property tests for useLocalStorage hook
    - **Property 9: LocalStorage Persistence Round-Trip** — any state persisted to localStorage can be deserialized back to an equivalent object
    - **Validates: Requirements 19.1, 19.2**

- [x] 3. Services Layer
  - [x] 3.1 Refactor `src/utils/gemini.js` into `src/services/geminiClient.js` — reads API key from env variable, falls back to manual entry; adds auto-retry on JSON parse failure (retry once before error)
    - _Requirements: 18.1, 18.2, 18.3_
  - [x] 3.2 Create `src/services/exportService.js` — move Word export logic from `src/utils/export.js`, add PowerPoint export using `pptxgenjs`, add Notion markdown export, add plain text export
    - _Requirements: 13.1, 13.2, 13.4_
  - [x] 3.3 Create `src/utils/compileStory.js` — function that merges guided input phase responses (basics, problem, customers) into a cohesive story narrative with contextual separators
    - _Requirements: 2.5_
  - [x] 3.4 Create `src/utils/validators.js` — JSON schema validators for each step's expected output structure (focus, issues, tensions, dilemmas, values, swot, bmc)
    - _Requirements: 6.3, 18.3_
  - [x]* 3.5 Write property tests for geminiClient
    - **Property 10: Auto-Retry on Parse Failure** — on JSON parse failure, retries exactly once; total API calls for a single generation is at most 2
    - **Validates: Requirements 18.3**
  - [x]* 3.6 Write property tests for compileStory
    - **Property 2: Story Compilation Completeness** — compiled story contains all non-empty phase responses concatenated with contextual separators
    - **Validates: Requirements 2.5**

- [x] 4. Shared UI Components
  - [x] 4.1 Create `src/components/shared/ErrorBanner.jsx` — error display with message, retry button, and dismiss action; uses `role="alert"` for accessibility
    - _Requirements: 6.3, 18.2_
  - [x] 4.2 Create `src/components/shared/DriverBadge.jsx` — colored pill badge for People/Planet/Prosperity drivers using DRIVER_STYLES
    - _Requirements: 8.4, 20.3_
  - [x] 4.3 Create `src/components/shared/EvidenceBadge.jsx` — badge component with High/Medium/Low evidence levels and corresponding colors
    - _Requirements: 7.2_
  - [x] 4.4 Create `src/components/shared/ScoreBadge.jsx` — circular score badge (44px) with hover tooltip showing severity/reversibility/reach breakdown
    - _Requirements: 8.1, 8.2, 20.4_
  - [x] 4.5 Create `src/components/shared/TooltipDefinition.jsx` — hover/focus tooltip for technical terms with plain-language definitions; uses `aria-describedby` pattern
    - _Requirements: 15.4, 20.3_
  - [x] 4.6 Create `src/components/shared/VersionHistoryTimeline.jsx` — timeline component rendering version entries with timestamps, descriptions, and "Restore Version" buttons
    - _Requirements: 9.4_
  - [x] 4.7 Create `src/components/shared/ExportModal.jsx` — modal dialog with format selection (Word, PowerPoint, Notion, Plain text), privacy reminder, and download triggers
    - _Requirements: 13.1, 13.3_
  - [x] 4.8 Update `src/components/shared/SDGChip.jsx` — add hover tooltip showing full SDG name (e.g., "SDG 7 · Affordable and Clean Energy") using the sdgs.js definitions
    - _Requirements: 8.3, 10.1_
  - [x] 4.9 Update `src/components/shared/LoadingState.jsx` — add ARIA live region announcement, step-contextual messages, and reduced-motion support
    - _Requirements: 6.4, 17.4, 18.4_

- [x] 5. Onboarding Screen
  - [x] 5.1 Create `src/components/OnboardingScreen.jsx` — three capability cards (what it can do, cannot do, data handling), glossary preview (5 terms), 9-step progress preview, "Take a tour" and "Start co-creating" CTAs
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 5.2 Add responsive layout to OnboardingScreen — stack cards vertically on mobile, 3-column on desktop
    - _Requirements: 16.1_
  - [x] 5.3 Add keyboard navigation and ARIA roles to OnboardingScreen — landmark regions, heading hierarchy, button focus management
    - _Requirements: 17.2, 17.3_

- [x] 6. Guided Conversational Input
  - [x] 6.1 Create `src/components/GuidedInput/GuidedInput.jsx` — phase orchestrator managing 4 phases (Business basics, Problem & solution, Your customers, Review & finish) with phase indicator
    - _Requirements: 2.1_
  - [x] 6.2 Create `src/components/GuidedInput/ChatInterface.jsx` — chat bubble renderer with AI messages (left-aligned) and user messages (right-aligned), timestamp labels, scroll-to-bottom behavior
    - _Requirements: 2.2_
  - [x] 6.3 Create `src/components/GuidedInput/ReflectionCard.jsx` — "I heard you say" card with summary text, green border, edit affordance button
    - _Requirements: 2.3_
  - [x] 6.4 Create `src/components/GuidedInput/SidePanel.jsx` — "Why we're asking this" context panel with ConfidenceIndicator (visual progress bar showing AI understanding level per phase)
    - _Requirements: 2.4_
  - [x] 6.5 Create `src/components/GuidedInput/VoiceInputButton.jsx` — microphone button using `useVoiceInput` hook; shows recording indicator (pulsing dot), streams transcript to input; hides gracefully if unsupported
    - _Requirements: 2.6, 2.7, 3.1, 3.2_
  - [x] 6.6 Create `src/components/GuidedInput/PhaseReview.jsx` — final review screen compiling all phase responses, allowing user to edit before submitting the compiled story
    - _Requirements: 2.5_
  - [x] 6.7 Add accessibility to GuidedInput — ARIA live regions for AI messages, focus management between phases, keyboard-accessible voice button
    - _Requirements: 17.3, 17.4_

- [x] 7. Checkpoint - Verify foundation builds correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Workflow Shell and Step Navigation
  - [x] 8.1 Create `src/components/WorkflowShell.jsx` — layout wrapper with StepProgressBar, step header (icon, label, subtitle), content area, and FeedbackBar; uses `useWorkflow` hook
    - _Requirements: 5.3, 15.5, 20.5_
  - [x] 8.2 Create `src/components/StepProgressBar.jsx` — replace existing StepNav with enhanced version: 9-step bar with completed (✓), current (highlighted with ring), and future (muted) states; responsive collapse to compact indicator below 768px
    - _Requirements: 5.3, 16.2_
  - [x] 8.3 Add ARIA live region to WorkflowShell — announces step transitions with `aria-live="polite"` containing step name and number
    - _Requirements: 17.4_
  - [x] 8.4 Update `src/components/shared/FeedbackBar.jsx` — add "Confirm & continue" as primary CTA, inline refinement actions ("edit this", "ask for alternative", "ask a follow-up"), conversational nudge text
    - _Requirements: 6.1, 20.1, 20.5_
  - [x]* 8.5 Write property tests for workflow navigation
    - **Property 11: Navigation Preserves State** — navigating backward to a completed step does not modify stored outputs
    - **Validates: Requirements 5.5**
  - [x]* 8.6 Write property tests for progress bar accuracy
    - **Property 12: Progress Bar Accuracy** — progress displays correct visual state for any combination of completed steps; percentage equals (completedSteps.length / 9) × 100
    - **Validates: Requirements 5.3**

- [x] 9. Step Components - Focus and Issues
  - [x] 9.1 Update `src/components/steps/FocusStep.jsx` — enhance InferencePanel with all 5 inferences (sector, audience, SDG focus, stage, hidden stakeholder), "Looks right — generate" and "Something's off — let me correct" CTAs, edit buttons per attribute
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 20.2_
  - [x] 9.2 Update `src/components/steps/IssuesStep.jsx` — render issues grouped by focus area with driver badges, collapsible explanations, and SDG chips
    - _Requirements: 5.2, 20.3_
  - [x] 9.3 Add accessibility to FocusStep — proper heading levels, form labels for inline edit fields, ARIA announcements on inference confirm/edit
    - _Requirements: 17.3_

- [x] 10. Step Components - Tensions and Dilemmas
  - [x] 10.1 Update `src/components/steps/TensionsStep.jsx` — add grid view with columns (Cost/Speed/Trust) and rows (Customer Segments/Value Proposition/Channels), evidence badges (High/Low), inference labels, sticky detail panel, "Resolve" action button
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [x] 10.2 Add responsive layout to TensionsStep — switch from grid to stacked cards below 768px
    - _Requirements: 16.3_
  - [x] 10.3 Update `src/components/steps/DilemmasStep.jsx` — use ScoreBadge component for circular scores with hover breakdowns, driver badges, SDG chips with full-name hover tooltips, "X vs. Y" title format
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 20.4_
  - [x] 10.4 Add keyboard accessibility to TensionsStep — arrow key navigation between tensions, Enter to select, Escape to deselect
    - _Requirements: 17.2_
  - [x]* 10.5 Write property tests for dilemma ranking
    - **Property 4: Dilemma Ranking Order** — dilemmas are always sorted descending by score (severity × reversibility × reach); no lower-score dilemma appears above a higher-score one
    - **Validates: Requirements 8.1**

- [x] 11. Step Components - Values and SWOT
  - [x] 11.1 Update `src/components/steps/ValuesStep.jsx` — render value proposition cards with title, explanation, dilemmas addressed, benefits list, and driver badges
    - _Requirements: 20.3_
  - [x] 11.2 Rebuild `src/components/steps/SwotStep.jsx` as SwotEditor — add 8-step sub-process navigation (Define Purpose → Gather Insights → Identify Themes → Prioritize Topics → Analyze Factors → Draft SWOT → Refine SWOT → Finalize)
    - _Requirements: 9.5_
  - [x] 11.3 Add inline editing to SwotStep — click bullet points to edit, rename, delete; "Add item" button per quadrant
    - _Requirements: 9.1, 9.2_
  - [x] 11.4 Add version history integration to SwotStep — record every edit to `useVersionHistory`, show "Edit Timeline" button that opens VersionHistoryTimeline with restore capabilities
    - _Requirements: 9.3, 9.4_
  - [x]* 11.5 Write property tests for version history
    - **Property 5: Version History Monotonicity** — history array grows monotonically, entries only appended never removed/reordered, each timestamp ≥ previous
    - **Validates: Requirements 9.3, 9.4**

- [x] 12. Step Components - BMC and SDG Mapping
  - [x] 12.1 Update `src/components/steps/BMCStep.jsx` — standard BMC layout (2-row grid matching Osterwalder's layout), inline editing per block item, distinct colors and icons per block
    - _Requirements: 11.1, 11.2, 11.3_
  - [x] 12.2 Create `src/components/steps/SDGMapperStep.jsx` — display all 17 SDGs with status indicators (✓ Strong evidence, ~ Inferred, ? You decide), click to expand evidence details
    - _Requirements: 10.1, 10.4_
  - [x] 12.3 Add Anti-greenwashing safeguards panel to SDGMapperStep — warnings for SDGs with only inferred alignment, recommendations for strengthening claims
    - _Requirements: 10.2_
  - [x] 12.4 Add local relevance filter to SDGMapperStep — dropdown to filter SDGs by geographic/contextual relevance (Global, Africa, Europe, Asia, Americas, Custom)
    - _Requirements: 10.3_
  - [x]* 12.5 Write property tests for SDG display and BMC completeness
    - **Property 7: SDG Display Completeness** — SDG mapper always displays exactly 17 SDGs with a status indicator regardless of alignment data
    - **Property 8: BMC Block Completeness** — BMC canvas always renders exactly 9 blocks; missing data renders as empty block not missing block
    - **Validates: Requirements 10.1, 11.1**

- [x] 13. Checkpoint - Verify all step components work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Business Plan and Export
  - [x] 14.1 Update `src/components/steps/BusinessPlanStep.jsx` — render plan using `react-markdown` with `remark-gfm` for proper heading, list, and table formatting instead of manual parsing
    - _Requirements: 12.2_
  - [x] 14.2 Integrate ExportModal into BusinessPlanStep — "Export" button opens modal with format selection (Word, PowerPoint, Notion, Plain text)
    - _Requirements: 13.1_
  - [x] 14.3 Implement PowerPoint export in `src/services/exportService.js` — generate summary slides using `pptxgenjs` with title slide, executive summary, SWOT quadrant, BMC overview, and SDG alignment
    - _Requirements: 13.1_
  - [x] 14.4 Implement Notion export in `src/services/exportService.js` — generate Notion-compatible markdown with toggles, callouts, and proper heading hierarchy
    - _Requirements: 13.1_
  - [x] 14.5 Add privacy reminder to export flow — display "Your data stays yours" notice before download with information about what is included
    - _Requirements: 13.3_

- [x] 15. Audit Trail
  - [x] 15.1 Create `src/components/AuditTrailDrawer.jsx` — slide-out panel (from right) with timeline of all events; event type icons (generation = sparkle, refinement = pencil, edit = document), timestamps, step context, and change summaries
    - _Requirements: 14.2, 14.3_
  - [x] 15.2 Integrate audit trail recording into WorkflowShell — call `addEvent` on every generation completion, refinement, and manual edit action
    - _Requirements: 14.1_
  - [x] 15.3 Add "Audit Trail" button to WorkflowShell header — opens the drawer; badge showing event count
    - _Requirements: 14.2_
  - [x]* 15.4 Write property tests for audit trail
    - **Property 6: Audit Trail Completeness** — for every AI generation or user edit action, exactly one audit event is created; trail length equals total generations + manual edits
    - **Validates: Requirements 14.1**

- [x] 16. App Root Integration
  - [x] 16.1 Refactor `src/App.jsx` — integrate `useWorkflow`, `useLocalStorage`, `useAuditTrail` hooks; route between OnboardingScreen → GuidedInput → WorkflowShell based on phase state
    - _Requirements: 1.5, 5.1_
  - [x] 16.2 Add resume/start-fresh dialog — when localStorage has saved state, show dialog: "Welcome back! Resume where you left off or start fresh?"
    - _Requirements: 19.2, 19.3_
  - [x] 16.3 Add environment variable API key detection — if `REACT_APP_GEMINI_API_KEY` is set, skip ApiKeyScreen; if not set, show ApiKeyScreen as fallback
    - _Requirements: 18.1_
  - [x] 16.4 Wire step auto-generation — on step advance, automatically call Gemini for the new step with accumulated context from all previous outputs
    - _Requirements: 5.2, 6.1_
  - [x]* 16.5 Write property tests for refinement schema preservation
    - **Property 3: Output Schema Preservation on Refinement** — refined output maintains the same JSON schema (same top-level keys and structure) as original output
    - **Validates: Requirements 6.2**

- [x] 17. Responsive Design and Polish
  - [x] 17.1 Add responsive breakpoints to all step components — ensure no horizontal scroll at any viewport from 320px to 1920px
    - _Requirements: 16.1_
  - [x] 17.2 Add mobile-specific layouts — compact progress bar (current step indicator only), full-width cards, touch-friendly tap targets (44px minimum)
    - _Requirements: 16.2_
  - [x] 17.3 Add reduced-motion support — respect `prefers-reduced-motion` media query by disabling animations
    - _Requirements: 17.2_
  - [x] 17.4 Add print styles — hide navigation and controls, show content in single-column layout
    - _Requirements: 16.1_

- [x] 18. Accessibility Audit and ARIA
  - [x] 18.1 Add skip-to-content link at document root
    - _Requirements: 17.3_
  - [x] 18.2 Verify all color combinations meet WCAG 2.1 AA contrast ratios (4.5:1 for normal text, 3:1 for large text) — adjust any non-compliant colors
    - _Requirements: 17.1_
  - [x] 18.3 Ensure all interactive elements are keyboard-accessible with logical tab order and visible focus indicators
    - _Requirements: 17.2_
  - [x] 18.4 Add ARIA landmarks to main layout: `banner`, `navigation`, `main`, `complementary` (side panels), `contentinfo` (footer)
    - _Requirements: 17.3_
  - [x] 18.5 Test screen reader announcements — verify ARIA live regions announce step transitions, loading states, and error messages
    - _Requirements: 17.4_

- [x] 19. Checkpoint - Final verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 20. Testing and Validation
  - [x] 20.1 Verify the application builds without errors (`npm run build`)
    - _Requirements: 18.1_
  - [x] 20.2 Test full workflow end-to-end: Onboarding → Guided Input → 9 steps → Export
    - _Requirements: 5.1, 5.2_
  - [x] 20.3 Test localStorage persistence: complete 3 steps → refresh → verify resume dialog appears with correct state
    - _Requirements: 19.1, 19.2_
  - [x] 20.4 Test error handling: invalid API key, network failure, malformed Gemini response
    - _Requirements: 18.2, 18.3_
  - [x] 20.5 Test responsive layouts at 320px, 768px, 1024px, and 1920px viewports
    - _Requirements: 16.1_
  - [x] 20.6 Test keyboard navigation through entire workflow without mouse
    - _Requirements: 17.2_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout the implementation
- Property tests validate universal correctness properties defined in the design document
- Unit tests validate specific examples and edge cases
- The implementation uses React 18 with useReducer + Context for state management (no external state library)
- New dependencies: `pptxgenjs`, `react-markdown`, `remark-gfm`
- The application is a single-page wizard — no routing library required

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5"] },
    { "id": 2, "tasks": ["2.6", "2.7", "3.1", "3.2", "3.3", "3.4"] },
    { "id": 3, "tasks": ["3.5", "3.6", "4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "4.8", "4.9"] },
    { "id": 4, "tasks": ["5.1", "5.2", "5.3", "6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "6.7"] },
    { "id": 5, "tasks": ["8.1", "8.2", "8.3", "8.4"] },
    { "id": 6, "tasks": ["8.5", "8.6", "9.1", "9.2", "9.3"] },
    { "id": 7, "tasks": ["10.1", "10.2", "10.3", "10.4", "11.1", "11.2"] },
    { "id": 8, "tasks": ["10.5", "11.3", "11.4"] },
    { "id": 9, "tasks": ["11.5", "12.1", "12.2", "12.3", "12.4"] },
    { "id": 10, "tasks": ["12.5", "14.1", "14.2", "14.3", "14.4", "14.5"] },
    { "id": 11, "tasks": ["15.1", "15.2", "15.3"] },
    { "id": 12, "tasks": ["15.4", "16.1", "16.2", "16.3", "16.4"] },
    { "id": 13, "tasks": ["16.5", "17.1", "17.2", "17.3", "17.4"] },
    { "id": 14, "tasks": ["18.1", "18.2", "18.3", "18.4", "18.5"] },
    { "id": 15, "tasks": ["20.1", "20.2", "20.3", "20.4", "20.5", "20.6"] }
  ]
}
```
