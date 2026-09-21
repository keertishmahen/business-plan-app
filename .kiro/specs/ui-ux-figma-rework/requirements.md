# Requirements Document

## Introduction

This specification covers the visual and interaction design rework of the Nexus MIA Business Model Co-Pilot application to match high-fidelity Figma designs. The rework targets six key screens (Onboarding, Guided Idea Input, Tensions Matrix, SWOT Refinement, SDG Mapping, and Export & Audit) and addresses visual refinement, component elegance, layout precision, micro-interactions, and information hierarchy. All existing functionality is preserved — this is purely a UI/UX polish pass to elevate the application from functional to professional quality.

## Glossary

- **Design_System**: The CSS custom properties, component tokens, and shared visual rules governing the application's appearance
- **Onboarding_Screen**: The initial welcome view displaying capability cards, glossary preview, step indicator, and entry point CTAs
- **Guided_Input**: The conversational multi-phase input system collecting the user's business story through chat interaction
- **Tensions_Matrix**: The interactive grid displaying conflicts between business model drivers with a detail panel
- **SWOT_Editor**: The SWOT refinement component with 2×2 grid, inline editing, and edit timeline
- **SDG_Mapper**: The component displaying all 17 Sustainable Development Goals with alignment indicators
- **Export_View**: The final export screen with format cards, audit trail section, and privacy reminder
- **Step_Progress_Bar**: The horizontal navigation showing numbered circles with connecting lines indicating workflow position
- **Phase_Stepper**: The horizontal stepper within Guided Input showing numbered phases with connecting lines
- **Capability_Card**: A card component on the onboarding screen displaying grouped information with a teal shield icon
- **Reflection_Card**: A UI card displaying the AI's interpretation of user input with green quote marks and an Edit button
- **Evidence_Badge**: A chip-style label indicating evidence strength (High evidence, Low evidence, Inference) with semantic coloring
- **Tension_Cell**: An individual cell within the Tensions Matrix grid containing description text and badge chips
- **Detail_Panel**: A sticky right-side panel showing expanded information for a selected item
- **Format_Card**: A clickable card on the Export View representing a document format option (Word, PowerPoint, Notion)
- **Micro_Interaction**: A subtle animation or transition applied on hover, focus, or state change to communicate interactivity
- **Typography_Hierarchy**: The structured scale of font sizes, weights, and colors establishing visual importance
- **Border_Radius_Token**: A CSS custom property defining consistent corner rounding values across the application
- **Shadow_Token**: A CSS custom property defining consistent box-shadow values for elevation levels

## Requirements

### Requirement 1: Onboarding Screen Visual Refinement

**User Story:** As a first-time user, I want the onboarding screen to feel elegant and inviting with a clear visual hierarchy, so that I immediately trust the professionalism of the tool.

#### Acceptance Criteria

1. WHEN the Onboarding_Screen is displayed, THE Design_System SHALL render the header with a "N Nexus" logo mark followed by a 9-step progress indicator showing numbered circles (1–9) connected by lines with a "Step X of 9" label beneath each circle.
2. WHEN the Onboarding_Screen is displayed, THE Onboarding_Screen SHALL render the welcome heading at 2rem font-size with 700 weight and a subtitle at 1rem with 400 weight and secondary text color, with 8px vertical spacing between them.
3. WHEN the Onboarding_Screen is displayed, THE Onboarding_Screen SHALL render exactly three Capability_Cards in a horizontal row with teal shield icons (not emoji), each card having 24px internal padding, var(--radius-lg) border radius, and var(--shadow-sm) elevation.
4. WHEN the Onboarding_Screen is displayed, THE Onboarding_Screen SHALL render a glossary preview section in a clean table-style layout with alternating subtle background bands (transparent and var(--color-bg)), each row showing term in bold brand color and definition in secondary text.
5. WHEN the Onboarding_Screen is displayed, THE Onboarding_Screen SHALL display a "Show all glossary >" link below the glossary preview styled as a text link in brand color with an arrow chevron.
6. WHEN the Onboarding_Screen is displayed, THE Onboarding_Screen SHALL render two CTAs aligned to the bottom-right: "Take a tour" as an outlined button with 1.5px border and "Start co-creating >" as a filled teal button, both with 12px vertical and 28px horizontal padding.

### Requirement 2: Step Progress Indicator Refinement

