import {
  resolveAgentDisplayStatus,
  resolveSpecialistStatus,
  isSpecialistAgent,
  buildMiaFinalization,
  finalizeMiaRun,
  getPipelineStageLabel,
  PIPELINE_STAGE_LABELS,
  shouldLogSpecialistStageEvent,
  buildSpecialistActivityEvent,
  collapseActivityEvents,
} from "./agentStatus";

describe("agentStatus utils", () => {
  describe("resolveAgentDisplayStatus", () => {
    it("shows standby for inactive agents even when stored status is error", () => {
      const status = resolveAgentDisplayStatus(
        "financial",
        { financial: "error" },
        ["market", "sdg"],
      );
      expect(status).toBe("standby");
    });

    it("shows stored status for active agents", () => {
      expect(
        resolveAgentDisplayStatus("market", { market: "running" }, ["market", "sdg"]),
      ).toBe("running");
      expect(
        resolveAgentDisplayStatus("sdg", { sdg: "degraded" }, ["market", "sdg"]),
      ).toBe("degraded");
    });

    it("defaults active agents to idle when no stored status", () => {
      expect(resolveAgentDisplayStatus("market", {}, ["market", "sdg"])).toBe("idle");
    });
  });

  describe("resolveSpecialistStatus", () => {
    it("maps failed fallback to degraded", () => {
      expect(resolveSpecialistStatus({ failed: true, confidence: 0 })).toBe("degraded");
    });

    it("maps success to complete", () => {
      expect(resolveSpecialistStatus({ failed: false, confidence: 0.9 })).toBe("complete");
    });
  });

  describe("isSpecialistAgent", () => {
    it("recognises all four MIA specialists", () => {
      expect(isSpecialistAgent("market")).toBe(true);
      expect(isSpecialistAgent("sdg")).toBe(true);
      expect(isSpecialistAgent("context-retrieval")).toBe(false);
    });
  });

  describe("getPipelineStageLabel", () => {
    it("maps known pipeline stages to friendly labels", () => {
      expect(getPipelineStageLabel("context-retrieval")).toBe("Retrieving context");
      expect(getPipelineStageLabel("fallback")).toBe("Direct generation");
    });

    it("falls back to humanized unknown stages", () => {
      expect(getPipelineStageLabel("custom-stage")).toBe("custom stage");
    });
  });

  describe("buildMiaFinalization", () => {
    it("sets active agents to error (Unavailable) on fallback", () => {
      const { updates, activityEvent } = buildMiaFinalization(["market", "sdg"], "fallback");
      expect(updates).toEqual([
        { agentId: "market", status: "error" },
        { agentId: "sdg", status: "error" },
      ]);
      expect(activityEvent.message).toBe("Direct generation — MIA agents offline");
      expect(activityEvent.status).toBe("complete");
    });

    it("returns error activity on error mode", () => {
      const { updates, activityEvent } = buildMiaFinalization(["critique"], "error");
      expect(updates).toEqual([{ agentId: "critique", status: "degraded" }]);
      expect(activityEvent.status).toBe("error");
    });
  });

  describe("shouldLogSpecialistStageEvent", () => {
    it("logs only running events for specialists", () => {
      expect(shouldLogSpecialistStageEvent("sdg", "running")).toBe(true);
      expect(shouldLogSpecialistStageEvent("sdg", "complete")).toBe(false);
      expect(shouldLogSpecialistStageEvent("sdg", "degraded")).toBe(false);
    });

    it("logs all events for pipeline stages", () => {
      expect(shouldLogSpecialistStageEvent("context-retrieval", "complete")).toBe(true);
    });
  });

  describe("buildSpecialistActivityEvent", () => {
    it("uses friendly message when degraded", () => {
      const event = buildSpecialistActivityEvent("sdg", {
        failed: true,
        warnings: ["Agent failed: Agent timed out after 30000ms"],
      });
      expect(event.status).toBe("degraded");
      expect(event.message).toBe("Limited analysis");
    });

    it("omits message on success", () => {
      const event = buildSpecialistActivityEvent("market", { failed: false, confidence: 0.9 });
      expect(event.status).toBe("complete");
      expect(event.message).toBeUndefined();
    });
  });

  describe("collapseActivityEvents", () => {
    it("keeps only the latest event per name", () => {
      const events = [
        { name: "context-retrieval", status: "running", timestamp: 1 },
        { name: "starting", status: "running", timestamp: 2 },
        { name: "context-retrieval", status: "complete", timestamp: 3 },
        { name: "sdg", status: "running", timestamp: 4 },
        { name: "sdg", status: "complete", timestamp: 5 },
      ];
      const collapsed = collapseActivityEvents(events);
      expect(collapsed).toHaveLength(3);
      expect(collapsed.find((e) => e.name === "context-retrieval").status).toBe("complete");
      expect(collapsed.find((e) => e.name === "sdg").status).toBe("complete");
    });
  });

  describe("finalizeMiaRun", () => {
    it("invokes workflow callbacks with finalization payload", () => {
      const setAgentStatus = jest.fn();
      const addActivityEvent = jest.fn();
      const setAgentStage = jest.fn();

      finalizeMiaRun(["financial"], "fallback", {
        setAgentStatus,
        addActivityEvent,
        setAgentStage,
      });

      expect(setAgentStatus).toHaveBeenCalledWith("financial", "error");
      expect(addActivityEvent).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Direct generation — MIA agents offline" }),
      );
      expect(setAgentStage).toHaveBeenCalledWith(null);
    });
  });

  describe("PIPELINE_STAGE_LABELS", () => {
    it("includes core pipeline stages", () => {
      expect(PIPELINE_STAGE_LABELS.starting).toBeDefined();
      expect(PIPELINE_STAGE_LABELS.fallback).toBeDefined();
    });
  });
});
