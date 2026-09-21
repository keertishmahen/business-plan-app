// ──────────────────────────────────────────────────────────────────
//  Multi-Agent Orchestrator — MIA Hub-and-Spoke Coordinator
//  Flow: RAG → Parallel Specialists → Synthesis → QA Pipeline
// ──────────────────────────────────────────────────────────────────

import * as writerAgent from "./writerAgent.js";
import * as factCheckerAgent from "./factCheckerAgent.js";
import * as consistencyAgent from "./consistencyAgent.js";
import * as criticAgent from "./criticAgent.js";
import * as marketAgent from "./marketAgent.js";
import * as financialAgent from "./financialAgent.js";
import * as sdgAgent from "./sdgAgent.js";
import * as critiqueAgent from "./critiqueAgent.js";
import { synthesize, detectConflicts } from "./synthesizer.js";
import { createFallbackResult, runWithTimeout, normalizeAgentOutput } from "./baseAgent.js";
import { generateEmbedding } from "../services/embeddingService.js";
import { queryRelevant, COLLECTIONS } from "../services/chromaClient.js";
import { retrievePlanContext, formatPlanRagContext } from "../services/planRagService.js";

const MAX_REWRITES = 2;

const CONSISTENCY_STEPS = ["tensions", "dilemmas", "values", "swot", "bmc", "plan", "businessplan", "sdg"];
const CRITIC_STEPS = ["bmc", "plan", "businessplan"];

/** Which MIA specialists run per workflow step */
export const STEP_AGENT_MAP = {
  focus: { sdg: true },
  issues: { sdg: true },
  tensions: { sdg: true, critique: true },
  dilemmas: { sdg: true, critique: true },
  values: { market: true, sdg: true },
  swot: { market: true, sdg: true },
  bmc: { market: true, financial: true, sdg: true, critique: true },
  plan: { market: true, financial: true, sdg: true, critique: true },
};

const AGENT_MODULES = {
  market: marketAgent,
  financial: financialAgent,
  sdg: sdgAgent,
  critique: critiqueAgent,
};

/**
 * Check if a step should use the MIA multi-agent pipeline.
 */
export function shouldUseMIA(stepId) {
  return Boolean(STEP_AGENT_MAP[stepId]);
}

