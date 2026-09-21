// ──────────────────────────────────────────────────────────────────
//  Plan RAG Service — Hybrid retrieval for business plan generation
// ──────────────────────────────────────────────────────────────────

import { generateEmbedding } from "./embeddingService.js";
import { queryByMetadata, queryRelevant, COLLECTIONS } from "./chromaClient.js";

const BMC_BLOCK_IDS = [
  "key_partners",
  "key_activities",
  "key_resources",
  "value_propositions",
  "customer_relationships",
  "channels",
  "customer_segments",
  "cost_structure",
  "revenue_streams",
  "social_environmental_cost",
  "social_environmental_benefit",
];

const PRIOR_STEP_IDS = ["swot", "values", "dilemmas", "sdg_mapping", "focus", "issues", "tensions"];

const KNOWLEDGE_COLLECTIONS = [
  COLLECTIONS.BUSINESS_PLAN,
  COLLECTIONS.FRAMEWORKS,
  COLLECTIONS.INDUSTRY,
  COLLECTIONS.SDGS,
];

function formatBmcBlock(doc) {
  const blockId = doc.metadata?.blockId || "unknown";
  const label = blockId.replace(/_/g, " ");
  return { blockId, label, text: doc.text, metadata: doc.metadata };
}

/**
 * Hybrid retrieval for the plan step: metadata-filtered BMC + prior steps + semantic KB search.
 */
export async function retrievePlanContext({ sessionId, prompt, selectedVpTitle = "" }) {
  const sources = [];
  const knowledge = [];

  const bmcDocs = sessionId
    ? queryByMetadata(COLLECTIONS.USER_CONTEXT, { sessionId, stepId: "bmc", chunkType: "bmc_block" }, 20)
    : [];

  const bmcBlocks = bmcDocs.map(formatBmcBlock);
  bmcBlocks.forEach((b) => sources.push(`user_context:bmc_${b.blockId}`));

  const priorStepDocs = sessionId
    ? queryByMetadata(COLLECTIONS.USER_CONTEXT, { sessionId, stepIdIn: PRIOR_STEP_IDS }, 20)
    : [];

  const priorSteps = priorStepDocs.map((doc) => ({
    text: doc.text,
    step: doc.metadata?.stepId || "unknown",
    metadata: doc.metadata,
  }));
  priorSteps.forEach((p) => sources.push(`user_context:${p.step}`));

  const queryText = [
    prompt?.slice(0, 400) || "",
    selectedVpTitle ? `Value proposition: ${selectedVpTitle}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const queryEmbedding = await generateEmbedding(queryText || "business plan sections");

  for (const collectionName of KNOWLEDGE_COLLECTIONS) {
    try {
      const results = await queryRelevant(collectionName, queryEmbedding, 3);
      for (let i = 0; i < results.documents.length; i++) {
        if (results.distances[i] < 1.5) {
          knowledge.push({
            text: results.documents[i],
            source: collectionName,
            relevance: 1 - results.distances[i],
          });
          sources.push(`${collectionName}:${results.metadatas[i]?.title || results.ids[i]}`);
        }
      }
    } catch (err) {
      console.warn(`[PlanRAG] Failed to query ${collectionName}:`, err.message);
    }
  }

  const retrievedBlockIds = new Set(bmcBlocks.map((b) => b.blockId));
  const coverageReport = {
    bmcBlocksRetrieved: retrievedBlockIds.size,
    bmcBlocksTotal: BMC_BLOCK_IDS.length,
    bmcComplete: BMC_BLOCK_IDS.every((id) => retrievedBlockIds.has(id)),
    priorStepsRetrieved: priorSteps.length,
    knowledgeDocs: knowledge.length,
  };

  return {
    bmcBlocks,
    priorSteps,
    knowledge,
    userHistory: [...bmcBlocks.map((b) => ({ text: b.text, step: "bmc", blockId: b.blockId })), ...priorSteps],
    sources,
    coverageReport,
  };
}

export function formatPlanRagContext(planContext) {
  const sections = [];

  if (planContext.bmcBlocks?.length) {
    sections.push(
      "=== SOURCE OF TRUTH — BMC BLOCKS (do not contradict) ===\n" +
        planContext.bmcBlocks.map((b) => `• [${b.label}] ${b.text}`).join("\n")
    );
  }

  if (planContext.priorSteps?.length) {
    sections.push(
      "=== PRIOR WORKFLOW STEPS ===\n" +
        planContext.priorSteps.map((p) => `• [Step: ${p.step}] ${p.text}`).join("\n")
    );
  }

  if (planContext.knowledge?.length) {
    sections.push(
      "=== BUSINESS PLAN SECTION GUIDANCE & FRAMEWORKS ===\n" +
        planContext.knowledge
          .sort((a, b) => b.relevance - a.relevance)
          .map((k) => `• [${k.source}] ${k.text}`)
          .join("\n")
    );
  }

  return sections.join("\n\n");
}
