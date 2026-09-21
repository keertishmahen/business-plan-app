// ──────────────────────────────────────────────────────────────────
//  POST /api/generate — Main RAG generation endpoint
//  POST /api/generate/stream — SSE streaming for MIA pipeline
// ──────────────────────────────────────────────────────────────────

import { Router } from "express";
import { generateWithRAG } from "../services/ragService.js";
import { orchestrate } from "../agents/orchestrator.js";

const router = Router();

function sendSSE(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * Standard RAG generation (existing behavior).
 */
router.post("/", async (req, res) => {
  try {
    const { prompt, stepId, sessionId, userStory, options, useAgents } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    if (useAgents) {
      try {
        const result = await orchestrate({
          prompt,
          stepId: stepId || "general",
          sessionId: sessionId || "default",
          userStory: userStory || "",
          options: options || {},
        });

        return res.json({
          response: result.response,
          sources: result.sources,
          contextUsed: result.contextUsed,
          agentMetadata: result.agentMetadata,
        });
      } catch (agentError) {
        console.error("[/api/generate] Multi-agent pipeline failed, falling back to RAG:", agentError.message);
      }
    }

    const result = await generateWithRAG({
      prompt,
      stepId: stepId || "general",
      sessionId: sessionId || "default",
      userStory: userStory || "",
      options: options || {},
    });

    return res.json({
      response: result.response,
      sources: result.sources,
      contextUsed: result.contextUsed,
    });
  } catch (error) {
    console.error("[/api/generate] Error:", error.message);
    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
});

/**
 * SSE streaming endpoint for real-time MIA agent progress.
 */
router.post("/stream", async (req, res) => {
  const { prompt, stepId, sessionId, userStory, options } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "prompt is required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  let finalResult = null;

  try {
    finalResult = await orchestrate({
      prompt,
      stepId: stepId || "general",
      sessionId: sessionId || "default",
      userStory: userStory || "",
      options: options || {},
      onProgress: ({ event, ...data }) => {
        sendSSE(res, event || "stage", data);
      },
    });

    sendSSE(res, "complete", {
      response: finalResult.response,
      sources: finalResult.sources,
      contextUsed: finalResult.contextUsed,
      agentMetadata: finalResult.agentMetadata,
    });
  } catch (agentError) {
    console.error("[/api/generate/stream] MIA failed, falling back to RAG:", agentError.message);
    sendSSE(res, "stage", { name: "fallback", status: "running", message: "Falling back to RAG" });

    try {
      const result = await generateWithRAG({
        prompt,
        stepId: stepId || "general",
        sessionId: sessionId || "default",
        userStory: userStory || "",
        options: options || {},
      });

      sendSSE(res, "complete", {
        response: result.response,
        sources: result.sources,
        contextUsed: result.contextUsed,
        agentMetadata: { fallback: true, error: agentError.message },
      });
    } catch (ragError) {
      sendSSE(res, "error", { message: ragError.message || "Generation failed" });
    }
  }

  res.end();
});

export default router;
