# Requirements Document

## Introduction

The Nexus MIA Business Model Co-Pilot is a full-stack React application rebuild of an existing Streamlit prototype. The application guides users through a 9-step AI-assisted workflow to co-create sustainable, SDG-aligned business plans. The rebuild targets production-quality UI/UX based on Figma designs, incorporating conversational guided input, rich interactive visualizations, version history, multiple export formats, accessibility compliance, and voice input capabilities. The AI backend uses Google's Gemini 2.0 Flash model.

## Glossary

- **Co-Pilot**: The overall application system that orchestrates the 9-step business plan creation workflow
- **Workflow_Engine**: The subsystem managing step progression, state persistence, and generation orchestration
- **Onboarding_Screen**: The initial welcome view displaying capability cards, glossary, and entry points
- **Guided_Input**: The conversational multi-phase input system for collecting the user's business story (Business basics → Problem & solution → Your customers → Review & finish)
- **Reflection_Card**: A UI component displaying the AI's interpretation of user input with an "I heard you say" heading and edit affordance
- **Confidence_Indicator**: A visual meter showing how well the AI understands the user's input at each guided input phase
- **Inference_Panel**: A display showing AI-inferred attributes (sector, audience, SDG focus, stage, hidden stakeholder) with inline edit buttons
- **Tension_Matrix**: An interactive grid view displaying conflicts between issues from different drivers (People, Planet, Prosperity)
- **Evidence_Badge**: A label indicating the strength of evidence for a generated item (High evidence, Low evidence, Inferred)
- **SWOT_Editor**: The interactive SWOT refinement component with inline editing, version history, and an 8-step sub-process
- **SDG_Mapper**: The component displaying all 17 Sustainable Development Goals with alignment status indicators
- **Anti_Greenwashing_Panel**: A safeguard display warning users about unsubstantiated sustainability claims
- **Export_Module**: The subsystem handling document generation in multiple formats (Word, PowerPoint, Notion)
- **Audit_Trail**: A timeline view recording all AI generations, user edits, and refinement actions
- **Voice_Input**: The browser-based speech recognition system for hands-free story dictation
- **Design_System**: The CSS custom properties, component library, and typography rules governing the application's visual language
- **Gemini_Client**: The API integration layer communicating with Google's Gemini 2.0 Flash model
- **Version_History**: The edit timeline tracking all changes to generated content with restore capabilities
- **Dilemma_Triangle**: The People–Planet–Prosperity analytical framework used to structure business model analysis
- **BMC_Canvas**: The Business Model Canvas visualization showing 9 blocks (Key Partners, Key Activities, Key Resources, Value Propositions, Customer Relationships, Channels, Customer Segments, Revenue Streams, Cost Structure)

## Requirements

### Requirement 1: Onboarding Experience

**User Story:** As a first-time user, I want a welcoming onboarding screen that explains what the Co-Pilot does, so that I understand its capabilities and feel confident starting the process.

#### Acceptance Criteria

1. WHEN a user opens the application for the first time, THE Onboarding_Screen SHALL display three capability cards explaining what the Co-Pilot can do, what it cannot do, and how user data is handled.
2. WHEN the Onboarding_Screen is displayed, THE Onboarding_Screen SHALL show a glossary preview section defining key terms (SWOT, SDG, Value Proposition, Tension Matrix, BMC).
3. WHEN the user views the Onboarding_Screen, THE Onboarding_Screen SHALL present a "Take a tour" button and a "Start co-creating" button as primary calls to action.
4. WHEN the Onboarding_Screen is displayed, THE Onboarding_Screen SHALL show a step progress bar indicating all 9 steps of the workflow with their labels.
5. WHEN the user clicks "Start co-creating," THE Onboarding_Screen SHALL transition to the Guided_Input phase without requiring an API key entry screen (API key is configured via environment variable).
6. WHEN the user clicks either CTA button, THE Onboarding_Screen SHALL disable both buttons immediately to prevent duplicate transitions.

### Requirement 2: Guided Conversational Input

