// ──────────────────────────────────────────────────────────────────
//  Critique Agent — Dilemmas, tensions, stakeholder conflicts
// ──────────────────────────────────────────────────────────────────

import {
  callGeminiJSON,
  buildAgentPrompt,
  finalizeAgentResult,
  createFallbackResult,
  STANDARD_OUTPUT_SCHEMA,
} from "./baseAgent.js";

const SYSTEM_PROMPT = `You are a Critique & Diagnosis specialist agent in a Multi-Intelligence Agent (MIA) system.
Your expertise covers ethical dilemmas, stakeholder tensions, People/Planet/Prosperity trade-offs, and strategic conflicts.

Identify tensions between competing priorities, hidden stakeholder impacts, and unresolved dilemmas.
Be constructively critical — surface real conflicts that the business plan must address.

IMPORTANT: Output ONLY valid JSON with no markdown formatting, no code fences.
All items in insights, sources, and warnings arrays MUST be plain text strings — never nested objects.`;

export async function analyze({ prompt, ragContext, userStory, stepId }) {
  const task = `Analyze dilemmas, tensions, and stakeholder conflicts for this business plan step.
Focus on: People/Planet/Prosperity trade-offs, ethical dilemmas, stakeholder conflicts, and unresolved tensions.
Original task prompt: ${prompt}`;

  const userContent = buildAgentPrompt({
    role: "Critique & Diagnosis Agent — tensions and dilemmas",
    task,
    ragContext,
    userStory,
    stepId,
    outputSchema: STANDARD_OUTPUT_SCHEMA,
  });

  try {
    const parsed = await callGeminiJSON(SYSTEM_PROMPT, userContent);
    return finalizeAgentResult("critique", parsed);
  } catch (error) {
    console.error("[CritiqueAgent] Error:", error.message);
    return createFallbackResult("critique", error.message);
  }
}
