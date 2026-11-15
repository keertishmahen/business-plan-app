// Harness rule: UI icons are lucide-react components, never emoji or glyphs.
// See docs/design-docs/brand-and-icons.md.
const fs = require("fs");
const { uiSourceFiles, withoutComments, rel } = require("./sourceFiles");

// Emoji, plus symbol glyphs that were used as stand-in icons. Typographic
// characters in prose (— • “ ” and → inside sentences) are allowed.
const PICTOGRAPHIC = new RegExp("\\p{Extended_Pictographic}", "u");
const GLYPH_ICONS = /[✓✔✕✖✗✘✏⟳◈◉▣▦▶►●⧉⊛⊞⬡✦⏳ℹ⚠]/u;

function findIconGlyphs() {
  const hits = [];
  for (const file of uiSourceFiles()) {
    const lines = withoutComments(fs.readFileSync(file, "utf8")).split("\n");
    lines.forEach((line, i) => {
      for (const ch of line) {
        if (PICTOGRAPHIC.test(ch) || GLYPH_ICONS.test(ch)) {
          hits.push(`${rel(file)}:${i + 1}  "${ch}" (U+${ch.codePointAt(0).toString(16).toUpperCase()})`);
          break;
        }
      }
    });
  }
  return hits;
}

test("UI source uses lucide-react icons instead of emoji or glyph icons", () => {
  const hits = findIconGlyphs();
  if (hits.length) {
    throw new Error(
      `Found ${hits.length} emoji/glyph icon(s) in UI source:\n  ${hits.join("\n  ")}\n\n` +
        "Fix: import an icon from \"lucide-react\" (e.g. Check, X, ArrowRight, AlertTriangle) and render it " +
        "with aria-hidden=\"true\" next to the text. For exported documents use plain-text headings. " +
        "See docs/design-docs/brand-and-icons.md."
    );
  }
});
