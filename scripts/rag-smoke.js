#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────
//  RAG step smoke test — BMC → RAG Evidence → Business Plan (MIA)
//
//  Stores a sample story, SWOT and BMC exactly as the React client does
//  (JSON.stringify, chunked:true), calls the standalone RAG step, then
//  generates the plan through the MIA pipeline with the curated evidence.
//
//  Usage:
//    node scripts/rag-smoke.js https://<api-fqdn>          # full, incl. MIA plan
//    node scripts/rag-smoke.js http://localhost:3002 --no-plan
// ──────────────────────────────────────────────────────────────────

const base = (process.argv[2] || "http://localhost:3002").replace(/\/$/, "");
const runPlan = !process.argv.includes("--no-plan");
const sessionId = `smoke_rag_${Date.now()}`;

const BMC = {
  bmc: [{
    value_proposition: "Neighbourhood refill stations for zero-waste cleaning products",
    canvas: {
      keyPartners: ["Local council recycling depot", "Eco detergent wholesaler"],
      keyActivities: ["Operating refill stations", "Bottle collection and sanitising"],
      keyResources: ["Refill kiosks", "Trained staff"],
      valuePropositions: ["Refills 40% cheaper than bottled", "No single-use plastic"],
      customerRelationships: ["Loyalty app with refill credits"],
      channels: ["High-street kiosks", "Supermarket partnerships"],
      customerSegments: ["Eco-conscious households", "Students on a budget"],
      costStructure: ["Kiosk leases", "Wholesale product"],
      revenueStreams: ["Per-litre refill sales", "Subscription bundles"],
      socialEnvironmentalCost: ["Delivery van emissions"],
      socialEnvironmentalBenefit: ["~12 tonnes plastic avoided per year"],
    },
  }],
};

// A distinctive fact the plan can only know from the uploaded document.
const UPLOAD_TEXT = `Council funding note.
The Zebra-42 council grant offers 18,000 GBP to neighbourhood refill-station operators
that divert at least 5 tonnes of plastic per year. Applications open in March.`;

const PLAN_PROMPT = `You are an expert business strategist and report writer.
Write a comprehensive Business Plan for "Refill stations" with these exact numbered sections:
1. Executive Summary
2. Market Opportunity
3. Business Model Overview (reference the BMC)
4. Product or Service Description
5. Customer & Marketing Strategy
6. Operations Plan
7. Financial & Sustainability Outlook
8. Key Risks & Mitigation Strategies
9. SDG Alignment & Six Capitals Impact
10. Conclusion & Next Steps
Guidelines:
- Be concise (~800-1200 words). Connect each section to the evidence.
- In section 9, add a "Six Capitals" part: name the primary, supporting and limited capitals (financial, manufactured, intellectual, human, social & relationship, natural), how the business builds or draws down each primary capital, and whether it is viable, equitable and bearable. Base this ONLY on the SIX CAPITALS PROFILE evidence; never upgrade a capital beyond its evidence.
Return PLAIN TEXT ONLY.`;

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures += 1;
}

async function post(path, body) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, json, text };
}

async function store(stepId, content) {
  const payload = typeof content === "string" ? content : JSON.stringify(content, null, 2);
  return post("/api/context/store", { sessionId, stepId, content: payload, metadata: {}, chunked: true });
}