**User Story:** As a user with a business idea, I want a conversational guided input experience, so that I can describe my idea naturally without facing a blank text box.

#### Acceptance Criteria

1. WHEN the user begins story input, THE Guided_Input SHALL present a 4-phase flow: Business basics, Problem & solution, Your customers, and Review & finish.
2. WHILE the user is in any Guided_Input phase, THE Guided_Input SHALL display a conversational chat interface where the AI asks focused questions and the user responds.
3. WHEN the user completes a response in a Guided_Input phase, THE Guided_Input SHALL display a Reflection_Card summarizing what the AI understood with an "I heard you say" heading.
4. WHILE the user is in any Guided_Input phase, THE Guided_Input SHALL display a side panel showing "Why we're asking this" context with a Confidence_Indicator for that phase.
5. WHEN the user completes all four Guided_Input phases, THE Guided_Input SHALL compile all responses into a unified story narrative for downstream processing.
6. WHEN the user is in any Guided_Input phase, THE Guided_Input SHALL provide a voice input button that activates browser speech recognition for hands-free dictation.
7. IF the browser does not support the Web Speech API, THEN THE Guided_Input SHALL hide the voice input button and display a text-only input mode without error.
8. IF the ChatInterface fails to render, THEN THE Guided_Input SHALL display an error state and prevent phase progression until the interface loads successfully.

### Requirement 3: Voice Input

**User Story:** As a user who thinks better by speaking, I want to dictate my business story using voice input, so that I can express my ideas naturally.

#### Acceptance Criteria

1. WHEN the user activates the voice input button, THE Voice_Input SHALL begin capturing speech using the browser's Web Speech API and display a visual recording indicator.
2. WHILE the Voice_Input is recording, THE Voice_Input SHALL display a real-time transcript of recognized speech in the input field.
3. WHEN the user stops recording, THE Voice_Input SHALL finalize the transcript and place it in the text input field for review and editing.
4. IF the Voice_Input encounters a recognition error, THEN THE Voice_Input SHALL display a brief inline error message and guarantee at least one recovery option (retry voice input or switch to manual typing) is always available.

### Requirement 4: AI Inference Display

**User Story:** As a user, I want to see what the AI inferred from my story, so that I can correct misinterpretations before generation proceeds.

#### Acceptance Criteria

1. WHEN the story input is submitted, THE Inference_Panel SHALL display the AI's inferences including sector, audience, SDG focus, stage, and hidden stakeholder.
2. WHEN the Inference_Panel is displayed, THE Inference_Panel SHALL provide an inline edit button next to each inferred attribute allowing the user to correct it.
3. WHEN the user confirms the inferences with a "Looks right — generate" action, THE Workflow_Engine SHALL proceed to the Focus step using the confirmed inferences.
4. WHEN the user selects "Something's off — let me correct," THE Inference_Panel SHALL enable editing mode for all inferred attributes.

### Requirement 5: Step-by-Step Workflow Progression

**User Story:** As a user, I want to progress through 9 structured steps with clear navigation, so that I can build my business plan incrementally.

#### Acceptance Criteria

1. THE Workflow_Engine SHALL support exactly 9 sequential steps: Story Input, Driver & Focus, Issues Generation, Tension Matrix, Dilemmas & Ranking, Value Propositions, SWOT Analysis, Business Model Canvas, and Business Plan.
2. WHEN a step is completed and approved, THE Workflow_Engine SHALL automatically generate the content for the next step using all accumulated context.
3. WHILE the user is on any step, THE Co-Pilot SHALL display a step progress bar showing completed steps (checkmark), the current step (highlighted), and future steps (muted).
4. WHEN the user approves a step, THE Workflow_Engine SHALL mark that step as completed and advance to the next step.
5. WHEN the user is on a completed step, THE Workflow_Engine SHALL allow the user to navigate back to review previously completed steps without losing state.

### Requirement 6: Content Generation and Refinement

**User Story:** As a user, I want to refine AI-generated content through feedback, so that each step's output matches my intentions.

#### Acceptance Criteria

