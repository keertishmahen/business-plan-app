#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────
//  E2E Smoke Test — Validates RAG server + MIA pipeline
//  Run: node scripts/e2e-smoke.js
//  Requires: RAG server running on localhost:3002 with GEMINI_API_KEY
// ──────────────────────────────────────────────────────────────────

const RAG_URL = process.env.RAG_URL || "http://localhost:3002";

async function request(path, options = {}) {
  const res = await fetch(`${RAG_URL}${path}`, options);
  return { status: res.status, data: await res.json().catch(() => null), headers: res.headers, ok: res.ok };
}

async function testHealth() {
  const { ok, data } = await request("/api/health");
  if (!ok) throw new Error(`Health check failed: ${JSON.stringify(data)}`);
  console.log("✓ Health check passed", data);
}

async function testStoreContext() {
  const sessionId = `smoke_${Date.now()}`;
  const { ok } = await request("/api/context/store", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      stepId: "story",
      content: "Smoke test business: eco-friendly packaging startup",
    }),
  });
  if (!ok) throw new Error("Context store failed");
  console.log("✓ Context store passed");
  return sessionId;
}

async function testMIAGenerate(sessionId) {
  const { ok, data } = await request("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: "Generate a brief SDG focus analysis for an eco-packaging startup.",
      stepId: "focus",
      sessionId,
      userStory: "Eco-friendly packaging startup targeting food retailers",
      useAgents: true,
    }),
  });

  if (!ok) throw new Error(`MIA generate failed: ${JSON.stringify(data)}`);
  if (!data.response) throw new Error("No response in MIA generate");
  if (!data.agentMetadata) throw new Error("No agentMetadata in MIA generate");

  for (const [id, spec] of Object.entries(data.agentMetadata.specialists || {})) {
    for (const field of ["insights", "warnings", "sources"]) {
      for (const item of spec[field] || []) {
        if (typeof item !== "string") {
          throw new Error(`${id}.${field} contains non-string item: ${JSON.stringify(item)}`);
        }
      }
    }
  }

  console.log("✓ MIA generate passed", {
    stages: data.agentMetadata.stages?.length,
    specialists: Object.keys(data.agentMetadata.specialists || {}),
    totalTimeMs: data.agentMetadata.totalTimeMs,
  });
}

async function testSSEStream(sessionId) {
  const res = await fetch(`${RAG_URL}/api/generate/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: "Brief SDG alignment check for sustainable packaging.",
      stepId: "issues",
      sessionId,
      userStory: "Eco-friendly packaging startup",
    }),
  });

  if (!res.ok) throw new Error(`SSE stream failed: HTTP ${res.status}`);

  const text = await res.text();
  if (!text.includes("event: complete")) throw new Error("SSE stream missing complete event");
  if (!text.includes("event: stage")) throw new Error("SSE stream missing stage events");
  console.log("✓ SSE stream passed", { events: (text.match(/event:/g) || []).length });
}

async function main() {
  console.log("\n🔥 E2E Smoke Test — MIA Business Plan App\n");
  console.log(`   Target: ${RAG_URL}\n`);

  try {
    await testHealth();
    const sessionId = await testStoreContext();
    await testMIAGenerate(sessionId);
    await testSSEStream(sessionId);
    console.log("\n✅ All smoke tests passed!\n");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Smoke test failed:", error.message);
    console.error("   Ensure RAG server is running: cd server && npm start");
    console.error("   Ensure GEMINI_API_KEY is set in server/.env\n");
    process.exit(1);
  }
}

main();
