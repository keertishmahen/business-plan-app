# Design System v3 — "Liquid Glass" · Full Visual Revamp

An Apple-inspired spatial light theme: every panel in the dashboard is now true frosted
glass (heavy backdrop blur + saturation, hairline white borders, layered cool-navy depth)
floating over an ambient, slowly drifting aurora canvas. One signature element carries the
identity — the glowing indigo→cyan **conduit thread** — appearing as the hairline crowning
the sticky header, the fill of the progress bar, and the connectors that light up between
completed steps in the workflow stepper.

## What changed

**Tokens (`src/index.css`)** — the entire `:root` layer was re-cut. New brand conduit
(electric indigo `#2E5CFF` → azure `#4C7DFF` → cyan `#2BC8E8`), violet AI accent `#7A5CFA`,
porcelain canvas `#EEF2F9`, cooler ink scale, larger spatial radii (10/14/20/28), real glass
tokens (`blur(24px) saturate(1.8)` with inner white highlight), and cool layered shadows.
Every variable *name* is unchanged, so all components retheme automatically.

**Type** — display face is now **Sora** (geometric, soft, futuristic), body stays **Inter**,
mono is **JetBrains Mono**.

**Canvas** — `body::before` renders four soft aurora orbs (azure / cyan / violet / rose)
that drift over 36 s; disabled under `prefers-reduced-motion`.

**Chrome** — sticky header gets heavy glass blur plus the conduit hairline; primary buttons
are luminous gradient capsules with an azure glow; secondary/ghost buttons are frosted glass;
inputs get an azure focus halo.

**Dashboard panels (`src/styles/corporate.css`)** — `corp-card` (sidebar, main canvas,
context panel) is now frosted glass with 28 px radius; metric wells are inset glass; the
step navigator became a floating glass dock — the active step is a gradient tile with a soft
glow and completed connectors light up as the conduit. SWOT quadrants, BMC blocks, value-prop
tabs and the dilemmas explainer are all translucent glass with inner highlights.

**Color hygiene** — ~90 hard-coded brand hexes across the JSX were replaced with
`var(--color-brand*)` tokens, so future rethemes are one-file changes. Semantically *green*
elements (Planet driver, SDG agent, Social & Environmental Benefit block) deliberately keep
their emerald identity via `--color-planet`, now harmonized to `#0E8A66`.

**Verified** — `npm run build` compiles cleanly; no component or class names changed, so all
tests and markup are untouched.

---

# Design System v2 — "Aurora Console" · Bug-fix & UI/UX Modernization

## Bugs fixed (build now passes with CI strict mode, zero warnings)
1. `src/App.jsx` — removed unused `setStep`, `setWorkflowStory`, `savedState` (no-unused-vars).
2. `src/components/StepNav.jsx` — removed unused `currentIdx`.
3. `src/components/dashboard/MIADashboard.jsx` — removed unused `showInsights` prop.
4. `src/components/steps/FocusStep.jsx` — removed redundant `role="form"` (jsx-a11y).
5. `src/components/steps/SDGMapperStep.jsx` — removed redundant `role="complementary"` on `<aside>` (jsx-a11y).
6. `ApiKeyScreen` — loading state previously overrode the button style with a hard-coded pale green,
   breaking contrast; now uses the design-system disabled state.
7. Removed stale `build_output.txt` and `debug.log` from the repo root.

## UI/UX modernization
**Theme: "Aurora Console"** — a light, futuristic system: aurora gradient canvas,
frosted-glass surfaces, an emerald→cyan→violet "conduit" accent, capsule controls,
and Space Grotesk display type paired with Inter body text.

### Design tokens (`src/index.css`)
- New palette (emerald #0B7A5C → cyan #0FB5CE conduit, violet #6D5EF3 agent accent),
  refreshed People/Planet/Prosperity trio, higher-contrast ink colors.
- Space Grotesk (display) + Inter (body) + DM Mono (labels) via Google Fonts.
- Softer radius scale with pill buttons, refined glass + glow shadows,
  fixed aurora mesh background.
- All legacy hard-coded brand greens across 20 files migrated to the new palette
  so every screen (GuidedInput, MIA Dashboard, Tour, Export, steps) picks up the theme.

### Component rework (alignment fixes)
- **StepProgressBar → "conduit" rail**: continuous flexible track that always spans the
  bar evenly (the old fixed 76px columns caused label overflow and misalignment),
  gradient-lit links for completed steps, pulsing glow on the current node,
  SVG checkmarks, and a clean caption row (`STEP X / 9` + current label).
  Mobile keeps the compact pill.
- **WorkflowShell**: inline ad-hoc styles replaced with a class-based layout;
  sticky frosted-glass top bar holding the progress conduit; gradient step glyph;
  consistent vertical rhythm; pill Audit Trail button with gradient badge.
- **FeedbackBar → glass feedback dock**: frosted panel, quick-action chips,
  aligned input + action row that wraps correctly on small screens.
- **ApiKeyScreen → aurora entry screen**: glowing gradient orbs, glass tiles and
  form card, gradient headline, proper `label htmlFor` and `role="alert"` on errors.

### Accessibility & quality floor
- Visible keyboard focus rings on all buttons/inputs (new focus-visible styles).
- `prefers-reduced-motion` respected globally.
- All existing ARIA live regions, labels, and the skip link preserved.
- 178/178 tests pass; production build compiles with zero warnings.
