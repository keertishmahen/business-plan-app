# Brand and icons

## Logo

| File | Use |
|---|---|
| `public/brand/symmetra-logo.png` | Full lockup (mark + "Symmetra Systems"), transparent, for light backgrounds |
| `public/brand/symmetra-mark.png` | Loop-and-fan mark only, 256 px square, for tight spaces |
| `public/favicon.png`, `public/apple-touch-icon.png` | Browser tab and home-screen icons, generated from the mark |

Always render the logo through [`src/components/shared/BrandLogo.jsx`](../../src/components/shared/BrandLogo.jsx)
(`variant="lockup" | "mark"`, `height` in px). Paths come from `LOGO_*_SRC` in
`src/constants/branding.js`, which include `PUBLIC_URL` so they work under `/business-plan-app/`.

Where it appears: main page nav and footer, dashboard header, guided-input header, API-key
screen, server-loading screen, and the resume dialog (mark).

Rules: keep the original colours; place the lockup on light surfaces only (its wordmark is dark
navy); don't stretch it — set `height` only. The app's brand colour stays green; the logo's
teal-blue sits alongside it.

To regenerate the PNGs from a new master image, crop to the artwork, convert the white
background to alpha (un-mixing edge pixels), and export the four files above at the listed sizes.

## Icons

On-screen icons are [lucide-react](https://lucide.dev) components:

- decorative icons get `aria-hidden="true"`; icon-only buttons get an `aria-label`;
- sizes: 12–14 inline with small text, 16 in buttons, 18–22 in cards;
- buttons are `inline-flex` with a gap, so put the icon next to the label; inside running text
  use `className="icon-inline"`.

**No emoji or glyph icons** (✓ ✕ ✏️ ⚠️ 📄 ⟳ ◈ …) in UI source. Typographic characters in prose are
fine: — • “ ” and → inside a sentence. Enforced by
[`src/__harness__/icons.test.js`](../../src/__harness__/icons.test.js).

Common replacements: ✓ `Check` · ✕ `X` · ✏️ `Pencil` · ⚠️ `AlertTriangle` · ℹ️ `Info` · 🔒 `Lock` ·
📄 `FileText` · 📥 `Download` · ⟳ `RefreshCw` · 💡 `Lightbulb` · → `ArrowRight` · ← `ArrowLeft`.

SDG chips show a small swatch in the official SDG colour instead of an emoji. Exported documents
(Word, PowerPoint, Markdown) use plain-text headings.
