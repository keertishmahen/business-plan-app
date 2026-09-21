# Implementation Plan: App Functional Enhancements

## Overview

This implementation plan transforms the Nexus MIA Business Plan Co-Pilot from a linear generation tool into a fully interactive co-creation experience. The work spans five domains: onboarding & discovery, input & voice, output & feedback, navigation & persistence, and interactive outputs. Implementation uses the existing React + useReducer architecture, Gemini LLM client, and introduces fast-check for property-based testing.

## Tasks

- [x] 1. Set up shared infrastructure and constants
  - [x] 1.1 Create tooltip content registry and constants
    - Create `src/constants/tooltips.js` with the `TOOLTIP_CONTENT` object containing all tooltip explanations for onboarding capabilities, step-level terms, and glossary entries
    - _Requirements: 1.1, 1.2, 9.1, 9.2_

  - [x] 1.2 Create InfoTooltip shared component
    - Create `src/components/shared/InfoTooltip.jsx` with (i) icon trigger, accessible popover, keyboard dismiss (Escape), outside-click dismiss, configurable position prop, and aria attributes for screen readers
    - _Requirements: 1.1, 1.3, 9.2, 9.3, 9.4_

  - [x] 1.3 Create BackButton shared component
    - Create `src/components/shared/BackButton.jsx` with an `onBack` callback and `disabled` prop, styled consistently with existing navigation elements
    - _Requirements: 7.1_

  - [x] 1.4 Create RefinementInvitation shared component
    - Create `src/components/shared/RefinementInvitation.jsx` with pencil icon (✏️), "Refine this" label, `onClickRefine` callback, and accessible aria-label
    - _Requirements: 11.1, 11.3, 11.4_

  - [x] 1.5 Create FeedbackAcknowledgment shared component
    - Create `src/components/shared/FeedbackAcknowledgment.jsx` as a dismissible banner displaying a plain-language change description message, positioned above output content
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 1.6 Create VoiceEnabledInput wrapper component
    - Create `src/components/shared/VoiceEnabledInput.jsx` that pairs any text input/textarea with a `VoiceInputButton`, supporting multiline, placeholder, disabled, and aria-label props
    - _Requirements: 3.1, 3.6_

  - [x] 1.7 Install fast-check as dev dependency
    - Add `fast-check` to devDependencies in package.json
    - _Requirements: Testing infrastructure_

- [x] 2. Implement onboarding enhancements (Tooltips & Tour)
  - [x] 2.1 Add InfoTooltip icons to OnboardingScreen capability cards
    - Modify `src/components/OnboardingScreen.jsx` to render an InfoTooltip (i) icon next to each capability item in the "What I can do" section, pulling content from the tooltip registry
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 2.2 Create useTour hook
    - Create `src/hooks/useTour.js` managing tour state: currentStep (1–9), isActive, next/back/exit/start actions, totalSteps, and stepData lookup
    - _Requirements: 2.1, 2.3, 2.4_

  - [x] 2.3 Create TourStep component
    - Create `src/components/TourStep.jsx` rendering individual tour step card with title, description, example data preview, and navigation controls
    - _Requirements: 2.2, 2.4_

  - [x] 2.4 Create TourWalkthrough component
    - Create `src/components/TourWalkthrough.jsx` as an overlay rendering TourStep cards using useTour hook, with progress indicator, covering all 9 workflow steps with static example data
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 2.5 Integrate Tour into OnboardingScreen
    - Add "Take a tour" button to `OnboardingScreen.jsx`, wire it to launch TourWalkthrough overlay, handle complete/exit callbacks to return to onboarding
    - _Requirements: 2.1, 2.5_

  - [ ]* 2.6 Write property test for tour navigation boundaries
    - **Property 1: Tour Navigation Boundaries**
    - Test that for any step index 1–9, next() produces min(current+1, 9), back() produces max(current-1, 1), and exit() resets to inactive
    - **Validates: Requirements 2.4**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement voice input integration
  - [x] 4.1 Enhance useVoiceInput hook with user-friendly error mapping
    - Modify `src/hooks/useVoiceInput.js` to map all SpeechRecognition error event types ("not-allowed", "no-speech", "audio-capture", "network", "aborted") to user-friendly messages with recovery suggestions, and hide microphone when API is unsupported
    - _Requirements: 3.5, 3.6_

  - [x] 4.2 Integrate VoiceEnabledInput across all text inputs
    - Replace bare text inputs/textareas in `GuidedInput.jsx`, `ChatInterface.jsx`, `FeedbackBar.jsx`, and step refinement areas with `VoiceEnabledInput` component to provide microphone buttons and visual listening indicators
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 4.3 Write property test for voice error code mapping
    - **Property 2: Voice Error Code Mapping**
    - Test that for any valid SpeechRecognition error type (including unknown strings), the hook produces a non-empty user-friendly message without technical internals
    - **Validates: Requirements 3.5**

