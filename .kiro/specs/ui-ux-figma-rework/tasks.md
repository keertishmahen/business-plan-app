# Implementation Plan: UI/UX Figma Rework

## Overview

This plan implements the visual and interaction design rework of the Nexus MIA Business Model Co-Pilot to match the high-fidelity Figma designs. The approach is phased: design tokens first, then shared components, then screen-specific layouts, then micro-interactions and accessibility. All changes use existing technology (inline styles + global CSS in `index.css`, React 18 functional components) — no new dependencies.

## Tasks

- [x] 1. Update design tokens and global CSS foundation
  - [x] 1.1 Add new CSS custom properties to `:root` in `index.css`
    - Add `--shadow-lg: 0 8px 24px rgba(0,0,0,0.12)` for Level 3 elevation
    - Add `--font-caption: 0.6875rem` and `--font-label: 0.75rem` typography tokens
    - Add `--transition-lift: transform 0.15s ease, box-shadow 0.2s ease` animation token
    - Update `h2` rule to `font-weight: 600` (from 500) per Requirement 13.1
    - _Requirements: 13.1, 14.1, 16.1, 16.2, 16.3_

  - [x] 1.2 Add micro-interaction keyframes and button hover rules to `index.css`
    - Add `@keyframes slideIn` (translateX(16px→0) + opacity 0→1 over 300ms) for step transitions
    - Add `.btn-primary:hover:not(:disabled)` rule with `translateY(-1px)` lift and shadow transition
    - Add `.btn-ghost:hover:not(:disabled)` background fill transition to `var(--color-bg)` over 150ms
    - Add `.card:hover` interactive card elevation transition (shadow-sm → shadow-md over 200ms, border-color shift)
    - Add `.animate-slide-in` utility class using the slideIn keyframe
    - Ensure `@media (prefers-reduced-motion: reduce)` disables all new animations
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.6_

  - [x] 1.3 Add responsive breakpoint rules for compact progress bar and panel layouts
    - Add rule for viewport ≥1024px: two-panel layouts side-by-side (main flex, side panel 300px)
    - Add rule for 768px–1023px: collapse panels to single column, side panel below
    - Update existing ≤768px rule for `StepProgressBar` to render compact pill "Step X of 9 · {label}"
    - Add rule for ≤768px: Tensions grid switches to vertically stacked full-width cards
    - _Requirements: 19.1, 19.2, 19.3, 19.4_

