// ──────────────────────────────────────────────────────────────────
//  Critic Agent — Quality Reviewer & Improvement Suggester
//  Reviews content for completeness, specificity, and professionalism.
//  Identifies gaps and suggests specific improvements.
// ──────────────────────────────────────────────────────────────────

const MODEL = "gemini-2.5-flash";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const SYSTEM_PROMPT = `You are a senior business consultant reviewing a business plan section. Your role is to rate quality and identify gaps. Evaluate:

1. SPECIFICITY: Is the content specific to this particular business, or is it generic advice that could apply to anyone?
2. COMPLETENESS: Are all required elements present for this type of section?
3. PROFESSIONALISM: Is the language clear, professional, and well-structured?
4. LOGIC: Are there logical gaps, unsupported claims, or missing data?
5. ACTIONABILITY: Could someone actually execute on this plan as written?

Be constructively critical — identify real weaknesses, not nitpicks.

IMPORTANT: Output ONLY valid JSON with no markdown formatting, no code fences. Use this exact structure:
{
  "quality": "high" | "medium" | "low",
  "gaps": ["description of each gap or missing element"],
  "improvements": ["specific actionable improvement suggestion"]
}

Quality ratings:
- "high": Content is specific, complete, professional, and actionable
- "medium": Content is adequate but has some generic sections or minor gaps
- "low": Content is too generic, has major gaps, or lacks actionable detail`;

/**
 * Call Gemini with system prompt for quality review.
 * @param {string} userContent - Content to review
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
      `Critic Agent Gemini error (HTTP ${res.status}): ${errData?.error?.message || "Unknown"}`
    );
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Critic Agent received empty response from Gemini.");
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
 * Review content quality and identify areas for improvement.
 * @param {string} content - Content to review
 * @returns {Promise<object>} { quality: "high"|"medium"|"low", gaps: string[], improvements: string[] }
 */
export async function review(content) {
  const prompt = `=== CONTENT TO REVIEW ===
${content}

Please review this business plan content for quality, completeness, and actionability. Be specific in your feedback — point to exact sections that need improvement.`;

  try {
    const response = await callWithSystem(prompt);
    const parsed = parseJSON(response);

    if (parsed && ["high", "medium", "low"].includes(parsed.quality)) {
      return {
        quality: parsed.quality,
        gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
      };
    }

    console.warn("[Critic] Could not parse response as JSON, defaulting to medium quality.");
    return { quality: "medium", gaps: [], improvements: [] };
  } catch (error) {
    console.error("[Critic] Error during review:", error.message);
    return { quality: "medium", gaps: [], improvements: [] };
  }
}
