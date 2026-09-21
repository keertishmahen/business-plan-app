// ──────────────────────────────────────────────────────────────────
//  RAG Backend Server — Business Plan Co-Pilot
//  Express server with in-memory vector storage.
//  Provides context-enriched generation via Gemini.
//  Auto-seeds knowledge base on startup (in-memory store).
// ──────────────────────────────────────────────────────────────────

import "dotenv/config";
import express from "express";
import cors from "cors";
import generateRouter from "./routes/generate.js";
import contextRouter from "./routes/context.js";
import healthRouter from "./routes/health.js";
import { seedKnowledgeBase } from "./services/knowledgeSeeder.js";

const app = express();
const PORT = process.env.PORT || 3002;

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000,http://localhost:3001")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// Middleware
app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
}));
app.use(express.json({ limit: "10mb" }));

// Routes
app.use("/api/generate", generateRouter);
app.use("/api/context", contextRouter);
app.use("/api/health", healthRouter);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    name: "Business Plan Co-Pilot RAG Server",
    version: "1.0.0",
    endpoints: {
      generate: "POST /api/generate",
      generateStream: "POST /api/generate/stream",
      storeContext: "POST /api/context/store",
      health: "GET /api/health",
    },
  });
});

// Start server and seed knowledge
app.listen(PORT, async () => {
  console.log(`\n🚀 RAG Server running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
  console.log(`   Generate:     POST http://localhost:${PORT}/api/generate`);
  console.log(`   Store context: POST http://localhost:${PORT}/api/context/store`);
  console.log(`\n   🌱 Seeding knowledge base...`);
  try {
    const { total } = await seedKnowledgeBase({ verbose: true });
    console.log(`   ✅ Knowledge base ready (${total} documents indexed)\n`);
  } catch (err) {
    console.warn(`   ⚠️  Knowledge base seeding failed: ${err.message}`);
    console.warn("   Server will still work but without grounding context.\n");
  }
});
