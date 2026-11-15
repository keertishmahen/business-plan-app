// Shared helpers for the harness tests: list UI source files and strip comments,
// so the structural rules check code and copy, not explanatory comments.
const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SRC_DIR = path.join(REPO_ROOT, "src");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

/** Non-test .js/.jsx files under src/, excluding the harness itself. */
function uiSourceFiles() {
  return walk(SRC_DIR)
    .filter((f) => /\.(js|jsx)$/.test(f))
    .filter((f) => !/\.test\.(js|jsx)$/.test(f))
    .filter((f) => !f.includes(`${path.sep}__harness__${path.sep}`));
}

/** Source text with comments blanked out; line numbers are preserved. */
function withoutComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, (match, lead) => lead);
}

function rel(file) {
  return path.relative(REPO_ROOT, file).split(path.sep).join("/");
}

module.exports = { REPO_ROOT, SRC_DIR, walk, uiSourceFiles, withoutComments, rel };
