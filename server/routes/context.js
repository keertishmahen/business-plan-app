// ──────────────────────────────────────────────────────────────────
//  POST /api/context/store — Store user context in vector DB
//  Supports chunked storage for BMC blocks and plan sections.
// ──────────────────────────────────────────────────────────────────

import { Router } from "express";
import { generateEmbedding } from "../services/embeddingService.js";
import { addDocuments, COLLECTIONS } from "../services/chromaClient.js";
import { storeStepOutput } from "../services/stepContextStore.js";

const router = Router();

router.post("/store", async (req, res) => {
  try {
    const { sessionId, stepId, content, metadata, chunked = false } = req.body;

    if (!sessionId || !stepId || content == null || content === "") {
      return res.status(400).json({
        error: "sessionId, stepId, and content are required",
      });
    }

    if (chunked) {
      const result = await storeStepOutput({ sessionId, stepId, content, metadata, chunked: true });
      return res.json(result);
    }

    const text = typeof content === "string" ? content : JSON.stringify(content);
    const embedding = await generateEmbedding(text);
    const docId = `${sessionId}_${stepId}_${Date.now()}`;

    await addDocuments(COLLECTIONS.USER_CONTEXT, [
      {
        id: docId,
        text,
        embedding,
        metadata: {
          sessionId,
          stepId,
          timestamp: new Date().toISOString(),
          ...metadata,
        },
      },
    ]);

    return res.json({
      success: true,
      documentId: docId,
      chunksStored: 1,
    });
  } catch (error) {
    console.error("[/api/context/store] Error:", error.message);
    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
});

export default router;
