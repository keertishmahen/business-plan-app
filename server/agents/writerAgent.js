// ──────────────────────────────────────────────────────────────────
//  Writer Agent — Expert Business Plan Content Generator
//  Drafts rich, structured business content based on RAG context.
//  Accepts user story, previous step outputs, and knowledge base data.
// ──────────────────────────────────────────────────────────────────

const MODEL = "gemini-2.5-flash";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const SYSTEM_PROMPT = `You are an expert business plan writer. Generate detailed, professional content based on the provided context. Be specific to the user's business — avoid generic advice. Structure your output clearly. Reference the user's actual data (business name, industry, customer segments, etc.) throughout.

Guidelines:
- Use concrete numbers, specific market references, and actionable strategies
- If the prompt contains an explicit "TONE:" instruction, follow it exactly; it
  overrides any default register. Otherwise write as a professional business document.
- Organize output with clear headings and structured sections
- Draw directly from the grounding knowledge provided
- Maintain consistency with any previously generated content for this user`;

/**
 * Call Gemini with a system prompt and user content.
 * @param {string} systemPrompt - The system-level instructions
 * @param {string} userContent - The user-facing prompt
 * @param {object} opts - Generation config
 * @returns {Promise<string>} Generated text
 */
async function callWithSystem(systemPrompt, userContent, opts = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set in environment");

  const url = `${BASE_URL}/${MODEL}:generateContent?key=${apiKey}`;

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userContent }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxTokens ?? 8192,
      topP: 0.95,
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
      `Writer Agent Gemini error (HTTP ${res.status}): ${errData?.error?.message || "Unknown"}`
    );
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Writer Agent received empty response from Gemini.");
  return text;
}

/**
 * Generate initial draft content for a business plan step.
 * @param {string} prompt - The task/step prompt
 * @param {object} ragContext - Retrieved knowledge base context
 * @param {string} userStory - The user's business story
 * @returns {Promise<string>} Drafted content
 */
export async function generate(prompt, ragContext, userStory) {
  const contextSections = [];

  // Add plan-specific RAG grounding (BMC blocks + section guidance)
  if (ragContext?.planRagText) {
    contextSections.push(ragContext.planRagText);
  } else if (ragContext?.bmcBlocks?.length > 0) {
    contextSections.push(
      `=== SOURCE OF TRUTH — BMC BLOCKS ===\n${ragContext.bmcBlocks.map((b) => `• [${b.label}] ${b.text}`).join("\n")}`
    );
  }

  // Add RAG knowledge
  if (ragContext?.knowledge?.length > 0) {
    const knowledgeText = ragContext.knowledge
      .map((k) => `• [${k.source}] ${k.text}`)
      .join("\n");
    contextSections.push(
      `=== GROUNDING KNOWLEDGE ===\n${knowledgeText}`
    );
  }

  // Add user history for consistency
  if (ragContext?.userHistory?.length > 0) {
    const historyText = ragContext.userHistory
      .map((h) => `• [Step: ${h.step}] ${h.text}`)
      .join("\n");
    contextSections.push(
      `=== PREVIOUS STEP OUTPUTS ===\n${historyText}`
    );
  }

  // Add user story
  if (userStory) {
    contextSections.push(`=== USER'S BUSINESS STORY ===\n${userStory}`);
  }

  const fullPrompt = contextSections.length > 0
    ? `${contextSections.join("\n\n")}\n\n=== TASK ===\n${prompt}`
    : prompt;

  return callWithSystem(SYSTEM_PROMPT, fullPrompt);
}

/**
 * Revise content based on feedback (fact-check corrections, consistency fixes, etc.).
 * @param {string} originalContent - The original drafted content
 * @param {string[]} corrections - List of corrections/suggestions to apply
 * @returns {Promise<string>} Revised content
 */
export async function revise(originalContent, corrections) {
  const revisionPrompt = `Please revise the following content by applying these corrections. Keep the overall structure and tone intact, but fix the identified issues.

=== ORIGINAL CONTENT ===
${originalContent}

=== CORRECTIONS TO APPLY ===
${corrections.map((c, i) => `${i + 1}. ${c}`).join("\n")}

=== INSTRUCTIONS ===
- Apply each correction carefully
- Maintain the professional tone and structure
- Do not remove content that isn't mentioned in the corrections
- Return the full revised content`;

  return callWithSystem(SYSTEM_PROMPT, revisionPrompt);
}
