import { render, screen, fireEvent } from "@testing-library/react";
import SixCapitalsProfile from "./SixCapitalsProfile";
import RagStep from "./RagStep";
import { PLAN_SECTION_HEADINGS, parsePlanSections } from "../../services/exportService";
import { PROMPTS } from "../../constants/prompts";

const cap = (id, label, sphere, emphasis, score, extra = {}) => ({
  id, label, sphere, emphasis, score, rationale: `${label} rationale`, evidence: [], bmcBlocks: [], risk: "", ...extra,
});

const PROFILE = {
  capitals: [
    cap("financial", "Financial", "economic", "supporting", 3),
    cap("manufactured", "Manufactured", "economic", "limited", 1),
    cap("intellectual", "Intellectual", "economic", "limited", 2),
    cap("human", "Human", "social", "primary", 4),
    cap("social_relationship", "Social & Relationship", "social", "primary", 5, {
      evidence: ["key_partners: council depot"], risk: "Partnership could lapse",
    }),
    cap("natural", "Natural", "environmental", "supporting", 3),
  ],
  spheres: { viable: "Low running costs", equitable: "Affordable refills", bearable: "Less plastic waste" },
  dominantSphere: "social",
  summary: "A community-led refill service.",
  primary: ["human", "social_relationship"],
};

describe("SixCapitalsProfile", () => {
  it("renders all six capitals with emphasis, sphere and evidence", () => {
    render(<SixCapitalsProfile profile={PROFILE} />);
    ["Financial", "Manufactured", "Intellectual", "Human", "Social & Relationship", "Natural"].forEach((l) =>
      expect(screen.getByText(l)).toBeInTheDocument()
    );
    expect(screen.getAllByText("Primary")).toHaveLength(2);
    expect(screen.getByText("key_partners: council depot")).toBeInTheDocument();
    expect(screen.getByText("Risk: Partnership could lapse")).toBeInTheDocument();
    expect(screen.getByLabelText("5 out of 5")).toBeInTheDocument();
  });

  it("shows viable / equitable / bearable and the dominant sphere", () => {
    render(<SixCapitalsProfile profile={PROFILE} />);
    expect(screen.getByText("Viable")).toBeInTheDocument();
    expect(screen.getByText("Affordable refills")).toBeInTheDocument();
    expect(screen.getByText("Less plastic waste")).toBeInTheDocument();
    expect(screen.getByText(/Dominant sphere/)).toHaveTextContent("Social");
  });

  it("re-assess calls back and an error is shown when there is no profile", () => {
    const onReassess = jest.fn();
    const { rerender } = render(<SixCapitalsProfile profile={PROFILE} onReassess={onReassess} />);
    fireEvent.click(screen.getByText("Re-assess"));
    expect(onReassess).toHaveBeenCalled();
    rerender(<SixCapitalsProfile error="HTTP 502" onReassess={onReassess} />);
    expect(screen.getByRole("alert")).toHaveTextContent("HTTP 502");
  });

  it("renders nothing with neither profile nor error", () => {
    const { container } = render(<SixCapitalsProfile />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("RagStep with a Six Capitals profile", () => {
  it("shows the profile and labels the stored profile in earlier steps", () => {
    const data = {
      bmcBlocks: [],
      priorSteps: [{ id: "s:six_capitals", kind: "step", step: "six_capitals", text: "Six Capitals profile — dominant sphere: social." }],
      uploads: [],
      knowledge: [{ id: "k1", kind: "knowledge", source: "six_capitals_knowledge", title: "Natural capital", text: "Natural capital: ...", relevance: 0.7 }],
      coverageReport: { bmcBlocksRetrieved: 0, bmcBlocksTotal: 11, missingBmcBlocks: [] },
      agentRouting: {},
      capitals: PROFILE,
      excluded: [],
    };
    render(<RagStep data={data} onChange={() => {}} onRerun={() => {}} onApprove={() => {}} onReassessCapitals={() => {}} />);
    expect(screen.getAllByText("Six Capitals profile").length).toBeGreaterThan(0);
    expect(screen.getByText(/Six Capitals · 70% match/)).toBeInTheDocument();
  });
});

describe("Business plan section 9 covers the Six Capitals", () => {
  it("keeps 10 sections and renames section 9", () => {
    expect(PLAN_SECTION_HEADINGS).toHaveLength(10);
    expect(PLAN_SECTION_HEADINGS[8]).toBe("SDG Alignment & Six Capitals Impact");
  });

  it("the plan prompt asks for a Six Capitals part grounded in the profile", () => {
    const prompt = PROMPTS.plan("ctx", { title: "Refills" });
    expect(prompt).toContain("9. SDG Alignment & Six Capitals Impact");
    expect(prompt).toContain("SIX CAPITALS PROFILE");
  });

  it("parses the renamed section 9 from plan text", () => {
    const text = "1. Executive Summary\nSummary.\n9. SDG Alignment & Six Capitals Impact\nHuman and natural capital are primary.\n10. Conclusion & Next Steps\nNext.";
    const sections = parsePlanSections(text);
    expect(sections[9].body).toContain("Human and natural capital are primary");
  });
});