async function retrieveRAGContext(query, stepId, sessionId, options = {}) {
  const context = { knowledge: [], userHistory: [], sources: [], bmcBlocks: [], coverageReport: null };

  if (stepId === "plan") {
    try {
      const planContext = await retrievePlanContext({
        sessionId,
        prompt: query,
        selectedVpTitle: options.selectedVpTitle || "",
      });
      context.knowledge = planContext.knowledge;
      context.userHistory = planContext.userHistory;
      context.sources = planContext.sources;
      context.bmcBlocks = planContext.bmcBlocks;
      context.priorSteps = planContext.priorSteps;
      context.coverageReport = planContext.coverageReport;
      context.planRagText = formatPlanRagContext(planContext);
      return context;
    } catch (error) {
      console.warn("[Orchestrator] Plan RAG retrieval failed, falling back:", error.message);
    }
  }

  try {
    const queryText = query.length > 500 ? query.substring(0, 500) : query;
    const queryEmbedding = await generateEmbedding(queryText);

    const collectionMap = {
      story: [COLLECTIONS.FRAMEWORKS, COLLECTIONS.INDUSTRY],
      focus: [COLLECTIONS.FRAMEWORKS, COLLECTIONS.SDGS],
      values: [COLLECTIONS.FRAMEWORKS, COLLECTIONS.SDGS],
      dilemmas: [COLLECTIONS.FRAMEWORKS, COLLECTIONS.SDGS, COLLECTIONS.INDUSTRY],
      tensions: [COLLECTIONS.FRAMEWORKS, COLLECTIONS.INDUSTRY],
      issues: [COLLECTIONS.FRAMEWORKS, COLLECTIONS.INDUSTRY],
      swot: [COLLECTIONS.FRAMEWORKS, COLLECTIONS.INDUSTRY],
      bmc: [COLLECTIONS.FRAMEWORKS, COLLECTIONS.INDUSTRY, COLLECTIONS.SDGS],
      sdg: [COLLECTIONS.SDGS, COLLECTIONS.FRAMEWORKS],
      businessplan: [COLLECTIONS.FRAMEWORKS, COLLECTIONS.INDUSTRY, COLLECTIONS.SDGS, COLLECTIONS.BUSINESS_PLAN],
      plan: [COLLECTIONS.BUSINESS_PLAN, COLLECTIONS.FRAMEWORKS, COLLECTIONS.INDUSTRY, COLLECTIONS.SDGS],
    };

    const collections = collectionMap[stepId] || [COLLECTIONS.FRAMEWORKS, COLLECTIONS.INDUSTRY];

    for (const collectionName of collections) {
      try {
        const results = await queryRelevant(collectionName, queryEmbedding, 3);
        for (let i = 0; i < results.documents.length; i++) {
          if (results.distances[i] < 1.5) {
            context.knowledge.push({
              text: results.documents[i],
              source: collectionName,
              relevance: 1 - results.distances[i],
            });
            context.sources.push(
              `${collectionName}:${results.metadatas[i]?.title || results.ids[i]}`
            );
          }
        }
      } catch (err) {
        console.warn(`[Orchestrator] Failed to query ${collectionName}:`, err.message);
      }
    }

    if (sessionId) {
      try {
        const userResults = await queryRelevant(
          COLLECTIONS.USER_CONTEXT,
          queryEmbedding,
          5,
          { sessionId }
        );
        for (let i = 0; i < userResults.documents.length; i++) {
          if (userResults.distances[i] < 1.5) {
            context.userHistory.push({
              text: userResults.documents[i],
              step: userResults.metadatas[i]?.stepId || "unknown",
              relevance: 1 - userResults.distances[i],
            });
          }
        }
      } catch (err) {
        console.warn("[Orchestrator] Failed to query user context:", err.message);
      }
    }
  } catch (error) {
    console.warn("[Orchestrator] RAG context retrieval failed:", error.message);
  }

  return context;
}

function pushStage(stages, name, status, extra = {}) {
  const stage = { name, status, timestamp: Date.now(), ...extra };
  stages.push(stage);
  return stage;
}

function emitProgress(onProgress, event, data) {
  if (onProgress) {
    onProgress({ event, ...data, timestamp: Date.now() });
  }
}

/**
 * Run specialist agents in parallel with timeout and fallback.
 */
async function runSpecialists(agentConfig, params, stages, onProgress) {
  const specialists = {};
  const agentIds = Object.entries(agentConfig)
    .filter(([, enabled]) => enabled)
    .map(([id]) => id);

  const tasks = agentIds.map(async (agentId) => {
    const module = AGENT_MODULES[agentId];
    if (!module) return { agentId, result: createFallbackResult(agentId, "Unknown agent") };

    pushStage(stages, agentId, "running");
    emitProgress(onProgress, "stage", { name: agentId, status: "running" });

    try {
      const rawResult = await runWithTimeout(() =>
        module.analyze({
          prompt: params.prompt,
          ragContext: params.ragContext,
          userStory: params.userStory,
          stepId: params.stepId,
        })
      );
      const result = rawResult?.failed ? rawResult : normalizeAgentOutput(rawResult, agentId);

      const stageStatus = result.failed ? "degraded" : "complete";
      const stageIdx = stages.findIndex((s) => s.name === agentId && s.status === "running");
      if (stageIdx >= 0) {
        stages[stageIdx].status = stageStatus;
        stages[stageIdx].confidence = result.confidence;
      }

      emitProgress(onProgress, "specialist", { agentId, result });
      emitProgress(onProgress, "stage", { name: agentId, status: stageStatus, confidence: result.confidence });

      return { agentId, result };
    } catch (error) {
      console.error(`[Orchestrator] ${agentId} agent failed:`, error.message);
      const fallback = createFallbackResult(agentId, error.message);

      const stageIdx = stages.findIndex((s) => s.name === agentId && s.status === "running");
      if (stageIdx >= 0) {
        stages[stageIdx].status = "degraded";
        stages[stageIdx].error = error.message;
      }

      emitProgress(onProgress, "stage", { name: agentId, status: "degraded", error: error.message });
      emitProgress(onProgress, "specialist", { agentId, result: fallback });

      return { agentId, result: fallback };
    }
  });

  const results = await Promise.allSettled(tasks);

  for (const settled of results) {
    if (settled.status === "fulfilled") {
      specialists[settled.value.agentId] = settled.value.result;
    }
  }

  return specialists;
}

