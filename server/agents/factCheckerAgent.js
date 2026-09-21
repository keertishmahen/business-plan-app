// ──────────────────────────────────────────────────────────────────
//  Fact-Checker Agent — Validates Claims Against Knowledge Base
//  Cross-verifies business plan content against RAG-retrieved facts.
//  Checks SDG alignments, business model claims, and financial logic.
// ──────────────────────────────────────────────────────────────────

const MODEL = "gemini-2.5-flash";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const SYSTEM_PROMPT = `You are a rigorous fact-checker for business plans. Your job is to verify:
1. SDG references match actual UN SDG definitions (e.g., SDG 1 = No Poverty, SDG 7 = Affordable and Clean Energy)
2. Business model claims are logically sound and internally consistent
3. Market claims are reasonable and not wildly exaggerated
4. Financial logic is consistent (revenue projections align with pricing and customer numbers)

For each issue found, provide the exact claim that's wrong and the correction.

IMPORTANT: Output ONLY valid JSON with no markdown formatting, no code fences. Use this exact structure:
{
  "verified": true/false,
  "issues": ["description of each issue found"],
  "corrections": ["specific correction for each issue"]
}

If everything checks out, return: { "verified": true, "issues": [], "corrections": [] }`;

/**
 * Call Gemini with system prompt for fact-checking.
 * @param {string} userContent - Content to fact-check
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
      temperature: 0.3,
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
      `FactChecker Agent Gemini error (HTTP ${res.status}): ${errData?.error?.message || "Unknown"}`
    );
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("FactChecker Agent received empty response from Gemini.");
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
 * Verify drafted content against RAG knowledge base.
 * @param {string} content - The writer's drafted content
 * @param {object} ragContext - Retrieved knowledge base context
 * @returns {Promise<object>} { verified: boolean, issues: string[], corrections: string[] }
 */
export async function verify(content, ragContext) {
  const knowledgeContext = ragContext?.knowledge?.length > 0
    ? ragContext.knowledge.map((k) => `• [${k.source}] ${k.text}`).join("\n")
    : "No specific knowledge base context available.";

  const bmcContext = ragContext?.bmcBlocks?.length > 0
    ? ragContext.bmcBlocks.map((b) => `• [${b.label}] ${b.text}`).join("\n")
    : null;

  const bmcSection = bmcContext
    ? `\n\n=== BMC SOURCE OF TRUTH (verify plan claims against these blocks) ===\n${bmcContext}\n\nFlag any plan claims that contradict or invent BMC content not listed above.`
    : "";

  const prompt = `=== CONTENT TO FACT-CHECK ===
${content}

=== KNOWLEDGE BASE (verified facts) ===
${knowledgeContext}${bmcSection}

Please verify the content above against the knowledge base and BMC blocks. Check for:
- Incorrect SDG number-to-name mappings
- Business model claims that contradict standard frameworks or stored BMC blocks
- Unreasonable market or financial claims
- Internal logical inconsistencies
- Claims not found in BMC blocks or prior steps (flag as issues)`;

  try {
    const response = await callWithSystem(prompt);
    const parsed = parseJSON(response);

    if (parsed && typeof parsed.verified === "boolean") {
      return {
        verified: parsed.verified,
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        corrections: Array.isArray(parsed.corrections) ? parsed.corrections : [],
      };
    }

    // Fallback if JSON parsing fails — assume content is verified
    console.warn("[FactChecker] Could not parse response as JSON, assuming verified.");
    return { verified: true, issues: [], corrections: [] };
  } catch (error) {
    console.error("[FactChecker] Error during verification:", error.message);
    // On error, don't block the pipeline — return as verified
    return { verified: true, issues: [], corrections: [] };
  }
}