**User Story:** As a user navigating the 9-step workflow, I want the progress bar to look precise and polished with connected numbered circles, so that I always know where I am in the process.

#### Acceptance Criteria

1. THE Step_Progress_Bar SHALL render each step as a 36px diameter circle with the step number centered inside, connected by 2px-height lines spanning the full gap between circles.
2. WHEN a step is completed, THE Step_Progress_Bar SHALL render that circle with a filled green (#16a34a) background and a white checkmark, and the connecting line to the next step shall also be green.
3. WHEN a step is the current active step, THE Step_Progress_Bar SHALL render that circle with a brand-colored (#0F6E56) 2.5px border, white fill, brand-colored number text, and a 4px spread brand-tinted outer glow (box-shadow: 0 0 0 4px rgba(15,110,86,0.12)).
4. WHEN a step is a future step, THE Step_Progress_Bar SHALL render that circle with a 1.5px muted border (var(--color-border-mid)), transparent fill, and muted text color.
5. THE Step_Progress_Bar SHALL display a "Step X of 9" label beneath the current step circle in 11px font-size with 500 weight in brand color.

### Requirement 3: Guided Input Phase Stepper

**User Story:** As a user entering my business idea, I want the phase stepper to clearly show my progress with numbered circles and connecting lines, so that I understand the multi-step flow.

#### Acceptance Criteria

1. WHEN the Guided_Input is displayed, THE Phase_Stepper SHALL render a horizontal bar with four numbered circles (1–4) connected by horizontal lines, each circle 28px diameter with the phase number centered inside.
2. WHEN a phase is completed, THE Phase_Stepper SHALL render that circle with a filled brand-color background and white number text.
3. WHEN a phase is the current active phase, THE Phase_Stepper SHALL render that circle with a brand-color 2.5px border stroke and transparent fill with the number in brand color.
4. THE Phase_Stepper SHALL display phase labels ("1. Business basics", "2. Problem & solution", "3. Your customers", "4. Review & finish") below the circles, with the active phase label in 600 weight and primary text color and inactive labels in 400 weight and muted text color.
5. THE Phase_Stepper SHALL render connecting lines between circles at 2px height, colored brand-green for completed segments and var(--color-border) for uncompleted segments.

### Requirement 4: Chat Interface Polish

**User Story:** As a user interacting with the AI conversationally, I want the chat to feel like a professional messaging interface with distinct AI and user message bubbles, so that the interaction feels natural.

#### Acceptance Criteria

1. WHEN an AI message is displayed, THE Guided_Input SHALL render it in a left-aligned speech bubble with a teal robot icon (24px circle with brand background and white robot glyph) positioned to the left of the bubble.
2. WHEN an AI message bubble is rendered, THE Guided_Input SHALL apply a background of var(--color-brand-light), border-radius of 12px 12px 12px 4px (rounded except bottom-left), 14px horizontal padding, and 10px vertical padding.
3. WHEN a user message is displayed, THE Guided_Input SHALL render it in a right-aligned bubble with background var(--color-surface), a 1.5px solid var(--color-border-mid) border, and border-radius of 12px 12px 4px 12px (rounded except bottom-right).
4. WHEN the Reflection_Card is displayed, THE Guided_Input SHALL render it with green open-and-close quotation marks flanking an "I heard you say:" heading in 600 weight, a light green left border (3px solid var(--color-brand-pale)), and an "Edit" button aligned right.
5. WHEN the text input area is displayed, THE Guided_Input SHALL render a rounded input field (border-radius var(--radius-lg)) with a microphone icon button on the left and a teal send arrow button on the right, both 36px circular touch targets.

### Requirement 5: Guided Input Side Panel

**User Story:** As a user answering questions, I want contextual explanations visible in a side panel so that I understand why each question matters.

#### Acceptance Criteria

1. WHILE the user is in any Guided_Input phase, THE Guided_Input SHALL display a right-side panel with a "Why we're asking this" heading in 13px font with 600 weight and brand color.
2. WHEN the side panel is displayed, THE Guided_Input SHALL render contextual explanation items (Value Proposition, Customer Segments, Channels) as a vertical list with 12px spacing, each item having a bold label and a secondary-colored description line.
3. WHEN the side panel is displayed, THE Guided_Input SHALL render a "High confidence" indicator at the bottom of the panel styled as a pill badge with a green background (var(--color-success-light)) and green text (var(--color-success)).

### Requirement 6: Guided Input Bottom Navigation

**User Story:** As a user moving through guided input phases, I want clear navigation controls to go back, skip, or continue, so that I feel in control of my pace.

#### Acceptance Criteria

1. WHEN the bottom navigation is displayed, THE Guided_Input SHALL render three controls in a horizontal row: a "Back" link-style button on the left, a "Skip this step" text button in the center (muted color, no border), and a "Continue →" filled brand button on the right.
2. WHEN the "Continue →" button is enabled, THE Guided_Input SHALL apply a background of var(--color-brand), white text, 600 weight, var(--radius-md) border radius, and 12px vertical / 24px horizontal padding.
3. WHEN the "Continue →" button is disabled, THE Guided_Input SHALL reduce opacity to 0.5 and set cursor to not-allowed.

### Requirement 7: Tensions Matrix Layout Refinement

**User Story:** As a user analyzing tensions, I want the matrix to look like a professional data visualization with a clean grid and clear cell boundaries, so that I can quickly scan trade-offs.

#### Acceptance Criteria

1. WHEN the Tensions_Matrix is displayed, THE Tensions_Matrix SHALL render a clean horizontal step bar at the top with numbered steps (1 Problem → 2 Customers → ... → 5 Tensions → 6 Next steps) using 12px text connected by arrows or lines.
2. WHEN the Tensions_Matrix is displayed, THE Tensions_Matrix SHALL render a title "Tensions and trade-offs in your model" in h2 styling (1.25rem, 600 weight) with a subtitle in secondary text color below it.
3. WHEN the Tensions_Matrix is displayed, THE Tensions_Matrix SHALL render filter toggles ("Show evidence only" / "Show inferences only") as pill-shaped toggle buttons with 1.5px border, var(--radius-lg) border-radius, and 8px vertical / 16px horizontal padding.
4. WHEN the tension grid is rendered, THE Tensions_Matrix SHALL display column headers (Cost, Speed, Trust) in uppercase 11px font with 700 weight and letter-spacing 0.5px, and row headers (Customer Segments, Value Proposition, Channels) in 12px font with 600 weight.
5. WHEN a Tension_Cell is rendered, THE Tensions_Matrix SHALL display the cell with description text in 12px and one or more Evidence_Badge chips below it, each badge being a rounded pill (border-radius 12px) with 6px vertical / 10px horizontal padding and semantic background colors.

### Requirement 8: Tension Detail Panel Refinement

**User Story:** As a user inspecting a tension, I want the detail panel to feel premium with clear information sections, so that I can quickly understand and resolve the tension.

#### Acceptance Criteria

1. WHEN a tension is selected, THE Detail_Panel SHALL render as a sticky right panel (position: sticky, top: 20px) with var(--radius-lg) border radius, var(--shadow-md) box shadow, and 24px internal padding.
2. WHEN the Detail_Panel displays a selected tension, THE Detail_Panel SHALL show a "Selected tension" label in 10px uppercase with 700 weight and letter-spacing 1px in brand color, followed by the tension title in 16px with 600 weight.
3. WHEN evidence sources are displayed, THE Detail_Panel SHALL render each source as a list item with a date string and an external link icon (↗) in muted text at 12px font-size.
4. WHEN the "Resolve" button is displayed, THE Detail_Panel SHALL render it as a full-width button with green background (var(--color-brand)), white text, 13px font, 600 weight, var(--radius-md) border radius, and 12px vertical padding.

### Requirement 9: SWOT Editor Visual Refinement

**User Story:** As a user refining my SWOT analysis, I want the 2×2 grid to look clean and the edit interactions to feel smooth, so that inline editing is intuitive.

#### Acceptance Criteria

1. WHEN the SWOT_Editor is displayed, THE SWOT_Editor SHALL render an 8-step sub-navigation bar with numbered circle indicators (26px diameter) connected by 12px lines, where completed steps show a checkmark on brand-colored fill, the current step shows brand border with light fill, and future steps show muted border with transparent fill.
2. WHEN the SWOT_Editor is displayed, THE SWOT_Editor SHALL render a title "Refine your SWOT" in h2 styling with an "Edit anything ✏️" subtitle in 13px secondary text color.
3. WHEN the SWOT 2×2 grid is rendered, THE SWOT_Editor SHALL render four quadrant cards with distinct semantic backgrounds (Strengths: #EAF3DE, Weaknesses: #FCEBEB, Opportunities: #E6F1FB, Threats: #FAEEDA), each with matching border color, var(--radius-md) border radius, and a header showing the quadrant emoji icon and label in 13px 700 weight.
4. WHEN a SWOT item is hovered, THE SWOT_Editor SHALL reveal a pencil edit icon (✏️) to the right of the item text with a subtle background highlight transition (150ms ease).
5. WHEN a SWOT item is being edited inline, THE SWOT_Editor SHALL display a Before value with strikethrough styling and an After value below it in brand color, clearly showing the change.

### Requirement 10: SWOT Edit Timeline Panel

**User Story:** As a user tracking my SWOT changes, I want a clean edit timeline panel showing what I changed and when, so that I can restore previous versions confidently.

#### Acceptance Criteria

1. WHEN the Edit Timeline panel is displayed, THE SWOT_Editor SHALL render a right-side panel titled "Edit Timeline" in 14px 600 weight with a scrollable list of edit entries.
2. WHEN an edit entry is displayed, THE SWOT_Editor SHALL render a colored letter badge (S/W/O/T) as a 22px circle with the corresponding quadrant color, followed by a timestamp in 11px muted text and a change description in 12px primary text.
3. WHEN an edit entry is displayed, THE SWOT_Editor SHALL render a "Restore" button styled as a ghost button (transparent background, 1px border, 11px text) aligned to the right of each entry.

### Requirement 11: SDG Mapping Screen Refinement

**User Story:** As a user reviewing SDG alignment, I want the 17 SDG cards to look like a professional dashboard with clear status indicators, so that I can quickly assess my impact credibility.

#### Acceptance Criteria

1. WHEN the SDG_Mapper is displayed, THE SDG_Mapper SHALL render the title "How your model aligns with the UN Sustainable Development Goals" in h2 styling (1.25rem, 600 weight) with appropriate bottom margin (16px).
2. WHEN the SDG grid is rendered, THE SDG_Mapper SHALL display 17 SDG cards in a responsive grid (auto-fill, minmax(200px, 1fr)) where each card has a colored header strip (5px top border in the SDG's official color), the SDG number, and the SDG name.
3. WHEN an SDG card is rendered, THE SDG_Mapper SHALL display a status icon in the top-right corner: ✓ (green circle) for Strong evidence, ~ (amber circle) for Inferred, and ? (grey circle) for You decide — each icon being 24px diameter with matching colored background.
4. WHEN an SDG card is rendered, THE SDG_Mapper SHALL display a status label below the card content ("Strong evidence", "You decide", "Inferred") in 11px text with the corresponding status color.
5. WHEN the Anti_Greenwashing_Panel is displayed, THE SDG_Mapper SHALL render it as a right-side panel with bullet-point rules in 12px text, an amber left border (3px solid #eab308), and a "Local relevance" dropdown filter below it.

### Requirement 12: Export & Audit Screen Refinement

**User Story:** As a user ready to export my business plan, I want the export screen to feel celebratory and clear with distinct format options, so that I feel accomplished and can choose my preferred format confidently.

#### Acceptance Criteria

1. WHEN the Export_View is displayed, THE Export_View SHALL render a step bar showing the current position at "Step 9: Export" with all previous steps marked complete.
2. WHEN the Export_View is displayed, THE Export_View SHALL render the title "Your business model is ready to export" in h1 styling (1.75rem, 600 weight) conveying accomplishment.
3. WHEN the Export_View is displayed, THE Export_View SHALL render three Format_Cards in a horizontal row: Word document (with a blue "W" icon), PowerPoint slides (with an orange "P" icon), and Notion page (with a dark "N" icon) — each card with a description paragraph and an "Export" button.
4. WHEN a Format_Card is rendered, THE Export_View SHALL apply var(--radius-lg) border radius, var(--shadow-sm) elevation, 24px padding, and a 1px solid var(--color-border) outline, with the icon rendered as a 40px square with 8px border-radius and the format's signature color as background.
5. WHEN the audit trail section is displayed, THE Export_View SHALL render it below the format cards with a step indicator timeline and an "Undo last change" button styled as a ghost button.
6. WHEN the privacy reminder is displayed, THE Export_View SHALL render a banner with an info icon (ℹ️), a brief privacy message, and a subtle background (var(--color-bg)) with var(--radius-md) border radius.

### Requirement 13: Global Typography Hierarchy

**User Story:** As a user reading content throughout the application, I want consistent typographic hierarchy so that I can quickly scan and distinguish headings, body text, labels, and captions.

#### Acceptance Criteria

1. THE Design_System SHALL define and apply the following typography scale consistently: H1 at 1.75rem/700 weight, H2 at 1.25rem/600 weight, H3 at 1rem/500 weight, body text at 0.875rem/400 weight, small labels at 0.75rem/500 weight, and captions at 0.6875rem/400 weight.
2. THE Design_System SHALL use var(--color-text-primary) (#1A1A18) for headings and primary content, var(--color-text-secondary) (#5C5C58) for body text and descriptions, and var(--color-text-muted) (#6E6E69) for labels, timestamps, and meta information.
3. THE Design_System SHALL apply line-height of 1.25 for H1, 1.35 for H2, 1.4 for H3, and 1.65 for body text and paragraphs across all screens.

### Requirement 14: Card Component Elevation System

**User Story:** As a user scanning card-based layouts, I want cards to have consistent elevation and border treatment so that the interface feels cohesive and layered.

#### Acceptance Criteria

1. THE Design_System SHALL define three elevation levels: Level 1 (var(--shadow-sm): 0 1px 3px rgba(0,0,0,0.06)) for inline cards, Level 2 (var(--shadow-md): 0 4px 12px rgba(0,0,0,0.08)) for floating panels and modals, and Level 3 (0 8px 24px rgba(0,0,0,0.12)) for overlay elements.
2. WHEN a card component is rendered, THE Design_System SHALL apply var(--radius-lg) (14px) border-radius, 1px solid var(--color-border) outline, white background, and Level 1 shadow as the default card appearance.
3. WHEN a card is hovered (where the card is interactive), THE Design_System SHALL transition the shadow from Level 1 to Level 2 over 200ms ease, and shift the border color from var(--color-border) to var(--color-border-mid).

### Requirement 15: Micro-Interactions and Transitions

**User Story:** As a user interacting with buttons, cards, and panels, I want subtle animations to acknowledge my actions so that the interface feels responsive and alive.

#### Acceptance Criteria

1. WHEN a primary button is hovered, THE Design_System SHALL apply a background darkening transition (150ms ease) and a subtle translateY(-1px) lift effect.
2. WHEN a secondary or ghost button is hovered, THE Design_System SHALL apply a background fill transition to var(--color-bg) over 150ms ease.
3. WHEN a panel or drawer opens, THE Design_System SHALL apply a fadeIn animation (opacity 0→1 combined with translateY(8px→0px)) over 250ms ease.
4. WHEN a step transition occurs in the workflow, THE Design_System SHALL apply a horizontal slide-in animation (translateX(16px→0px) with opacity 0→1) over 300ms ease for the incoming content.
5. WHEN an interactive element receives keyboard focus, THE Design_System SHALL apply a visible focus ring (3px solid var(--color-brand-mid), 2px offset) with immediate appearance (no transition delay).
6. WHILE the user has enabled reduced motion (prefers-reduced-motion: reduce), THE Design_System SHALL disable all animations and transitions, rendering state changes immediately without motion.

### Requirement 16: Color and Spacing Consistency

**User Story:** As a user moving between screens, I want spacing and color usage to be consistent so that the application feels unified rather than a collection of different pages.

#### Acceptance Criteria

1. THE Design_System SHALL use the spacing scale consistently: 4px for inline gaps, 8px for tight component spacing, 16px for standard component spacing, 24px for section padding, 32px for major section gaps, and 48px for page-level vertical spacing.
2. THE Design_System SHALL use var(--color-brand) (#0F6E56) as the primary action color for filled buttons, active indicators, and primary badges; var(--color-brand-light) (#E1F5EE) as the highlight and selection background; and var(--color-brand-pale) (#9FE1CB) for decorative accents.
3. THE Design_System SHALL apply var(--color-bg) (#F7F7F5) as the page background, var(--color-surface) (#FFFFFF) as the card and panel background, and var(--color-border) (rgba(0,0,0,0.08)) as the default divider and border color.
4. THE Design_System SHALL use semantic colors consistently: var(--color-danger) (#A32D2D) for errors and destructive actions, var(--color-success) (#27500A) for confirmations and positive states, and var(--color-warning) (#633806) for caution indicators.

### Requirement 17: Badge and Chip Component Refinement

**User Story:** As a user scanning evidence levels and tags, I want badges and chips to be visually distinct and easy to read at a glance, so that I can quickly assess confidence levels.

#### Acceptance Criteria

1. WHEN an Evidence_Badge is rendered, THE Design_System SHALL style it as a pill shape (border-radius 12px) with 5px vertical and 10px horizontal padding, 11px font-size, 600 weight, and a background color matching its semantic level (green for High evidence, amber for Medium/Inferred, grey for Low evidence).
2. WHEN an Evidence_Badge with "High evidence" level is rendered, THE Design_System SHALL apply background var(--color-success-light) (#EAF3DE) and text color var(--color-success) (#27500A).
3. WHEN an Evidence_Badge with "Inference" or "Inferred" level is rendered, THE Design_System SHALL apply background var(--color-warning-light) (#FAEEDA) and text color var(--color-warning) (#633806).
4. WHEN an Evidence_Badge with "Low evidence" level is rendered, THE Design_System SHALL apply background #F3F4F6 and text color #6B7280.

### Requirement 18: Icon System Upgrade

**User Story:** As a user viewing the interface, I want professional iconography instead of emoji placeholders so that the application looks polished and intentional.

#### Acceptance Criteria

1. WHEN the Onboarding_Screen capability cards are rendered, THE Onboarding_Screen SHALL replace emoji icons (✅, 🚫, 🔒) with teal-colored SVG shield icons (or equivalent professionally designed icon set) rendered at 32px with consistent stroke width.
2. WHEN the SWOT quadrant headers are rendered, THE SWOT_Editor SHALL use styled emoji icons (💪, 🔗, 🚀, ⚠️) at 16px with a circular background container (24px, matching quadrant color at 20% opacity) for visual containment.
3. WHEN the Export_View format cards are rendered, THE Export_View SHALL use colored icon containers (40px square, 8px border-radius) with the first letter of each format ("W" in blue, "P" in orange, "N" in dark) rendered in 18px 700 weight white text on the colored background.

### Requirement 19: Responsive Layout Precision

**User Story:** As a user on different screen sizes, I want layouts to adapt gracefully to my viewport so that the experience is consistent across devices.

#### Acceptance Criteria

1. WHEN the viewport width is 1024px or wider, THE Design_System SHALL render two-panel layouts (chat + side panel, grid + detail panel) as side-by-side columns with the main content area taking flexible width and the side panel fixed at 300px.
2. WHEN the viewport width is between 768px and 1023px, THE Design_System SHALL collapse two-panel layouts into a single column with the side panel moving below the main content.
3. WHEN the viewport width is below 768px, THE Step_Progress_Bar SHALL collapse into a compact pill indicator showing "Step X of 9 · {label}" in centered text with var(--radius-md) border radius and var(--color-surface) background.
4. WHEN the viewport width is below 768px, THE Tensions_Matrix SHALL switch from a grid table layout to vertically stacked Tension_Cell cards, each full-width with 16px margin-bottom.

### Requirement 20: Focus States and Accessibility Visual Indicators

**User Story:** As a keyboard user or screen reader user, I want clearly visible focus indicators on all interactive elements so that I can track my position in the interface.

#### Acceptance Criteria

1. WHEN any interactive element receives keyboard focus (via :focus-visible), THE Design_System SHALL apply a 3px solid var(--color-brand-mid) outline with 2px offset that does not overlap element content.
2. WHEN a mouse user clicks an interactive element (focus without :focus-visible), THE Design_System SHALL suppress the focus outline to avoid visual clutter for pointer users.
3. WHEN the active step changes in the Step_Progress_Bar or Phase_Stepper, THE Design_System SHALL announce the change to screen readers using an aria-live="polite" region with the format "Step {N} of {Total}: {Label}".
4. THE Design_System SHALL ensure all text content maintains a minimum contrast ratio of 4.5:1 against its background for normal text and 3:1 for large text (18px+ or 14px+ bold) per WCAG 2.1 AA.