/**
 * Run QA pipeline on synthesized content.
 */
async function runQAPipeline(content, params, stages, onProgress) {
  let rewriteCount = 0;
  const { stepId, sessionId, ragContext } = params;

  pushStage(stages, "fact-checker", "running");
  emitProgress(onProgress, "stage", { name: "fact-checker", status: "running" });

  const factCheck = await factCheckerAgent.verify(content, ragContext);
  stages[stages.length - 1].status = "complete";
  stages[stages.length - 1].issues = factCheck.issues.length;
  emitProgress(onProgress, "stage", { name: "fact-checker", status: "complete" });

  if (factCheck.issues.length > 0 && rewriteCount < MAX_REWRITES) {
    pushStage(stages, "writer-revision-factcheck", "running");
    emitProgress(onProgress, "stage", { name: "writer-revision-factcheck", status: "running" });
    content = await writerAgent.revise(content, factCheck.corrections);
    rewriteCount++;
    stages[stages.length - 1].status = "complete";
    emitProgress(onProgress, "stage", { name: "writer-revision-factcheck", status: "complete" });
  }

  let consistencyCheck = null;
  if (CONSISTENCY_STEPS.includes(stepId)) {
    pushStage(stages, "consistency", "running");
    emitProgress(onProgress, "stage", { name: "consistency", status: "running" });

    consistencyCheck = await consistencyAgent.check(content, sessionId);
    stages[stages.length - 1].status = "complete";
    stages[stages.length - 1].conflicts = consistencyCheck.conflicts.length;
    emitProgress(onProgress, "stage", { name: "consistency", status: "complete" });

    if (consistencyCheck.conflicts.length > 0 && rewriteCount < MAX_REWRITES) {
      pushStage(stages, "writer-revision-consistency", "running");
      emitProgress(onProgress, "stage", { name: "writer-revision-consistency", status: "running" });
      content = await writerAgent.revise(content, consistencyCheck.suggestions);
      rewriteCount++;
      stages[stages.length - 1].status = "complete";
      emitProgress(onProgress, "stage", { name: "writer-revision-consistency", status: "complete" });
    }
  }

  let criticReview = null;
  if (CRITIC_STEPS.includes(stepId)) {
    pushStage(stages, "critic", "running");
    emitProgress(onProgress, "stage", { name: "critic", status: "running" });

    criticReview = await criticAgent.review(content);
    stages[stages.length - 1].status = "complete";
    stages[stages.length - 1].quality = criticReview.quality;
    emitProgress(onProgress, "stage", { name: "critic", status: "complete" });

    if (criticReview.quality === "low" && rewriteCount < MAX_REWRITES) {
      pushStage(stages, "writer-revision-critic", "running");
      emitProgress(onProgress, "stage", { name: "writer-revision-critic", status: "running" });
      const allImprovements = [
        ...criticReview.improvements,
        ...criticReview.gaps.map((g) => `Fill gap: ${g}`),
      ];
      content = await writerAgent.revise(content, allImprovements);
      rewriteCount++;
      stages[stages.length - 1].status = "complete";
      emitProgress(onProgress, "stage", { name: "writer-revision-critic", status: "complete" });
    }
  }

  return { content, factCheck, consistencyCheck, criticReview, rewriteCount };
}

