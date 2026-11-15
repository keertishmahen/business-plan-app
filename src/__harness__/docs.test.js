// Harness rule: the knowledge base stays navigable. Every relative link in
// AGENTS.md and docs/ resolves, required docs exist, and each docs folder with an
// index.md lists every document in it. See AGENTS.md.
const fs = require("fs");
const path = require("path");
const { REPO_ROOT, walk } = require("./sourceFiles");

const DOCS = path.join(REPO_ROOT, "docs");

const REQUIRED = [
  "AGENTS.md",
  "docs/ARCHITECTURE.md",
  "docs/RUNBOOK.md",
  "docs/QUALITY_SCORE.md",
  "docs/design-docs/index.md",
  "docs/design-docs/core-beliefs.md",
  "docs/design-docs/brand-and-icons.md",
  "docs/product-specs/index.md",
  "docs/exec-plans/index.md",
  "docs/exec-plans/tech-debt-tracker.md",
];

function markdownFiles() {
  return [path.join(REPO_ROOT, "AGENTS.md"), ...walk(DOCS).filter((f) => f.endsWith(".md"))];
}

function relativeLinks(text) {
  const links = [];
  const pattern = /\[[^\]]*\]\(([^)\s]+)\)/g;
  let match;
  while ((match = pattern.exec(text))) {
    const target = match[1];
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    links.push(target.split("#")[0]);
  }
  return links;
}

const relPath = (f) => path.relative(REPO_ROOT, f).split(path.sep).join("/");

test("required knowledge-base files exist", () => {
  const missing = REQUIRED.filter((f) => !fs.existsSync(path.join(REPO_ROOT, f)));
  if (missing.length) {
    throw new Error(
      `Missing docs:\n  ${missing.join("\n  ")}\n\nFix: restore the file — AGENTS.md and the harness depend on it.`
    );
  }
});

test("every relative link in AGENTS.md and docs/ resolves", () => {
  const broken = [];
  for (const file of markdownFiles()) {
    for (const link of relativeLinks(fs.readFileSync(file, "utf8"))) {
      if (!link) continue;
      if (!fs.existsSync(path.resolve(path.dirname(file), link))) broken.push(`${relPath(file)} → ${link}`);
    }
  }
  if (broken.length) {
    throw new Error(
      `Broken links:\n  ${broken.join("\n  ")}\n\nFix: update the link to the file's current path, or restore the target.`
    );
  }
});

test("each docs folder index lists every document in that folder", () => {
  const unlisted = [];
  const indexes = walk(DOCS).filter((f) => path.basename(f) === "index.md");
  for (const index of indexes) {
    const dir = path.dirname(index);
    const linked = new Set(
      relativeLinks(fs.readFileSync(index, "utf8")).map((l) => path.resolve(dir, l))
    );
    const docs = walk(dir).filter((f) => f.endsWith(".md") && f !== index);
    for (const doc of docs) {
      if (!linked.has(doc)) unlisted.push(`${relPath(doc)} (not in ${relPath(index)})`);
    }
  }
  if (unlisted.length) {
    throw new Error(
      `Docs missing from their folder index:\n  ${unlisted.join("\n  ")}\n\nFix: add a row for each one to the index.md table.`
    );
  }
});