(async () => {
  console.log(`RAG smoke test against ${base}  session=${sessionId}\n`);

  const health = await fetch(`${base}/api/health`).then((r) => r.json()).catch((e) => ({ error: e.message }));
  check("health endpoint", health.status === "healthy", JSON.stringify(health.documentCounts || health.error));

  const story = await store("story", "We run neighbourhood refill stations for cleaning products.");
  check("store story", story.status === 200, story.text.slice(0, 80));
  const swot = await store("swot", { swot: [{ title: "Refill stations", S: ["cheap"], W: ["capex"], O: ["policy"], T: ["competitors"] }] });
  check("store swot", swot.status === 200);
  const bmc = await store("bmc", BMC);
  check("store BMC split into 11 blocks", bmc.json?.stored === 11, `stored=${bmc.json?.stored}`);
  const bmcAgain = await store("bmc", BMC);
  check("re-store BMC is idempotent", bmcAgain.json?.stored === 11);

  // ── Knowledge upload (SunMoksha-style) ──────────────────────────
  const suggest = await post("/api/rag/suggest", { sessionId, bmc: BMC, story: "Refill stations" });
  check("upload suggestions (3 categories)", suggest.status === 200 && (suggest.json?.suggestions || []).length >= 1,
    (suggest.json?.suggestions || []).map((s) => s.category).join(" | ") || suggest.text.slice(0, 120));

  const form = new FormData();
  form.append("sessionId", sessionId);
  form.append("files", new Blob([UPLOAD_TEXT], { type: "text/plain" }), "council-grant.txt");
  form.append("text", "Pasted note: kiosk lease quotes average 650 GBP per month in the high street.");
  const up = await fetch(`${base}/api/rag/upload`, { method: "POST", body: form });
  const upJson = await up.json().catch(() => ({}));
  check("upload file + pasted text", up.status === 200 && (upJson.documents || []).length === 2, JSON.stringify(upJson).slice(0, 160));
  const bad = new FormData();
  bad.append("sessionId", sessionId);
  bad.append("files", new Blob(["PK"], { type: "application/octet-stream" }), "sheet.xlsx");
  const badRes = await fetch(`${base}/api/rag/upload`, { method: "POST", body: bad });
  check("unsupported file rejected (415)", badRes.status === 415);

  const docs = await fetch(`${base}/api/rag/documents?sessionId=${sessionId}`).then((x) => x.json());
  check("documents listed", (docs.documents || []).length === 2);
  const otherSession = `${sessionId}_other`;
  const otherDocs = await fetch(`${base}/api/rag/documents?sessionId=${otherSession}`).then((x) => x.json());
  check("other session cannot see uploads", (otherDocs.documents || []).length === 0);
  const otherRag = await post("/api/rag/retrieve", { sessionId: otherSession, prompt: "council grant solar" });
  check("other session retrieves no uploads", (otherRag.json?.uploads || []).length === 0);

  // ── Six Capitals profile (proposal requirement 9) ───────────────
  const capsRes = await post("/api/rag/capitals", { sessionId, bmc: BMC, story: "Neighbourhood refill stations for zero-waste cleaning products.", selectedVpTitle: "Refill stations" });
  const capsJson = capsRes.json || {};
  const capIds = (capsJson.capitals || []).map((c) => c.id).sort().join(",");
  check("Six Capitals: all six rated", capsRes.status === 200 && capIds === "financial,human,intellectual,manufactured,natural,social_relationship", capIds || capsRes.text.slice(0, 140));
  check("Six Capitals: valid emphasis and at least one primary",
    (capsJson.capitals || []).every((c) => ["primary", "supporting", "limited"].includes(c.emphasis) && c.score >= 1 && c.score <= 5) && (capsJson.primary || []).length >= 1,
    `primary=${(capsJson.primary || []).join(",")} dominant=${capsJson.dominantSphere}`);
  check("Six Capitals: stored for retrieval", capsJson.stored === true);

  const rag = await post("/api/rag/retrieve", { sessionId, selectedVpTitle: "Refill stations", prompt: "Business plan" });
  check("RAG step endpoint", rag.status === 200, rag.status !== 200 ? rag.text.slice(0, 120) : "");
  const r = rag.json || {};
  const cov = r.coverageReport || {};
  check("RAG: 11/11 BMC blocks", cov.bmcBlocksRetrieved === 11 && cov.bmcComplete === true, `${cov.bmcBlocksRetrieved}/${cov.bmcBlocksTotal}`);
  check("RAG: no duplicate BMC blocks", (r.bmcBlocks || []).length === 11, `${(r.bmcBlocks || []).length} docs`);
  const steps = (r.priorSteps || []).map((p) => p.step).sort();
  check("RAG: earlier steps retrieved", steps.includes("story") && steps.includes("swot"), steps.join(","));
  check("RAG: knowledge base passages", (r.knowledge || []).length > 0, `${(r.knowledge || []).length} passages`);
  check("RAG: MIA agent routing", Array.isArray(r.agentRouting?.bmc) && r.agentRouting.bmc.includes("market"));
  check("RAG: Six Capitals profile among earlier steps", steps.includes("six_capitals"));
  check("RAG: Six Capitals knowledge retrieved", (r.knowledge || []).some((k) => k.source === "six_capitals_knowledge"),
    (r.knowledge || []).filter((k) => k.source === "six_capitals_knowledge").map((k) => k.title).join(" | "));
  const uploadSources = (r.uploads || []).map((u) => u.source);
  check("RAG: uploaded document retrieved", uploadSources.includes("council-grant.txt"), uploadSources.join(","));
  check("RAG: uploads routed to all specialists",
    ["market", "financial", "sdg", "critique"].every((a) => (r.agentRouting?.upload || []).includes(a)));

  if (runPlan) {
    // Exclude one item to prove curation reaches the MIA agents.
    const curated = [...r.bmcBlocks, ...r.priorSteps, ...(r.uploads || []), ...r.knowledge].filter((i) => i.step !== "swot");
    console.log("\nGenerating plan through MIA with curated evidence (this takes a minute)…");
    const plan = await post("/api/generate", {
      // Same section list and Six Capitals guideline as PROMPTS.plan in the app.
      prompt: PLAN_PROMPT,
      stepId: "plan",
      sessionId,
      userStory: "Neighbourhood refill stations for zero-waste cleaning products.",
      options: { maxTokens: 8192, selectedVpTitle: "Refill stations", curatedContext: curated },
      useAgents: true,
    });
    const p = plan.json || {};
    check("plan generated", plan.status === 200 && typeof p.response === "string" && p.response.length > 200, `${(p.response || "").length} chars`);
    check("plan ran the MIA pipeline", !!p.agentMetadata && !p.agentMetadata.fallback, (p.agentMetadata?.stages || []).join(" → "));
    const pc = p.agentMetadata?.coverageReport || {};
    check("MIA grounded on curated evidence", pc.curated === true && pc.bmcBlocksRetrieved === 11, JSON.stringify(pc));
    check("excluded item not used", !(p.sources || []).includes("user_context:swot"));
    const specialists = Object.keys(p.agentMetadata?.specialists || {});
    check("all MIA specialists ran", ["market", "financial", "sdg", "critique"].every((a) => specialists.includes(a)), specialists.join(","));
    const mentionsBmc = /refill/i.test(p.response || "");
    check("plan reflects BMC content", mentionsBmc);
    check("MIA grounded on the upload", (pc.uploadsRetrieved || 0) >= 1 && (p.sources || []).includes("upload:council-grant.txt"));
    check("plan uses the uploaded fact", /zebra-42|18,?000|council grant/i.test(p.response || ""));
    const resp = p.response || "";
    const at = resp.search(/Six Capitals Impact/i);
    const s9 = at >= 0 ? resp.slice(at, resp.slice(at).search(/\n\s*\**\s*10\.\s/) + at || undefined) : "";
    const primaryLabels = (capsJson.capitals || []).filter((c) => c.emphasis === "primary").map((c) => c.label.split(" ")[0]);
    check("plan section 9 is 'SDG Alignment & Six Capitals Impact'", at >= 0);
    check("section 9 names the profile's primary capitals",
      primaryLabels.length > 0 && primaryLabels.some((l) => new RegExp(`${l}[^.\\n]{0,40}capital`, "i").test(s9)),
      `primary=${primaryLabels.join(",")} | ${s9.slice(0, 160).replace(/\s+/g, " ")}`);
  }

  // Clean up and prove delete works.
  const toDelete = (docs.documents || []).find((d) => d.source === "council-grant.txt");
  if (toDelete) {
    const wrong = await fetch(`${base}/api/rag/documents/${toDelete.docId}?sessionId=${otherSession}`, { method: "DELETE" });
    check("other session cannot delete", wrong.status === 404);
    const del = await fetch(`${base}/api/rag/documents/${toDelete.docId}?sessionId=${sessionId}`, { method: "DELETE" });
    check("delete uploaded document", del.status === 200);
  }

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error("Smoke test crashed:", e);
  process.exit(1);
});
