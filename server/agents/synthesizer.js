// ──────────────────────────────────────────────────────────────────
//  Synthesizer — Merges specialist agent outputs into unified draft
// ──────────────────────────────────────────────────────────────────

import * as writerAgent from "./writerAgent.js";
import { normalizeAgentItem } from "./baseAgent.js";

/**
 * Detect conflicts between specialist agent outputs.
 */
export function detectConflicts(specialists) {
  const conflicts = [];
  const sdg = specialists.sdg;
  const market = specialists.market;
  const critique = specialists.critique;
  const financial = specialists.financial;

  if (sdg?.warnings?.length > 0 && market?.insights?.length > 0) {
    const greenwashingTerms = ["greenwash", "misleading", "unsubstantiated", "exaggerated"];
    const hasGreenwashing = sdg.warnings.some((w) => {
      const text = normalizeAgentItem(w).toLowerCase();
      return greenwashingTerms.some((t) => text.includes(t));
    });
    if (hasGreenwashing) {
      conflicts.push({
        type: "sdg_vs_market",
        description: "SDG agent flagged potential greenwashing that conflicts with market optimism",
        priority: "critique",
        resolution: "Prioritize SDG agent warnings; temper market claims with verified impact data",
      });
    }
  }

  if (critique?.warnings?.length > 0 && market?.insights?.length > 0) {
    const tensionTerms = ["tension", "conflict", "trade-off", "dilemma"];
    const hasTension = critique.warnings.some((w) => {
      const text = normalizeAgentItem(w).toLowerCase();
      return tensionTerms.some((t) => text.includes(t));
    });
    if (hasTension) {
      conflicts.push({
        type: "critique_vs_market",
        description: "Critique agent identified tensions that market analysis may overlook",
        priority: "critique",
        resolution: "Include tension acknowledgment in final output; critique findings take priority",
      });
    }
  }

  if (financial?.warnings?.length > 0 && market?.insights?.length > 0) {
    const financialTerms = ["unrealistic", "optimistic", "aggressive", "unsustainable"];
    const hasFinancialConcern = financial.warnings.some((w) => {
      const text = normalizeAgentItem(w).toLowerCase();
      return financialTerms.some((t) => text.includes(t));
    });
    if (hasFinancialConcern) {
      conflicts.push({
        type: "financial_vs_market",
        description: "Financial agent flagged concerns about market size or growth assumptions",
        priority: "financial",
        resolution: "Use conservative financial projections; align market claims with unit economics",
      });
    }
  }

  return conflicts;
}

/**
 * Format specialist outputs for the writer synthesis prompt.
 */
function formatSpecialistOutputs(specialists) {
  const sections = [];

  for (const [key, agent] of Object.entries(specialists)) {
    if (!agent || agent.failed) continue;
    sections.push(`=== ${key.toUpperCase()} AGENT ===`);
    sections.push(`Confidence: ${agent.confidence}`);
    if (agent.insights?.length) {
      sections.push("Insights:");
      agent.insights.forEach((i) => sections.push(`  • ${i}`));
    }
    if (agent.warnings?.length) {
      sections.push("Warnings:");
      agent.warnings.forEach((w) => sections.push(`  ⚠ ${w}`));
    }
    if (agent.sources?.length) {
      sections.push(`Sources: ${agent.sources.join(", ")}`);
    }
    sections.push("");
  }

  return sections.join("\n");
}

/**
 * Synthesize specialist outputs into final content using the Writer agent.
 */
export async function synthesize({ prompt, specialists, conflicts, ragContext, userStory, stepId }) {
  const specialistText = formatSpecialistOutputs(specialists);
  const conflictText = conflicts.length > 0
    ? `\n=== CONFLICTS TO RESOLVE ===\n${conflicts.map((c, i) =>
        `${i + 1}. [${c.type}] ${c.description}\n   Resolution: ${c.resolution}`
      ).join("\n")}`
    : "";

  const bmcConstraint = stepId === "bmc"
    ? `\n- The JSON canvas MUST include social_environmental_cost and social_environmental_benefit arrays with at least 2 specific items each, derived from SDG and critique specialist insights`
    : "";

  const planConstraint = stepId === "plan"
    ? `\n- Write all 10 numbered sections exactly as specified in the original task (Executive Summary through Conclusion & Next Steps)
- Use ONLY facts from retrieved context; mark inferred claims with [INFERRED]
- Cite BMC block names when referencing business model elements (e.g., Key Partners, Revenue Streams)
- Do NOT contradict the BMC blocks listed below — they are SOURCE OF TRUTH
${ragContext?.planRagText ? `\n${ragContext.planRagText}` : ragContext?.bmcBlocks?.length ? `\n=== SOURCE OF TRUTH — BMC BLOCKS ===\n${ragContext.bmcBlocks.map((b) => `• [${b.label}] ${b.text}`).join("\n")}` : ""}`
    : "";

  const synthesisPrompt = `${specialistText}${conflictText}

=== ORIGINAL TASK ===
${prompt}

=== SYNTHESIS INSTRUCTIONS ===
Integrate all specialist agent insights into a cohesive response for the original task.
- Resolve conflicts using the specified resolution strategies (critique findings take priority over market optimism)
- Include specific data from specialist insights where relevant
- Address all warnings flagged by specialists
- Maintain the output format required by the original task prompt
- Be specific to this business — avoid generic advice${bmcConstraint}${planConstraint}`;

  const content = await writerAgent.generate(synthesisPrompt, ragContext, userStory);

  const synthesisNotes = conflicts.length > 0
    ? `Resolved ${conflicts.length} conflict(s) between specialist agents. Critique/SDG warnings prioritized where applicable.`
    : "All specialist agents aligned; outputs merged without conflicts.";

  return { content, synthesisNotes };
}
