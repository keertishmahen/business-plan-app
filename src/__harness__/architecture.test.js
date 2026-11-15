// Harness rules for frontend layering. See docs/ARCHITECTURE.md.
const fs = require("fs");
const path = require("path");
const { SRC_DIR, uiSourceFiles, withoutComments, rel } = require("./sourceFiles");

const SERVICES_DIR = path.join(SRC_DIR, "services") + path.sep;

function violations(predicate) {
  const hits = [];
  for (const file of uiSourceFiles()) {
    const lines = withoutComments(fs.readFileSync(file, "utf8")).split("\n");
    lines.forEach((line, i) => {
      if (predicate(file, line)) hits.push(`${rel(file)}:${i + 1}  ${line.trim().slice(0, 100)}`);
    });
  }
  return hits;
}

test("only src/services/ performs network I/O", () => {
  const hits = violations(
    (file, line) => !file.startsWith(SERVICES_DIR) && /\bfetch\s*\(|XMLHttpRequest|new\s+EventSource/.test(line)
  );
  if (hits.length) {
    throw new Error(
      `Network calls outside src/services/:\n  ${hits.join("\n  ")}\n\n` +
        "Fix: add or reuse a function in src/services/geminiClient.js (it owns the backend URL, " +
        "timeouts and error handling) and call that from the component or hook."
    );
  }
});

test("constants/ and utils/ do not depend on components/ or hooks/", () => {
  const lowerLayers = [path.join(SRC_DIR, "constants"), path.join(SRC_DIR, "utils")].map((d) => d + path.sep);
  const hits = violations(
    (file, line) =>
      lowerLayers.some((d) => file.startsWith(d)) &&
      /\bfrom\s+["'][./]*\/?(components|hooks)\//.test(line)
  );
  if (hits.length) {
    throw new Error(
      `Lower layers importing UI code:\n  ${hits.join("\n  ")}\n\n` +
        "Fix: constants/ and utils/ must stay framework-free so any layer can use them. Move the shared " +
        "value into src/constants/ (as STEP_ORDER was) and import it from there."
    );
  }
});

test("the backend URL is read in one place", () => {
  const hits = violations(
    (file, line) => !file.startsWith(SERVICES_DIR) && /process\.env\.REACT_APP_RAG_URL/.test(line)
  );
  if (hits.length) {
    throw new Error(
      `REACT_APP_RAG_URL read outside src/services/:\n  ${hits.join("\n  ")}\n\n` +
        "Fix: call getRagBaseUrl() from src/services/geminiClient.js instead."
    );
  }
});
