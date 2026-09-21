// ──────────────────────────────────────────────────────────────────
//  Base Agent — Shared utilities for all MIA specialist agents
// ──────────────────────────────────────────────────────────────────

const MODEL = "gemini-2.5-flash";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export const AGENT_TIMEOUT_MS = Number(process.env.AGENT_TIMEOUT_MS) || 90000;

/**
 * Parse JSON from Gemini response, stripping markdown fences if present.
 */
export function parseJSON(text) {
  const stripped = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/**
 * Call Gemini and parse response as JSON with auto-retry.
 */
export async function callGeminiJSON(systemPrompt, userContent, opts = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set in environment");

  const url = `${BASE_URL}/${MODEL}:generateContent?key=${apiKey}`;

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userContent }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.3,
      maxOutputTokens: opts.maxTokens ?? 4096,
      topP: 0.9,
    },
  };

  async function attempt() {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(
        `Gemini error (HTTP ${res.status}): ${errData?.error?.message || "Unknown"}`
      );
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty response from Gemini.");
    return text;
  }

  const text1 = await attempt();
  const result1 = parseJSON(text1);
  if (result1 !== null) return result1;

  const text2 = await attempt();
  const result2 = parseJSON(text2);
  if (result2 !== null) return result2;

  throw new Error("Failed to parse JSON from Gemini after 2 attempts.");
}

/**
 * Build a consistent agent prompt with role, task, context, and output schema.
 */
export function buildAgentPrompt({ role, task, ragContext, userStory, stepId, outputSchema }) {
  const sections = [];

  if (ragContext?.knowledge?.length > 0) {
    const knowledgeText = ragContext.knowledge
      .map((k) => `• [${k.source}] ${k.text}`)
      .join("\n");
    sections.push(`=== GROUNDING KNOWLEDGE ===\n${knowledgeText}`);
  }

  if (ragContext?.userHistory?.length > 0) {
    const historyText = ragContext.userHistory
      .map((h) => `• [Step: ${h.step}] ${h.text}`)
      .join("\n");
    sections.push(`=== PREVIOUS STEP OUTPUTS ===\n${historyText}`);
  }

  if (userStory) {
    sections.push(`=== USER'S BUSINESS STORY ===\n${userStory}`);
  }

  sections.push(`=== WORKFLOW STEP ===\n${stepId}`);
  sections.push(`=== YOUR ROLE ===\n${role}`);
  sections.push(`=== TASK ===\n${task}`);
  sections.push(`=== REQUIRED OUTPUT FORMAT ===\n${outputSchema}`);

  return sections.join("\n\n");
}

/**
 * Convert a single insight/warning/source item to a plain string.
 */
export function normalizeAgentItem(item) {
  if (item == null) return "";
  if (typeof item === "string") return item.trim();
  if (typeof item === "number" || typeof item === "boolean") return String(item);

  if (typeof item === "object") {
    if (item.explanation) {
      const parts = [];
      if (item.type) parts.push(`[${item.type}]`);
      if (item.flag) parts.push(String(item.flag));
      parts.push(item.explanation);
      if (item.impact_metrics_recommendation) {
        parts.push(`Metrics: ${item.impact_metrics_recommendation}`);
      }
      return parts.join(" ").trim();
    }

    for (const key of ["text", "message", "description", "content", "insight", "warning", "label"]) {
      if (typeof item[key] === "string" && item[key].trim()) {
        return item[key].trim();
      }
    }

    try {
      return JSON.stringify(item);
    } catch {
      return "";
    }
  }

  return String(item);
}

/**
 * Normalize raw LLM output into a safe, consistent agent result.
 */
export function normalizeAgentOutput(raw, agentId) {
  const parsed = raw && typeof raw === "object" ? raw : {};

  const toStringArray = (val) => {
    if (!val) return [];
    const arr = Array.isArray(val) ? val : [val];
    return arr.map(normalizeAgentItem).filter(Boolean);
  };

  let confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.5;
  if (Number.isNaN(confidence)) confidence = 0.5;
  confidence = Math.max(0, Math.min(1, confidence));

  let insights = toStringArray(parsed.insights);
  if (insights.length === 0) {
    for (const key of ["findings", "tensions", "dilemmas", "observations", "keyInsights", "analysis", "points", "items"]) {
      if (parsed[key] == null) continue;
      insights = toStringArray(parsed[key]);
      if (insights.length > 0) break;
    }
  }
  if (insights.length === 0) {
    for (const key of ["summary", "narrative", "output"]) {
      if (typeof parsed[key] === "string" && parsed[key].trim()) {
        insights = [parsed[key].trim()];
        break;
      }
    }
  }

  return {
    agentId,
    insights,
    warnings: toStringArray(parsed.warnings),
    sources: toStringArray(parsed.sources),
    confidence,
    failed: false,
  };
}

/**
 * Validate and normalize agent output — always returns safe structure.
 */
export function validateAgentOutput(output, agentId) {
  const normalized = normalizeAgentOutput(output, agentId);
  const errors = [];

  if (output && typeof output === "object") {
    for (const field of ["insights", "warnings", "sources"]) {
      if (output[field] != null && !Array.isArray(output[field])) {
        errors.push(`${field} coerced from non-array`);
      } else if (Array.isArray(output[field])) {
        const hasObjects = output[field].some((item) => item != null && typeof item === "object");
        if (hasObjects) errors.push(`${field} contained nested objects — normalized to strings`);
      }
    }
  } else {
    errors.push("Output is not an object");
  }

  return { valid: errors.length === 0, errors, normalized };
}

/**
 * Finalize agent result after Gemini call — single entry point for all specialists.
 */
export function finalizeAgentResult(agentId, raw) {
  const { normalized } = validateAgentOutput(raw, agentId);
  return normalized;
}

/**
 * Create a fallback empty agent result when an agent fails.
 */
export function createFallbackResult(agentId, errorMessage) {
  return {
    agentId,
    insights: [],
    confidence: 0,
    sources: [],
    warnings: [`Agent failed: ${errorMessage}`],
    failed: true,
  };
}

/**
 * Build RAG context sections filtered by collection names.
 */
export function filterRagContext(ragContext, collections) {
  if (!ragContext?.knowledge) return { knowledge: [], userHistory: ragContext?.userHistory || [] };

  const knowledge = ragContext.knowledge.filter((k) =>
    collections.some((c) => k.source === c || k.source?.includes(c))
  );

  return {
    knowledge: knowledge.length > 0 ? knowledge : ragContext.knowledge,
    userHistory: ragContext.userHistory || [],
  };
}

/**
 * Run an agent with timeout.
 */
export async function runWithTimeout(fn, timeoutMs = AGENT_TIMEOUT_MS) {
  return Promise.race([
    fn(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Agent timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

export const STANDARD_OUTPUT_SCHEMA = `{
  "insights": ["plain text strings only — one insight per array item"],
  "confidence": 0.0 to 1.0,
  "sources": ["plain text source references"],
  "warnings": ["plain text warning strings only — NEVER use nested objects"]
}

CRITICAL: insights, sources, and warnings MUST be arrays of plain strings only. Do NOT use nested JSON objects inside these arrays.`;
