import { TrendingUp, Calculator, Globe, Scale } from "lucide-react";

/** Sub-status copy shown while an agent is running (Figma sidebar). */
export const AGENT_RUNNING_SUBSTATUS = {
  market: "analysing TAM",
  financial: "modelling unit economics",
  sdg: "mapping SDGs",
  critique: "diagnosing tensions",
};

export const AGENT_CONFIG = {
  market: {
    id: "market",
    label: "Market Research",
    subtitle: "Sizing, segments, competitors",
    Icon: TrendingUp,
    color: "#185FA5",
    bg: "rgba(24, 95, 165, 0.08)",
  },
  financial: {
    id: "financial",
    label: "Financial Modelling",
    subtitle: "Unit economics & runway",
    Icon: Calculator,
    color: "#854F0B",
    bg: "rgba(133, 79, 11, 0.08)",
  },
  sdg: {
    id: "sdg",
    label: "SDG Alignment",
    subtitle: "UN SDG mapping",
    Icon: Globe,
    color: "#0E8A66",
    bg: "rgba(14, 138, 102, 0.08)",
  },
  critique: {
    id: "critique",
    label: "Critique & Diagnosis",
    subtitle: "Tensions & dilemmas",
    Icon: Scale,
    color: "#7C3AED",
    bg: "rgba(124, 58, 237, 0.08)",
  },
};

export const ALL_AGENT_IDS = Object.keys(AGENT_CONFIG);

/**
 * Which agents are active for each workflow step.
 */
export const STEP_AGENTS = {
  focus: ["sdg"],
  issues: ["sdg"],
  tensions: ["sdg", "critique"],
  dilemmas: ["sdg", "critique"],
  values: ["market", "sdg"],
  swot: ["market", "sdg"],
  bmc: ["market", "financial", "sdg", "critique"],
  plan: ["market", "financial", "sdg", "critique"],
};

export function getActiveAgents(stepId) {
  return STEP_AGENTS[stepId] || [];
}
