import { formatAgentText, formatAgentTextList, sanitizeAgentMetadata } from "./agentText";

describe("formatAgentText", () => {
  it("returns strings unchanged", () => {
    expect(formatAgentText("SDG 7 alignment")).toBe("SDG 7 alignment");
  });

  it("formats SDG warning objects", () => {
    const result = formatAgentText({
      type: "greenwashing",
      flag: "high",
      explanation: "Claims lack measurable data",
      impact_metrics_recommendation: "Track kg CO2 saved per unit",
    });
    expect(result).toContain("greenwashing");
    expect(result).toContain("Claims lack measurable data");
    expect(result).toContain("Track kg CO2 saved");
  });

  it("formats generic objects via JSON fallback", () => {
    expect(formatAgentText({ foo: "bar" })).toBe('{"foo":"bar"}');
  });

  it("formatAgentTextList filters empty values", () => {
    expect(formatAgentTextList(["a", null, "", { explanation: "warn" }])).toEqual(["a", "warn"]);
  });

  it("sanitizeAgentMetadata converts nested specialist objects to strings", () => {
    const sanitized = sanitizeAgentMetadata({
      specialists: {
        sdg: {
          insights: [{ explanation: "SDG 7: Clean energy", type: "alignment" }],
          warnings: [{
            type: "greenwashing",
            flag: "high",
            explanation: "No evidence",
            impact_metrics_recommendation: "Track emissions",
          }],
          confidence: 0.9,
        },
      },
      conflicts: [{ description: { explanation: "Conflict found" }, resolution: "Resolve it" }],
    });

    expect(sanitized.specialists.sdg.insights[0]).toContain("SDG 7");
    expect(typeof sanitized.specialists.sdg.warnings[0]).toBe("string");
    expect(sanitized.conflicts[0].description).toContain("Conflict found");
  });
});