/**
 * Main orchestration function — MIA hub-and-spoke pipeline.
 * @param {object} params
 * @param {function} onProgress - Optional callback for SSE streaming
 */
export async function orchestrate({ prompt, stepId, sessionId, userStory, options = {}, onProgress } = {}) {
  const stages = [];
  const startTime = Date.now();
  const agentConfig = STEP_AGENT_MAP[stepId] || null;

  console.log(`\n[Orchestrator] Starting MIA pipeline for step: ${stepId}`);

  emitProgress(onProgress, "stage", { name: "context-retrieval", status: "running" });
  pushStage(stages, "context-retrieval", "running");
  const ragContext = await retrieveRAGContext(prompt, stepId, sessionId, {
    selectedVpTitle: options.selectedVpTitle,
  });
  stages[stages.length - 1].status = "complete";
  emitProgress(onProgress, "stage", { name: "context-retrieval", status: "complete" });

  let content;
  let specialists = {};
  let conflicts = [];
  let synthesisNotes = "";

  if (agentConfig) {
    specialists = await runSpecialists(
      agentConfig,
      { prompt, ragContext, userStory, stepId },
      stages,
      onProgress
    );

    conflicts = detectConflicts(specialists);

    pushStage(stages, "synthesis", "running");
    emitProgress(onProgress, "stage", { name: "synthesis", status: "running" });

    const synthesis = await synthesize({
      prompt,
      specialists,
      conflicts,
      ragContext,
      userStory,
      stepId,
    });

    content = synthesis.content;
    synthesisNotes = synthesis.synthesisNotes;
    stages[stages.length - 1].status = "complete";
    emitProgress(onProgress, "stage", { name: "synthesis", status: "complete" });
  } else {
    pushStage(stages, "writer", "running");
    emitProgress(onProgress, "stage", { name: "writer", status: "running" });
    content = await writerAgent.generate(prompt, ragContext, userStory);
    stages[stages.length - 1].status = "complete";
    emitProgress(onProgress, "stage", { name: "writer", status: "complete" });
  }

  const qa = await runQAPipeline(content, { stepId, sessionId, ragContext }, stages, onProgress);
  content = qa.content;

  // Ensure all specialist outputs are string-safe for the frontend
  for (const [id, spec] of Object.entries(specialists)) {
    if (spec && !spec.failed) {
      specialists[id] = normalizeAgentOutput(spec, id);
    }
  }

  const totalTime = Date.now() - startTime;
  console.log(`[Orchestrator] Pipeline complete in ${totalTime}ms\n`);

  const agentMetadata = {
    stages: stages.map((s) => s.name),
    stagesDetail: stages,
    specialists,
    synthesisNotes,
    conflicts,
    factCheckIssues: qa.factCheck.issues.length,
    factCheckCorrections: qa.factCheck.corrections,
    consistencyConflicts: qa.consistencyCheck?.conflicts?.length || 0,
    consistencyConflictDetails: qa.consistencyCheck?.conflicts || [],
    quality: qa.criticReview?.quality || "high",
    criticGaps: qa.criticReview?.gaps || [],
    rewriteCount: qa.rewriteCount,
    totalTimeMs: totalTime,
    coverageReport: ragContext.coverageReport || null,
  };

  emitProgress(onProgress, "complete", { agentMetadata });

  return {
    response: content,
    sources: ragContext.sources,
    contextUsed: {
      knowledgeDocs: ragContext.knowledge.length,
      userHistoryDocs: ragContext.userHistory.length,
    },
    agentMetadata,
  };
}
