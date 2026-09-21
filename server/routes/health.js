// ──────────────────────────────────────────────────────────────────
//  GET /api/health — Health check endpoint
// ──────────────────────────────────────────────────────────────────

import { Router } from "express";
import { getClient, getDocumentCount, COLLECTIONS } from "../services/chromaClient.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const client = getClient();
    const collections = client.listCollections();

    const counts = {};
    for (const col of collections) {
      counts[col.name] = getDocumentCount(col.name);
    }

    return res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      collections: collections.map((c) => c.name),
      documentCounts: counts,
      knowledgeBase: {
        seeded: collections.length > 0,
        expectedCollections: Object.values(COLLECTIONS),
      },
    });
  } catch (error) {
    return res.status(503).json({
      status: "unhealthy",
      error: error.message,
    });
  }
});

export default router;
