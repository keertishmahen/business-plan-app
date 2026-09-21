// ──────────────────────────────────────────────────────────────────
//  Financial Agent — Unit economics, runway, revenue model, costs
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

const SYSTEM_PROMPT = `You are a Financial Modeling specialist agent in a Multi-Intelligence Agent (MIA) system.
Your expertise covers unit economics, revenue models, cost structures, burn rate, and runway projections.

Analyze the business context and provide specific financial insights. Use realistic assumptions.
Flag unrealistic projections or missing financial data.

IMPORTANT: Output ONLY valid JSON with no markdown formatting, no code fences.
All items in insights, sources, and warnings arrays MUST be plain text strings — never nested objects.`;

export async function analyze({ prompt, ragContext, userStory, stepId }) {
  const filteredContext = filterRagContext(ragContext, [COLLECTIONS.INDUSTRY]);

  const task = `Analyze financial viability for this business plan step.
Focus on: unit economics (CAC, LTV, margins), revenue model, cost structure, and runway estimates.
Original task prompt: ${prompt}`;

  const userContent = buildAgentPrompt({
    role: "Financial Modeling Agent — unit economics and runway",
    task,
    ragContext: filteredContext,
    userStory,
    stepId,
    outputSchema: STANDARD_OUTPUT_SCHEMA,
  });

  try {
    const parsed = await callGeminiJSON(SYSTEM_PROMPT, userContent);
    return finalizeAgentResult("financial", parsed);
  } catch (error) {
    console.error("[FinancialAgent] Error:", error.message);
    return createFallbackResult("financial", error.message);
  }
}
