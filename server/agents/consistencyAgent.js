// ──────────────────────────────────────────────────────────────────
//  Consistency Agent — Cross-Step Coherence Checker
//  Compares new content against all previous step outputs to ensure
//  the business plan remains internally consistent across steps.
// ──────────────────────────────────────────────────────────────────

import { generateEmbedding } from "../services/embeddingService.js";
import { queryRelevant, queryByMetadata, COLLECTIONS } from "../services/chromaClient.js";

const MODEL = "gemini-2.5-flash";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const SYSTEM_PROMPT = `You are a consistency reviewer for business plans. Compare the NEW content against the user's PREVIOUS outputs from earlier steps. Check for:
1. Same business name, industry, and target audience referenced throughout
2. Value propositions match what was defined in earlier steps (SWOT/Values)
3. No contradictions between steps (e.g., story says "B2C" but plan mentions "enterprise clients")
4. BMC blocks align with the selected value proposition and customer segments
5. Financial projections are consistent with the business model described

IMPORTANT: Output ONLY valid JSON with no markdown formatting, no code fences. Use this exact structure:
{
  "consistent": true/false,
  "conflicts": ["description of each conflict found"],
  "suggestions": ["specific suggestion to resolve each conflict"]
}

If everything is consistent, return: { "consistent": true, "conflicts": [], "suggestions": [] }`;

/**
 * Call Gemini with system prompt for consistency checking.
 * @param {string} userContent - Content to check
 * @returns {Promise<string>} Raw response text
 */
async function callWithSystem(userContent) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set in environment");

  const url = `${BASE_URL}/${MODEL}:generateContent?key=${apiKey}`;

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: userContent }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
      topP: 0.9,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      `Consistency Agent Gemini error (HTTP ${res.status}): ${errData?.error?.message || "Unknown"}`
    );
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Consistency Agent received empty response from Gemini.");
  return text;
}

/**
 * Parse JSON from Gemini response, stripping markdown fences if present.
 * @param {string} text - Raw text from Gemini
 * @returns {object|null} Parsed JSON
 */
function parseJSON(text) {
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
 * Retrieve all previous step outputs for a session from the user_context collection.
 * @param {string} sessionId - User session identifier
 * @param {string} content - Current content (used for embedding query)
 * @returns {Promise<object[]>} Previous step documents
 */
async function getPreviousOutputs(sessionId, content) {
  try {
    const outputs = [];

    const bmcBlocks = queryByMetadata(
      COLLECTIONS.USER_CONTEXT,
      { sessionId, stepId: "bmc", chunkType: "bmc_block" },
      20
    );
    for (const doc of bmcBlocks) {
      outputs.push({
        text: doc.text,
        step: "bmc",
        relevance: 1,
        blockId: doc.metadata?.blockId,
      });
    }

    const queryText = content.length > 500 ? content.substring(0, 500) : content;
    const queryEmbedding = await generateEmbedding(queryText);

    const results = await queryRelevant(
      COLLECTIONS.USER_CONTEXT,
      queryEmbedding,
      10,
      { sessionId }
    );

    for (let i = 0; i < results.documents.length; i++) {
      outputs.push({
        text: results.documents[i],
        step: results.metadatas[i]?.stepId || "unknown",
        relevance: 1 - results.distances[i],
      });
    }

    return outputs;
  } catch (error) {
    console.warn("[Consistency] Failed to retrieve previous outputs:", error.message);
    return [];
  }
}

/**
 * Check content consistency against previous step outputs.
 * @param {string} content - New content to verify
 * @param {string} sessionId - User session identifier
 * @returns {Promise<object>} { consistent: boolean, conflicts: string[], suggestions: string[] }
 */
export async function check(content, sessionId) {
  // Retrieve previous step outputs
  const previousOutputs = await getPreviousOutputs(sessionId, content);

  if (previousOutputs.length === 0) {
    // No previous context to check against
    return { consistent: true, conflicts: [], suggestions: [] };
  }

  const previousText = previousOutputs
    .map((o) => `[Step: ${o.step}] ${o.text}`)
    .join("\n\n");

  const prompt = `=== NEW CONTENT (to check for consistency) ===
${content}

=== PREVIOUS STEP OUTPUTS (reference for consistency) ===
${previousText}

Please check if the new content is consistent with the previous outputs. Look for contradictions in:
- Business name, industry, target market
- Value proposition and customer segments
- Business model and revenue streams
- Strategic priorities and goals`;

  try {
    const response = await callWithSystem(prompt);
    const parsed = parseJSON(response);

    if (parsed && typeof parsed.consistent === "boolean") {
      return {
        consistent: parsed.consistent,
        conflicts: Array.isArray(parsed.conflicts) ? parsed.conflicts : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      };
    }

    console.warn("[Consistency] Could not parse response as JSON, assuming consistent.");
    return { consistent: true, conflicts: [], suggestions: [] };
  } catch (error) {
    console.error("[Consistency] Error during check:", error.message);
    return { consistent: true, conflicts: [], suggestions: [] };
  }
}
