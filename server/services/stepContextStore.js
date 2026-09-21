// ──────────────────────────────────────────────────────────────────
//  Step Context Store — Chunked embedding storage for workflow steps
// ──────────────────────────────────────────────────────────────────

import { generateEmbedding } from "./embeddingService.js";
import { addDocuments, COLLECTIONS, persistUserContextCollection } from "./chromaClient.js";

const BMC_BLOCK_KEYS = [
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

const PLAN_SECTION_PATTERN =
  /^(\d+)\.\s+([^\n]+)\n?([\s\S]*?)(?=^\d+\.\s+|\s*$)/gm;


function removeStepDocuments(sessionId, stepId) {
  const collection = getCollection(COLLECTIONS.USER_CONTEXT);
  const prefix = `${sessionId}_${stepId}_`;
  collection.documents = collection.documents.filter((doc) => !doc.id.startsWith(prefix));
}

function coerceItems(value) {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          return String(item.text || item.description || item.label || "").trim();
        }
        return String(item || "").trim();
      })
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function getBmcCanvasFromContent(content) {
  if (!content || typeof content !== "object") return {};
  if (content.canvas && typeof content.canvas === "object") return content.canvas;
  return content;
}

function buildBmcChunks(sessionId, stepId, content) {
  let parsed = content;
  if (typeof content === "string") {
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = null;
    }
  }

  const canvas = getBmcCanvasFromContent(parsed);
  const chunks = [];

  for (const blockId of BMC_BLOCK_KEYS) {
    const items = coerceItems(canvas[blockId]);
    const blockLabel = blockId.replace(/_/g, " ");
    const text =
      items.length > 0
        ? `BMC block "${blockLabel}": ${items.join("; ")}`
        : `BMC block "${blockLabel}": (no items defined)`;

    chunks.push({
      id: `${sessionId}_${stepId}_${blockId}`,
      text,
      metadata: { sessionId, stepId, blockId, chunkType: "bmc_block" },
    });
  }

  return chunks;
}

function buildPlanChunks(sessionId, stepId, content) {
  const text = typeof content === "string" ? content : String(content || "");
  const chunks = [];
  let match;

  PLAN_SECTION_PATTERN.lastIndex = 0;
  while ((match = PLAN_SECTION_PATTERN.exec(text)) !== null) {
    const sectionNumber = match[1];
    const sectionTitle = match[2].trim();
    const sectionBody = (match[3] || "").trim();
    const sectionId = sectionTitle.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40);

    chunks.push({
      id: `${sessionId}_${stepId}_section_${sectionNumber}`,
      text: `Business Plan Section ${sectionNumber}. ${sectionTitle}\n${sectionBody}`,
      metadata: {
        sessionId,
        stepId,
        sectionNumber,
        sectionTitle,
        chunkType: "plan_section",
        sectionId,
      },
    });
  }

  if (chunks.length === 0 && text.trim()) {
    chunks.push({
      id: `${sessionId}_${stepId}_full`,
      text: text.trim(),
      metadata: { sessionId, stepId, chunkType: "plan_full" },
    });
  }

  return chunks;
}

function buildDefaultChunks(sessionId, stepId, content, metadata = {}) {
  const text =
    typeof content === "string" ? content : JSON.stringify(content, null, 2);

  return [
    {
      id: `${sessionId}_${stepId}_0`,
      text: text.trim(),
      metadata: { sessionId, stepId, chunkType: "step_output", ...metadata },
    },
  ];
}

/**
 * Build text chunks for a step output (without embeddings).
 */
export function buildStepChunks(sessionId, stepId, content, metadata = {}) {
  if (stepId === "bmc") {
    return buildBmcChunks(sessionId, stepId, content);
  }
  if (stepId === "plan") {
    return buildPlanChunks(sessionId, stepId, content);
  }
  return buildDefaultChunks(sessionId, stepId, content, metadata);
}

/**
 * Store step output with optional chunking and batch embedding.
 */
export async function storeStepOutput({ sessionId, stepId, content, metadata = {}, chunked = true }) {
  if (!sessionId || !stepId || content == null || content === "") {
    throw new Error("sessionId, stepId, and content are required");
  }

  removeStepDocuments(sessionId, stepId);

  const chunks = chunked
    ? buildStepChunks(sessionId, stepId, content, metadata)
    : buildDefaultChunks(sessionId, stepId, content, metadata);

  const docs = [];
  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk.text);
    docs.push({
      id: chunk.id,
      text: chunk.text,
      embedding,
      metadata: {
        ...chunk.metadata,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });
  }

  await addDocuments(COLLECTIONS.USER_CONTEXT, docs, { skipPersist: true });
  persistUserContextCollection();

  return { success: true, chunksStored: docs.length, documentIds: docs.map((d) => d.id) };
}