1. WHEN the Gemini_Client generates content for a step, THE Workflow_Engine SHALL display the result with a "Confirm & continue" primary action and a "Refine" secondary action.
2. WHEN the user provides refinement feedback, THE Gemini_Client SHALL regenerate the step content incorporating the feedback while maintaining the same data structure.
3. IF the Gemini_Client returns an invalid response, THEN THE Workflow_Engine SHALL display an error message with a "Try again" retry button.
4. WHILE content is being generated, THE Co-Pilot SHALL display a loading state with a contextual label indicating which step is generating; IF the step context is unavailable, THE Co-Pilot SHALL display a generic loading indicator as fallback.

### Requirement 7: Tension Matrix Visualization

**User Story:** As a user, I want to see tensions between my business goals in an interactive matrix, so that I can understand trade-offs visually.

#### Acceptance Criteria

1. WHEN tensions are generated, THE Tension_Matrix SHALL display a grid view with columns (e.g., Cost, Speed, Trust) and rows (e.g., Customer Segments, Value Proposition, Channels).
2. WHEN a tension is displayed, THE Tension_Matrix SHALL show an Evidence_Badge indicating the evidence level (High evidence, Low evidence) and an inference label.
3. WHEN the user selects a tension, THE Tension_Matrix SHALL display a detail panel showing the full explanation, affected drivers, and source information.
4. WHEN the user views a tension detail panel, THE Tension_Matrix SHALL provide a "Resolve" action button to mark the tension as addressed.

### Requirement 8: Dilemmas Ranking with Inspectable Scores

**User Story:** As a user, I want ranked dilemmas with transparent scoring, so that I can understand why certain trade-offs are prioritized.

#### Acceptance Criteria

1. WHEN dilemmas are generated, THE Co-Pilot SHALL display them ranked by importance score (severity × reversibility × reach) with circular score badges.
2. WHEN the user hovers over a score badge, THE Co-Pilot SHALL display a breakdown tooltip showing individual severity, reversibility, and reach sub-scores.
3. WHEN dilemmas are displayed, THE Co-Pilot SHALL show SDG chips with full SDG names visible on hover for each dilemma.
4. THE Co-Pilot SHALL render dilemma titles in "X vs. Y" format with affected driver badges (People, Planet, Prosperity) color-coded.

### Requirement 9: SWOT Analysis with Inline Editing

**User Story:** As a user, I want to edit and refine my SWOT analysis directly, so that I can adjust the AI's output to match my knowledge.

#### Acceptance Criteria

1. WHEN SWOT analysis is generated, THE SWOT_Editor SHALL display strengths, weaknesses, opportunities, and threats as editable bullet points.
2. WHEN the user clicks a SWOT bullet point, THE SWOT_Editor SHALL enable inline editing with rename and delete capabilities.
3. WHEN the user makes any edit to any SWOT item (including typo corrections and formatting changes), THE Version_History SHALL record the change with a timestamp and the previous value.
4. WHEN the user opens the Edit Timeline, THE Version_History SHALL display a chronological list of all edits with a "Restore Version" option for each entry.
5. THE SWOT_Editor SHALL support an 8-step sub-process: Define Purpose, Gather Insights, Identify Themes, Prioritize Topics, Analyze Factors, Draft SWOT, Refine SWOT, and Finalize.

### Requirement 10: SDG Alignment Mapping

**User Story:** As a user, I want to see how my business plan aligns with the UN Sustainable Development Goals, so that I can communicate my impact credibly.

#### Acceptance Criteria

1. WHEN SDG mapping is performed, THE SDG_Mapper SHALL display all 17 SDGs with alignment status indicators: Strong evidence (✓), Inferred (~), and You decide (?).
2. WHEN the SDG_Mapper is displayed, THE Anti_Greenwashing_Panel SHALL show safeguard warnings for any SDG alignment that lacks strong evidence.
3. WHEN the user views the SDG_Mapper, THE SDG_Mapper SHALL provide a "Local relevance" filter dropdown allowing the user to filter SDGs by geographic or contextual relevance.
4. WHEN at least one SDG has "Strong evidence" status, THE SDG_Mapper SHALL display evidence sources for all SDGs that have available evidence data.
5. IF the Anti_Greenwashing_Panel fails to load, THEN THE SDG_Mapper SHALL continue to display normally without safeguard warnings.