- [x] 2. Create shared icon and component library
  - [x] 2.1 Create `src/components/shared/Icon.jsx` with inline SVG icons
    - Export `ShieldIcon` (teal, 32px default) for onboarding capability cards
    - Export `RobotIcon` (24px circle, brand background, white glyph) for AI chat bubbles
    - Export `MicrophoneIcon` and `SendIcon` (36px touch targets) for chat input
    - Export `CheckmarkIcon` (white, for completed steps) and `ExternalLinkIcon` (for detail panel links)
    - All icons accept `size` and `color` props; include `role="img"` and `aria-hidden="true"` where decorative
    - _Requirements: 18.1, 18.3, 4.1, 4.5_

  - [x] 2.2 Create `src/components/shared/PhaseStepper.jsx` component
    - Render 4 numbered circles (28px diameter) connected by 2px horizontal lines
    - Completed phases: filled brand background, white number text
    - Current phase: 2.5px brand border, transparent fill, brand-colored number
    - Phase labels below circles: active at 600 weight primary color, inactive at 400 weight muted color
    - Connecting lines: brand-green for completed segments, `var(--color-border)` for uncompleted
    - Add `aria-live="polite"` region announcing phase changes
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 20.3_

  - [x] 2.3 Create `src/components/shared/FormatCard.jsx` component
    - Render card with `var(--radius-lg)` border-radius, `var(--shadow-sm)`, 24px padding, 1px border
    - Render 40px square icon container with 8px border-radius and format's signature color background
    - Display format letter ("W"/"P"/"N") in 18px 700 weight white text on colored background
    - Include description paragraph and "Export" button (btn-primary styling)
    - _Requirements: 12.3, 12.4, 18.3_

  - [x] 2.4 Refine `src/components/shared/EvidenceBadge.jsx` styling
    - Update to pill shape: `border-radius: 12px`, padding `5px 10px`, font `11px` / weight `600`
    - "High evidence": background `var(--color-success-light)` (#EAF3DE), text `var(--color-success)` (#27500A)
    - "Inference"/"Inferred": background `var(--color-warning-light)` (#FAEEDA), text `var(--color-warning)` (#633806)
    - "Low evidence": background `#F3F4F6`, text `#6B7280`
    - _Requirements: 17.1, 17.2, 17.3, 17.4_

- [x] 3. Rework StepProgressBar component
  - [x] 3.1 Refactor `src/components/StepProgressBar.jsx` with Figma-aligned circle indicators
    - Render each step as a 36px circle with centered step number, connected by 2px lines
    - Completed step: filled green (#16a34a) background, white checkmark icon, green connector line
    - Current step: 2.5px brand-colored border, white fill, brand-colored number, 4px spread brand-tinted glow (`box-shadow: 0 0 0 4px rgba(15,110,86,0.12)`)
    - Future step: 1.5px muted border (`var(--color-border-mid)`), transparent fill, muted text
    - Display "Step X of 9" label beneath current step (11px, 500 weight, brand color)
    - Add `aria-live="polite"` region for step change announcements
    - At ≤768px: render compact pill indicator "Step X of 9 · {label}" instead of full circles
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 19.3, 20.3_

- [x] 4. Checkpoint - Verify tokens and shared components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Rework Onboarding Screen
  - [x] 5.1 Update `src/components/OnboardingScreen.jsx` layout and visual hierarchy
    - Render header with "N Nexus" logo mark followed by 9-step progress indicator (use StepProgressBar)
    - Update welcome heading to 2rem/700, subtitle to 1rem/400 with secondary text color, 8px gap
    - Render 3 Capability_Cards in horizontal row: teal ShieldIcon (not emoji), 24px padding, `var(--radius-lg)`, `var(--shadow-sm)`
    - Add glossary preview in table-style layout with alternating bands (transparent / `var(--color-bg)`), term in bold brand color, definition in secondary text
    - Add "Show all glossary >" link in brand color with arrow chevron
    - Align CTAs to bottom-right: "Take a tour" outlined button (1.5px border), "Start co-creating >" filled teal button, both with 12px/28px padding
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 18.1_

- [x] 6. Rework Guided Input screens
  - [x] 6.1 Integrate PhaseStepper into `src/components/GuidedInput/GuidedInput.jsx`
    - Replace existing dot/tab indicators with PhaseStepper component
    - Pass phases array, currentPhase, and completedPhases from workflow state
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 6.2 Restyle `src/components/GuidedInput/ChatInterface.jsx` message bubbles
    - AI messages: left-aligned bubble with RobotIcon (24px circle, brand background, white glyph) to the left, background `var(--color-brand-light)`, border-radius `12px 12px 12px 4px`, padding 14px/10px
    - User messages: right-aligned bubble with background `var(--color-surface)`, 1.5px border `var(--color-border-mid)`, border-radius `12px 12px 4px 12px`
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 6.3 Restyle `src/components/GuidedInput/ReflectionCard.jsx`
    - Add green open/close quotation marks flanking "I heard you say:" heading (600 weight)
    - Apply light green left border (3px solid `var(--color-brand-pale)`)
    - Position "Edit" button aligned right
    - _Requirements: 4.4_

  - [x] 6.4 Restyle chat input area in `ChatInterface.jsx` or `GuidedInput.jsx`
    - Rounded input field with `border-radius: var(--radius-lg)`
    - MicrophoneIcon button on left, SendIcon button on right — both 36px circular touch targets
    - _Requirements: 4.5_

  - [x] 6.5 Restyle `src/components/GuidedInput/SidePanel.jsx` for "Why we're asking" content
    - "Why we're asking this" heading in 13px/600 weight, brand color
    - Contextual items as vertical list (12px spacing), bold label + secondary description
    - "High confidence" pill badge at bottom: green background (`var(--color-success-light)`), green text (`var(--color-success)`)
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 6.6 Add bottom navigation controls to Guided Input
    - Horizontal row: "Back" link-style button (left), "Skip this step" text button (center, muted, no border), "Continue →" filled brand button (right)
    - Continue button: `var(--color-brand)` bg, white text, 600 weight, `var(--radius-md)`, 12px/24px padding
    - Disabled state: opacity 0.5, cursor not-allowed
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 7. Checkpoint - Verify onboarding and guided input
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Rework Tensions Matrix screen
  - [x] 8.1 Update `src/components/steps/TensionsStep.jsx` layout and grid styling
    - Add horizontal step bar at top (numbered steps with arrows/lines, 12px text)
    - Title "Tensions and trade-offs in your model" in h2 styling (1.25rem/600)
    - Filter toggles as pill-shaped buttons (1.5px border, `var(--radius-lg)`, 8px/16px padding)
    - Column headers: uppercase 11px/700, letter-spacing 0.5px; row headers: 12px/600
    - Tension cells: 12px description text + EvidenceBadge chips below (pill 12px radius, 6px/10px padding)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 8.2 Refine tension Detail Panel in `TensionsStep.jsx`
    - Render as sticky right panel (`position: sticky; top: 20px`), `var(--radius-lg)`, `var(--shadow-md)`, 24px padding
    - "Selected tension" label: 10px uppercase, 700 weight, letter-spacing 1px, brand color
    - Tension title: 16px/600 weight
    - Evidence sources: list items with date + external link icon (↗) in muted text at 12px
    - "Resolve" button: full-width, green bg (`var(--color-brand)`), white text, 13px/600, `var(--radius-md)`, 12px vertical padding
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 9. Rework SWOT Editor screen
  - [x] 9.1 Update `src/components/steps/SwotStep.jsx` layout and 2×2 grid
    - 8-step sub-nav with 26px circle indicators connected by 12px lines (completed=checkmark+brand fill, current=brand border+light fill, future=muted border+transparent)
    - Title "Refine your SWOT" in h2 + "Edit anything ✏️" subtitle in 13px secondary
    - Four quadrant cards with semantic backgrounds: Strengths #EAF3DE, Weaknesses #FCEBEB, Opportunities #E6F1FB, Threats #FAEEDA
    - Each quadrant: matching border color, `var(--radius-md)`, header with emoji icon in 24px circle container (20% opacity bg) + label 13px/700
    - _Requirements: 9.1, 9.2, 9.3, 18.2_

  - [x] 9.2 Add hover pencil reveal and inline edit display to SWOT items
    - On hover: reveal ✏️ icon right of item text with 150ms ease background highlight transition
    - Inline editing: show "Before" value with strikethrough + "After" value below in brand color
    - _Requirements: 9.4, 9.5_

  - [x] 9.3 Add Edit Timeline panel to `SwotStep.jsx`
    - Right-side panel titled "Edit Timeline" (14px/600)
    - Edit entries: colored letter badge (S/W/O/T) as 22px circle + timestamp (11px muted) + description (12px primary)
    - "Restore" ghost button per entry (transparent bg, 1px border, 11px text)
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 10. Rework SDG Mapping screen
  - [x] 10.1 Update `src/components/steps/SDGMapperStep.jsx` grid and card styling
    - Title "How your model aligns with the UN Sustainable Development Goals" in h2 (1.25rem/600), 16px bottom margin
    - Responsive grid: `auto-fill, minmax(200px, 1fr)`
    - Each card: 5px top border in SDG's official color, SDG number, SDG name
    - Status icon top-right (24px circle): ✓ green for Strong evidence, ~ amber for Inferred, ? grey for You decide
    - Status label below card content in 11px matching status color
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 10.2 Add anti-greenwashing side panel to SDG Mapper
    - Right-side panel with bullet-point rules in 12px text
    - Amber left border (3px solid #eab308)
    - "Local relevance" dropdown filter below
    - _Requirements: 11.5_

- [x] 11. Rework Export & Audit screen
  - [x] 11.1 Convert export view to full-screen layout with FormatCards
    - Step bar showing current position at "Step 9: Export" with all previous complete
    - Title "Your business model is ready to export" in h1 (1.75rem/600)
    - Three FormatCards in horizontal row: Word (blue "W"), PowerPoint (orange "P"), Notion (dark "N")
    - Use FormatCard component created in task 2.3
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [x] 11.2 Add audit trail section and privacy banner to Export view
    - Audit trail below format cards with step indicator timeline + "Undo last change" ghost button
    - Privacy reminder banner: info icon (ℹ️), brief message, `var(--color-bg)` background, `var(--radius-md)` border-radius
    - _Requirements: 12.5, 12.6_

- [x] 12. Checkpoint - Verify all screen reworks
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Accessibility and focus state refinements
  - [x] 13.1 Audit and enforce focus-visible and ARIA patterns across all components
    - Verify `:focus-visible` renders 3px solid `var(--color-brand-mid)` outline with 2px offset on all interactive elements
    - Verify `:focus:not(:focus-visible)` suppresses outline for mouse users
    - Add `aria-live="polite"` regions to StepProgressBar and PhaseStepper for step change announcements (format: "Step {N} of {Total}: {Label}")
    - Verify contrast ratios: 4.5:1 for normal text, 3:1 for large text (18px+ or 14px+ bold)
    - Verify `prefers-reduced-motion: reduce` disables all new animations
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 15.5, 15.6_

- [ ] 14. Write rendering and accessibility tests
  - [ ]* 14.1 Write snapshot and assertion tests for shared components
    - Test Icon.jsx renders SVG elements with correct size/color props
    - Test PhaseStepper renders correct phase states (completed, current, future)
    - Test FormatCard renders icon container, description, and export button
    - Test EvidenceBadge renders correct semantic colors for each evidence level
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 3.1, 3.2, 3.3, 12.3, 12.4_

  - [ ]* 14.2 Write snapshot and assertion tests for screen components
    - Test OnboardingScreen renders 3 capability cards with ShieldIcon, glossary table, CTAs
    - Test StepProgressBar renders correct step states and "Step X of 9" label
    - Test ChatInterface renders AI/user bubbles with correct asymmetric border-radius
    - Test TensionsStep renders grid headers, filter toggles, and detail panel
    - Test SwotStep renders quadrant cards with semantic backgrounds
    - Test SDGMapperStep renders grid with status icons
    - _Requirements: 1.1, 1.3, 2.1, 2.5, 4.2, 4.3, 7.4, 9.3, 11.2_

  - [ ]* 14.3 Write accessibility and interaction tests
    - Test focus-visible outline renders on keyboard focus
    - Test focus outline suppressed on mouse click
    - Test aria-live region updates on step change in StepProgressBar
    - Test aria-live region updates on phase change in PhaseStepper
    - Test reduced motion: verify animations disabled when `prefers-reduced-motion` matches
    - Test responsive: compact pill indicator renders at <768px viewport
    - _Requirements: 20.1, 20.2, 20.3, 15.6, 19.3_

- [x] 15. Final checkpoint - Full verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- No new dependencies are introduced — all changes use existing inline styles + global CSS + React functional components
- Design tokens are updated first (Phase 1) so downstream components inherit changes automatically
- SVG icons are implemented as lightweight React components (no icon library dependency)
- All animations respect `prefers-reduced-motion: reduce` media query
- The existing testing setup (`@testing-library/react` + Jest via `react-scripts test`) is used for all tests
- Property-based testing does not apply to this visual/UI rework — tests are example-based rendering and accessibility assertions

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.4"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.1"] },
    { "id": 3, "tasks": ["5.1", "6.1", "6.2", "6.3"] },
    { "id": 4, "tasks": ["6.4", "6.5", "6.6"] },
    { "id": 5, "tasks": ["8.1", "9.1", "10.1"] },
    { "id": 6, "tasks": ["8.2", "9.2", "9.3", "10.2"] },
    { "id": 7, "tasks": ["11.1"] },
    { "id": 8, "tasks": ["11.2"] },
    { "id": 9, "tasks": ["13.1"] },
    { "id": 10, "tasks": ["14.1", "14.2", "14.3"] }
  ]
}
```
