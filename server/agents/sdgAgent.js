// ──────────────────────────────────────────────────────────────────
//  SDG Agent — UN SDG mapping, anti-greenwashing, impact metrics
// ──────────────────────────────────────────────────────────────────

import {
  callGeminiJSON,
  buildAgentPrompt,
  finalizeAgentResult,
  createFallbackResult,
  filterRagContext,
  STANDARD_OUTPUT_SCHEMA,
} from "./baseAgent.js";
import { COLLECTIONS } from "../services/chromaClient.js";

const SYSTEM_PROMPT = `You are an SDG Alignment specialist agent in a Multi-Intelligence Agent (MIA) system.
Your expertise covers UN Sustainable Development Goals mapping, impact measurement, and anti-greenwashing analysis.

Map business activities to specific SDG numbers (1-17) with correct names.
Flag greenwashing risks where claimed impact doesn't match actual business activities.
Recommend measurable impact metrics tied to specific SDGs.

IMPORTANT: Output ONLY valid JSON with no markdown formatting, no code fences.
All items in insights, sources, and warnings arrays MUST be plain text strings — never nested objects.
Example insight: "SDG 7 (Affordable Energy): Solar packaging reduces grid reliance by 30%"
Example warning: "Greenwashing risk: sustainability claims lack measurable impact data"`;

export async function analyze({ prompt, ragContext, userStory, stepId }) {
  const filteredContext = filterRagContext(ragContext, [
    COLLECTIONS.SDGS,
    COLLECTIONS.FRAMEWORKS,
  ]);

  const task = `Analyze SDG alignment and sustainability impact for this business plan step.
Focus on: specific SDG mappings (number + name), impact metrics, anti-greenwashing flags, and local relevance.
Original task prompt: ${prompt}`;

  const userContent = buildAgentPrompt({
    role: "SDG Alignment Agent — mapping to UN Sustainable Development Goals",
    task,
    ragContext: filteredContext,
    userStory,
    stepId,
    outputSchema: STANDARD_OUTPUT_SCHEMA,
  });

  try {
    const parsed = await callGeminiJSON(SYSTEM_PROMPT, userContent);
    return finalizeAgentResult("sdg", parsed);
  } catch (error) {
    console.error("[SDGAgent] Error:", error.message);
    return createFallbackResult("sdg", error.message);
  }
}