### Requirement 11: Business Model Canvas Visualization

**User Story:** As a user, I want my business model displayed as an interactive canvas, so that I can see all nine building blocks at a glance.

#### Acceptance Criteria

1. WHEN the BMC is generated, THE BMC_Canvas SHALL display all 9 blocks (Key Partners, Key Activities, Key Resources, Value Propositions, Customer Relationships, Channels, Customer Segments, Revenue Streams, Cost Structure) in the standard BMC layout.
2. WHEN the BMC_Canvas is displayed, THE BMC_Canvas SHALL render each block with a distinct color, icon, and list of items as semantic cards.
3. WHEN the user clicks a BMC block item, THE BMC_Canvas SHALL enable inline editing of that item.
4. IF the BMC_Canvas fails to render all 9 blocks, THEN THE Co-Pilot SHALL display an error state and prevent user interaction until the canvas can display completely.

### Requirement 12: Business Plan Generation

**User Story:** As a user, I want a comprehensive business plan synthesized from all steps, so that I have a professional document ready for stakeholders.

#### Acceptance Criteria

1. WHEN the user reaches the Business Plan step, THE Gemini_Client SHALL generate a 10-section business plan: Executive Summary, Market Opportunity, Business Model Overview, Product/Service Description, Customer & Marketing Strategy, Operations Plan, Financial & Sustainability Outlook, Key Risks & Mitigation, SDG Alignment & Impact, and Conclusion & Next Steps.
2. WHEN the business plan is displayed, THE Co-Pilot SHALL render the text as formatted markdown with headings, bullet points, and semantic structure — not raw text.
3. WHEN the business plan is displayed, THE Co-Pilot SHALL provide a refinement input allowing the user to request specific changes to the plan.

### Requirement 13: Multi-Format Export

**User Story:** As a user, I want to export my business plan in multiple formats, so that I can share it with different audiences.

#### Acceptance Criteria

1. WHEN the user requests export, THE Export_Module SHALL offer at minimum Word (.docx), PowerPoint (.pptx), and plain text formats.
2. WHEN the user exports to Word format, THE Export_Module SHALL produce a professionally formatted document including the business plan, SWOT appendix, and BMC appendix.
3. WHEN the export is generated, THE Export_Module SHALL include a privacy reminder informing the user about what data is included in the export.
4. WHEN the export completes, THE Export_Module SHALL trigger a browser download of the generated file.

### Requirement 14: Audit Trail

**User Story:** As a user, I want a record of all AI generations and my edits, so that I can review the co-creation history.

#### Acceptance Criteria

1. WHEN any AI generation or user edit occurs, THE Audit_Trail SHALL record the event with a timestamp, event type (generation, refinement, manual edit), and step context.
2. WHEN the user opens the Audit Trail view, THE Audit_Trail SHALL display events in a timeline format ordered chronologically.
3. WHEN the user views an audit event, THE Audit_Trail SHALL show a summary of what changed at that point.

### Requirement 15: Design System and Visual Quality

**User Story:** As a user, I want a polished, consistent visual experience, so that the tool feels professional and trustworthy.

#### Acceptance Criteria

1. THE Design_System SHALL use CSS custom properties for all colors, radii, shadows, and typography to ensure consistent theming.
2. THE Design_System SHALL use the DM Sans font family for body text and DM Mono for any monospace content.
3. THE Co-Pilot SHALL render all AI outputs as readable artefacts (cards with semantic chips, formatted headings, SDG badges) with no raw code or JSON visible to users.
4. WHEN technical terms appear in the UI, THE Co-Pilot SHALL provide tooltip definitions using plain language.
5. THE Co-Pilot SHALL provide plain-language subtitles for every step explaining the step's purpose in non-technical terms.

### Requirement 16: Responsive Design

