// ──────────────────────────────────────────────────────────────────
//  Market Agent — Market sizing, segments, competitors, channels
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

const SYSTEM_PROMPT = `You are a Market Research specialist agent in a Multi-Intelligence Agent (MIA) system.
Your expertise covers TAM/SAM/SOM market sizing, customer segments, competitive landscape, and go-to-market channels.

Analyze the business context and provide specific, actionable market insights. Use concrete numbers where reasonable.
Be realistic — avoid inflated market claims. Reference the grounding knowledge provided.

IMPORTANT: Output ONLY valid JSON with no markdown formatting, no code fences.
All items in insights, sources, and warnings arrays MUST be plain text strings — never nested objects.`;

export async function analyze({ prompt, ragContext, userStory, stepId }) {
  const filteredContext = filterRagContext(ragContext, [
    COLLECTIONS.INDUSTRY,
    COLLECTIONS.FRAMEWORKS,
  ]);

  const task = `Analyze market opportunity for this business plan step.
Focus on: market sizing (TAM/SAM/SOM estimates), target customer segments, key competitors, and distribution channels.
Original task prompt: ${prompt}`;

  const userContent = buildAgentPrompt({
    role: "Market Research Agent — sizing, segments, competitors",
    task,
    ragContext: filteredContext,
    userStory,
    stepId,
    outputSchema: STANDARD_OUTPUT_SCHEMA,
  });

  try {
    const parsed = await callGeminiJSON(SYSTEM_PROMPT, userContent);
    return finalizeAgentResult("market", parsed);
  } catch (error) {
    console.error("[MarketAgent] Error:", error.message);
    return createFallbackResult("market", error.message);
  }
}