- [x] 5. Implement dynamic follow-up questions and contextual story building
  - [x] 5.1 Add dynamic follow-up prompt templates to prompts.js
    - Add `dynamicFollowUp`, `storySummary`, and `feedbackAcknowledgment` prompt templates to `src/constants/prompts.js`, using plain language without JSON references
    - _Requirements: 5.1, 5.3, 6.1, 6.2, 13.1, 13.4_

  - [x] 5.2 Create useDynamicQuestions hook
    - Create `src/hooks/useDynamicQuestions.js` that calls Gemini LLM after each user answer, manages a question queue, tracks follow-up count (max 2 per base question), provides skip functionality, and resets count on next base question
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 13.1, 13.2, 13.3_

  - [x] 5.3 Integrate dynamic questions into ChatInterface
    - Modify `src/components/GuidedInput/ChatInterface.jsx` to inject dynamic follow-up questions into the message flow, display skip button, and handle phase completion messaging
    - _Requirements: 5.2, 5.5, 13.5_

  - [ ]* 5.4 Write property test for dynamic question limit
    - **Property 5: Dynamic Question Limit**
    - Test that for any sequence of user answers within a single base question, the hook never produces more than 2 follow-up questions
    - **Validates: Requirements 5.4**

- [x] 6. Implement story summary confirmation gate
  - [x] 6.1 Create StorySummary component
    - Create `src/components/GuidedInput/StorySummary.jsx` displaying guided input responses organized by categories (business basics, problem and solution, target customers), with "Confirm" and "Edit" buttons
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 6.2 Integrate StorySummary as confirmation gate in GuidedInput
    - Modify `src/components/GuidedInput/GuidedInput.jsx` to show StorySummary after Phase 3 completion, block progression to Focus step generation until explicit confirmation, and support edit-back navigation with preserved answers
    - _Requirements: 4.3, 4.4, 4.5_

  - [ ]* 6.3 Write property tests for story summary and confirmation gate
    - **Property 3: Story Summary Categorization** — Test that for any non-empty guided input responses, content appears in its corresponding category section
    - **Property 4: Story Confirmation Gate** — Test that without explicit confirmation, the system does not transition to focus generation
    - **Validates: Requirements 4.2, 4.5**

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement back navigation and progress persistence
  - [x] 8.1 Add BackButton to workflow step UI
    - Modify `src/components/WorkflowShell.jsx` or `App.jsx` to render BackButton on every step except "story", wired to dispatch `NAVIGATE_BACK` with the preceding step
    - _Requirements: 7.1, 7.2_

  - [x] 8.2 Ensure navigation preserves all outputs
    - Verify and enforce in the workflow reducer that `NAVIGATE_BACK` and forward navigation never clears entries in the `outputs` object; add handling so step components display previously generated output when revisiting
    - _Requirements: 7.3, 7.4, 7.5_

  - [x] 8.3 Implement progress persistence with debounced localStorage writes
    - Enhance the integration of `useLocalStorage` in `App.jsx` to auto-save the full workflow state (currentStep, completedSteps, outputs, story, selectedSwotTitle, guidedInputResponses, tourCompleted) with debounced writes
    - _Requirements: 8.1, 8.5_

  - [x] 8.4 Implement resume dialog on app load
    - Add a resume dialog component that detects saved state on app launch, offers "Resume" (restore exact state) or "Start fresh" (clear state, show onboarding) options
    - _Requirements: 8.2, 8.3, 8.4_

  - [ ]* 8.5 Write property tests for navigation and persistence
    - **Property 7: Back Navigation Correctness** — Test that NAVIGATE_BACK to preceding step sets currentStep without modifying outputs or completedSteps
    - **Property 8: Navigation Preserves All Outputs** — Test that navigating backward and forward preserves all output entries
    - **Property 9: Persistence Round-Trip** — Test that serializing and deserializing workflow state produces a deeply equivalent object
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 8.1, 8.3**

