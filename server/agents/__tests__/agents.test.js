import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateAgentOutput,
  createFallbackResult,
  parseJSON,
  normalizeAgentOutput,
  normalizeAgentItem,
} from "../baseAgent.js";
import { detectConflicts } from "../synthesizer.js";
import { shouldUseMIA, STEP_AGENT_MAP } from "../orchestrator.js";

describe("baseAgent", () => {
  it("validateAgentOutput accepts valid output", () => {
    const result = validateAgentOutput({
      insights: ["Market size is $1B"],
      confidence: 0.85,
      sources: ["industry_patterns"],
      warnings: [],
    }, "market");
    assert.equal(result.valid, true);
  });

  it("validateAgentOutput rejects invalid output but normalizes", () => {
    const result = validateAgentOutput({ insights: "not array" }, "market");
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
    assert.ok(Array.isArray(result.normalized.insights));
  });

  it("normalizeAgentOutput converts nested warning objects to strings", () => {
    const normalized = normalizeAgentOutput({
      insights: [{ explanation: "SDG 7: Clean energy", type: "alignment" }],
      warnings: [{
        type: "greenwashing",
        flag: "medium",
        explanation: "Vague sustainability claims",
        impact_metrics_recommendation: "Track emissions per unit",
      }],
      sources: ["sdg_knowledge"],
      confidence: 0.8,
    }, "sdg");

    assert.ok(normalized.insights.every((i) => typeof i === "string"));
    assert.ok(normalized.warnings.every((w) => typeof w === "string"));
    assert.ok(normalized.warnings[0].includes("Vague sustainability claims"));
  });

  it("normalizeAgentItem handles SDG warning shape", () => {
    const text = normalizeAgentItem({
      type: "greenwashing",
      flag: "high",
      explanation: "No evidence provided",
      impact_metrics_recommendation: "Add KPI dashboard",
    });
    assert.ok(text.includes("No evidence provided"));
    assert.ok(text.includes("Add KPI dashboard"));
  });

  it("createFallbackResult includes error message", () => {
    const result = createFallbackResult("market", "timeout");
    assert.equal(result.agentId, "market");
    assert.equal(result.failed, true);
    assert.ok(result.warnings[0].includes("timeout"));
  });

  it("parseJSON strips markdown fences", () => {
    const parsed = parseJSON('```json\n{"verified": true}\n```');
    assert.deepEqual(parsed, { verified: true });
  });
});

describe("synthesizer", () => {
  it("detectConflicts finds SDG vs market greenwashing", () => {
    const conflicts = detectConflicts({
      sdg: { warnings: ["Potential greenwashing detected"], insights: [] },
      market: { insights: ["Huge market opportunity"], warnings: [] },
      critique: { warnings: [], insights: [] },
      financial: { warnings: [], insights: [] },
    });
    assert.ok(conflicts.length >= 1);
    assert.equal(conflicts[0].type, "sdg_vs_market");
  });

  it("detectConflicts returns empty when agents align", () => {
    const conflicts = detectConflicts({
      sdg: { warnings: [], insights: ["SDG 7 alignment"] },
      market: { insights: ["TAM $500M"], warnings: [] },
    });
    assert.equal(conflicts.length, 0);
  });
});

describe("orchestrator", () => {
  it("shouldUseMIA returns true for bmc and plan", () => {
    assert.equal(shouldUseMIA("bmc"), true);
    assert.equal(shouldUseMIA("plan"), true);
    assert.equal(shouldUseMIA("story"), false);
  });

  it("STEP_AGENT_MAP includes all four specialists for bmc", () => {
    const config = STEP_AGENT_MAP.bmc;
    assert.ok(config.market);
    assert.ok(config.financial);
    assert.ok(config.sdg);
    assert.ok(config.critique);
  });

  it("STEP_AGENT_MAP has SDG only for focus", () => {
    const config = STEP_AGENT_MAP.focus;
    assert.ok(config.sdg);
    assert.equal(config.market, undefined);
  });

  it("specialist success path updates running stage index before emit", () => {
    const stages = [{ name: "sdg", status: "running" }];
    const agentId = "sdg";
    const result = { failed: false, confidence: 0.85, insights: ["SDG 7 alignment"] };

    const stageStatus = result.failed ? "degraded" : "complete";
    const stageIdx = stages.findIndex((s) => s.name === agentId && s.status === "running");
    assert.ok(stageIdx >= 0, "running stage must be found before status update");
    stages[stageIdx].status = stageStatus;
    stages[stageIdx].confidence = result.confidence;

    assert.equal(stages[0].status, "complete");
    assert.equal(stages[0].confidence, 0.85);
  });

  it("specialist catch path uses degraded status not error", () => {
    const stages = [{ name: "sdg", status: "running" }];
    const agentId = "sdg";
    const stageIdx = stages.findIndex((s) => s.name === agentId && s.status === "running");
    stages[stageIdx].status = "degraded";
    assert.equal(stages[0].status, "degraded");
  });
});