**User Story:** As a user on different devices, I want the application to adapt to my screen size, so that I can use it on desktop, tablet, or mobile.

#### Acceptance Criteria

1. THE Co-Pilot SHALL adapt its layout to viewport widths from 320px (mobile) to 1920px (large desktop) without horizontal scrolling; for viewports wider than 1920px, THE Co-Pilot SHALL maintain the large desktop layout centered in the viewport.
2. WHILE the viewport width is below 768px, THE Co-Pilot SHALL collapse the step progress bar into a compact indicator showing current step number and total steps.
3. WHILE the viewport width is below 768px, THE Tension_Matrix SHALL switch from a grid layout to a stacked card layout.

### Requirement 17: Accessibility

**User Story:** As a user with accessibility needs, I want the application to be navigable with assistive technologies, so that I can use it regardless of ability.

#### Acceptance Criteria

1. THE Co-Pilot SHALL meet WCAG 2.1 Level AA requirements for color contrast (minimum 4.5:1 ratio for normal text, 3:1 for large text).
2. THE Co-Pilot SHALL support full keyboard navigation for all interactive elements with visible focus indicators.
3. THE Co-Pilot SHALL use semantic HTML (headings, landmarks, lists, buttons) and ARIA attributes where necessary to communicate structure to screen readers.
4. WHEN the Co-Pilot transitions between steps, THE Co-Pilot SHALL announce the new step to screen readers using an ARIA live region; IF the ARIA announcement mechanism fails, THEN THE Co-Pilot SHALL prevent the step transition until the announcement system recovers.

### Requirement 18: API Integration and Error Handling

**User Story:** As a user, I want reliable AI generation with clear error feedback, so that I can continue working even when issues occur.

#### Acceptance Criteria

1. THE Gemini_Client SHALL read the API key from the REACT_APP_GEMINI_API_KEY environment variable and fall back to a manual entry screen if the variable is not set.
2. WHEN the Gemini_Client receives an API error response, THE Gemini_Client SHALL display a user-friendly error message with the HTTP status and a retry option.
3. IF the Gemini_Client receives a response that cannot be parsed as valid JSON, THEN THE Gemini_Client SHALL retry the request once before displaying a parse error to the user.
4. WHILE the Gemini_Client is waiting for a response, THE Co-Pilot SHALL display a contextual loading indicator and disable the generate button to prevent duplicate requests.

### Requirement 19: State Persistence

**User Story:** As a user, I want my progress saved locally, so that I can resume my business plan if I close the browser.

#### Acceptance Criteria

1. WHEN the user completes a step or edits content, THE Workflow_Engine SHALL persist the current workflow state (completed steps, outputs, story) to browser localStorage.
2. WHEN the user returns to the application with existing saved state, THE Workflow_Engine SHALL offer to resume from the last saved position or start fresh.
3. WHEN the user chooses "Start fresh," THE Workflow_Engine SHALL clear all persisted state and return to the Onboarding_Screen.

### Requirement 20: Design Principles Compliance

**User Story:** As a user, I want every interaction to follow the co-creation design principles, so that the experience feels collaborative rather than automated.

#### Acceptance Criteria

1. WHEN AI content is generated, THE Co-Pilot SHALL attach refinement actions directly tied to the content (e.g., "edit this tension," "ask for alternative," "ask a follow-up") following the "Make co-creation legible" principle; IF the refinement action system is unavailable, THEN THE Co-Pilot SHALL prevent content generation until the system recovers.
2. WHEN the AI generates inferences, THE Co-Pilot SHALL display them transparently with edit affordances following the "Show what the agent inferred" principle.
3. THE Co-Pilot SHALL render all outputs as formatted readable artefacts (cards, chips, badges) following the "Render outputs as readable artefacts" principle.
4. WHEN ranked items are displayed, THE Co-Pilot SHALL show circular score badges with hover-to-inspect breakdowns following the "Make ranking and codes inspectable" principle.
5. THE Co-Pilot SHALL display conversational nudges and "What's next" prompts following the "Make co-creation legible" principle rather than presenting a static interface.