- [x] 9. Implement output feedback and refinement features
  - [x] 9.1 Remove JSON references from all user-visible text
    - Audit and modify `src/constants/prompts.js`, `FeedbackBar.jsx`, step description text, and any guidance/hint text to replace references to "JSON structure", "JSON format", or internal terminology with plain-language descriptions
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 9.2 Add RefinementInvitation to all step output components
    - Modify each step component (`FocusStep`, `IssuesStep`, `TensionsStep`, `DilemmasStep`, `ValuesStep`, `SwotStep`, `BMCStep`, `BusinessPlanStep`) to render `RefinementInvitation` after generated output, wired to open refinement input
    - _Requirements: 11.1, 11.2, 11.3_

  - [x] 9.3 Implement feedback acknowledgment LLM call and display
    - After a refinement is submitted and new output generated, call Gemini with the `feedbackAcknowledgment` prompt template comparing old vs new output, then display the resulting message in `FeedbackAcknowledgment` banner. Handle case where refinement cannot be meaningfully applied.
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ]* 9.4 Write property tests for JSON references and refinement invitation
    - **Property 6: No JSON References in User-Visible Text** — Scan all static strings in prompts.js and step descriptions for forbidden substrings
    - **Property 10: Refinement Invitation Presence** — Test that for any step with non-null output (excluding "story"), a RefinementInvitation is rendered
    - **Validates: Requirements 6.1, 6.2, 6.3, 11.1**

- [x] 10. Implement functional Business Model Canvas
  - [x] 10.1 Enhance BMCStep to populate all 9 blocks
    - Modify `src/components/steps/BMCStep.jsx` to ensure all 9 Osterwalder blocks are rendered with content derived from the selected SWOT value proposition and preceding outputs. Display no empty-state indicators when data is available.
    - _Requirements: 12.1, 12.2, 12.3_

  - [x] 10.2 Add inline editing to BMC blocks
    - Implement inline edit, add item, and delete item functionality within each BMC block, allowing users to modify canvas content directly
    - _Requirements: 12.4_

  - [x] 10.3 Add error handling for BMC generation failures
    - Display error message with retry option if Gemini LLM fails to generate BMC content, preserving any previously generated data
    - _Requirements: 12.5_

  - [ ]* 10.4 Write property test for BMC blocks non-empty
    - **Property 11: BMC Blocks Non-Empty When Data Available**
    - Test that when all 9 block arrays have at least one item, no empty-state indicator is rendered
    - **Validates: Requirements 12.2**

- [x] 11. Add information tooltips throughout the workflow
  - [x] 11.1 Add InfoTooltip to step headers and complex terms
    - Modify step components and `StepNav.jsx` to render InfoTooltip (i) icons next to step titles (Tension Matrix, Dilemmas, BMC, SWOT) and inline terms, pulling definitions from the tooltip content registry
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses `react-scripts test` (Jest + React Testing Library) as the test runner
- fast-check is used for property-based testing, integrated with Jest
- Voice input uses the existing `useVoiceInput` hook and Web Speech API
- LLM calls use the existing `geminiClient.js` service

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3", "1.4", "1.5", "1.7"] },
    { "id": 1, "tasks": ["1.2", "1.6", "2.2", "5.1"] },
    { "id": 2, "tasks": ["2.1", "2.3", "4.1", "5.2", "8.1", "9.1"] },
    { "id": 3, "tasks": ["2.4", "2.5", "4.2", "5.3", "6.1", "8.2", "8.3", "9.2"] },
    { "id": 4, "tasks": ["2.6", "4.3", "5.4", "6.2", "8.4", "9.3"] },
    { "id": 5, "tasks": ["6.3", "8.5", "9.4", "10.1", "11.1"] },
    { "id": 6, "tasks": ["10.2", "10.3"] },
    { "id": 7, "tasks": ["10.4"] }
  ]
}
```
