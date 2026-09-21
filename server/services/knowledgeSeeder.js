// ──────────────────────────────────────────────────────────────────
//  Knowledge Seeder — Shared seeding for startup and CLI script
// ──────────────────────────────────────────────────────────────────

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { generateEmbedding } from "./embeddingService.js";
import { addDocuments, clearCollection, COLLECTIONS, getDocumentCount } from "./chromaClient.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_DIR = resolve(__dirname, "../knowledge");

function chunkFrameworks(data) {
  const chunks = [];

  if (data.businessModelCanvas) {
    chunks.push({
      id: "bmc_overview",
      title: "Business Model Canvas Overview",
      text: `Business Model Canvas (BMC): ${data.businessModelCanvas.description} The 9 building blocks are: ${data.businessModelCanvas.blocks.map((b) => b.name).join(", ")}.`,
    });

    for (const block of data.businessModelCanvas.blocks) {
      chunks.push({
        id: `bmc_${block.id}`,
        title: `BMC - ${block.name}`,
        text: `Business Model Canvas - ${block.name}: ${block.description} Key questions: ${block.keyQuestions.join(" ")} Examples: ${block.examples.join(", ")}. Relationships: ${block.relationships.join("; ")}.`,
      });
    }
  }

  if (data.swotAnalysis) {
    chunks.push({
      id: "swot_overview",
      title: "SWOT Analysis Overview",
      text: `SWOT Analysis: ${data.swotAnalysis.description}`,
    });

    for (const [key, value] of Object.entries(data.swotAnalysis.methodology)) {
      chunks.push({
        id: `swot_${key}`,
        title: `SWOT - ${key.charAt(0).toUpperCase() + key.slice(1)}`,
        text: `SWOT ${key.charAt(0).toUpperCase() + key.slice(1)}: ${value.description}. Prompting questions: ${value.promptingQuestions.join(" ")}`,
      });
    }
  }

  if (data.portersFiveForces) {
    chunks.push({
      id: "porters_overview",
      title: "Porter's Five Forces Overview",
      text: `Porter's Five Forces: ${data.portersFiveForces.description} The five forces are: ${data.portersFiveForces.forces.map((f) => f.name).join(", ")}.`,
    });

    for (const force of data.portersFiveForces.forces) {
      chunks.push({
        id: `porters_${force.name.toLowerCase().replace(/\s+/g, "_")}`,
        title: `Porter's - ${force.name}`,
        text: `Porter's Five Forces - ${force.name}: ${force.description}. Key factors: ${force.factors.join(", ")}.`,
      });
    }
  }

  if (data.valuePropositionCanvas) {
    chunks.push({
      id: "vpc_overview",
      title: "Value Proposition Canvas",
      text: `Value Proposition Canvas: ${data.valuePropositionCanvas.description}. Customer Profile consists of: Jobs (${data.valuePropositionCanvas.customerProfile.jobs}), Pains (${data.valuePropositionCanvas.customerProfile.pains}), Gains (${data.valuePropositionCanvas.customerProfile.gains}). Value Map consists of: Products (${data.valuePropositionCanvas.valueMap.products}), Pain Relievers (${data.valuePropositionCanvas.valueMap.painRelievers}), Gain Creators (${data.valuePropositionCanvas.valueMap.gainCreators}).`,
    });
  }

  if (data.leanCanvas) {
    chunks.push({
      id: "lean_canvas",
      title: "Lean Canvas",
      text: `Lean Canvas: ${data.leanCanvas.description}. Elements: ${data.leanCanvas.elements.join("; ")}.`,
    });
  }

  if (data.businessModelPatterns) {
    for (const pattern of data.businessModelPatterns.patterns) {
      chunks.push({
        id: `pattern_${pattern.name.toLowerCase().replace(/[\s/]+/g, "_")}`,
        title: `Business Model Pattern - ${pattern.name}`,
        text: `Business Model Pattern - ${pattern.name}: ${pattern.description}. Examples: ${pattern.examples.join(", ")}. Best for: ${pattern.bestFor}.`,
      });
    }
  }

  if (data.dilemmaTriangle) {
    chunks.push({
      id: "dilemma_triangle",
      title: "Dilemma Triangle (Triple Bottom Line)",
      text: `Dilemma Triangle: ${data.dilemmaTriangle.description}`,
    });

    for (const driver of data.dilemmaTriangle.drivers) {
      chunks.push({
        id: `dilemma_${driver.name.toLowerCase()}`,
        title: `Dilemma Triangle - ${driver.name}`,
        text: `Dilemma Triangle - ${driver.name}: ${driver.description}. Key tensions: ${driver.tensions.join("; ")}.`,
      });
    }
  }

  return chunks;
}

function chunkSDGs(data) {
  const chunks = [];

  chunks.push({
    id: "sdg_overview",
    title: "UN Sustainable Development Goals Overview",
    text: `UN SDGs: ${data.description}. There are 17 goals covering poverty, hunger, health, education, equality, water, energy, work, innovation, inequality, cities, consumption, climate, oceans, land, peace, and partnerships.`,
  });

  for (const goal of data.goals) {
    chunks.push({
      id: `sdg_${goal.id}`,
      title: `SDG ${goal.id} - ${goal.name}`,
      text: `SDG ${goal.id} - ${goal.name}: ${goal.description}. Key targets: ${goal.targets.join("; ")}. Business applications: ${goal.businessApplications.join("; ")}. Indicators: ${goal.indicators.join("; ")}.`,
    });
  }

  return chunks;
}

function chunkIndustry(data) {
  const chunks = [];

  if (data.marketSizing) {
    chunks.push({
      id: "market_sizing_overview",
      title: "Market Sizing (TAM-SAM-SOM)",
      text: `Market Sizing: ${data.marketSizing.description}`,
    });

    for (const approach of data.marketSizing.approaches) {
      chunks.push({
        id: `market_${approach.name.toLowerCase().replace(/[\s()]+/g, "_")}`,
        title: `Market Sizing - ${approach.name}`,
        text: `${approach.name}: ${approach.description}. Calculation methods: ${approach.calculationMethods.join("; ")}.`,
      });
    }
  }

  if (data.competitiveAnalysis) {
    for (const template of data.competitiveAnalysis.templates) {
      const details = template.dimensions
        ? `Dimensions: ${template.dimensions.join(", ")}.`
        : template.principles
        ? `Principles: ${template.principles.join("; ")}.`
        : template.factors
        ? `Factors: ${template.factors.join(", ")}.`
        : "";
      chunks.push({
        id: `competitive_${template.name.toLowerCase().replace(/[\s/]+/g, "_")}`,
        title: `Competitive Analysis - ${template.name}`,
        text: `${template.name}: ${template.description}. ${details} Usage: ${template.usage || "Apply to understand competitive positioning"}.`,
      });
    }
  }

  if (data.revenueModels) {
    for (const pattern of data.revenueModels.patterns) {
      chunks.push({
        id: `revenue_${pattern.model.toLowerCase().replace(/[\s/]+/g, "_")}`,
        title: `Revenue Model - ${pattern.model}`,
        text: `Revenue Model - ${pattern.model}: ${pattern.description}. Industries: ${pattern.industries.join(", ")}. Key metrics: ${pattern.metrics.join(", ")}. Sustainability fit: ${pattern.sustainabilityFit}.`,
      });
    }
  }

  if (data.customerSegmentArchetypes) {
    for (const archetype of data.customerSegmentArchetypes.archetypes) {
      chunks.push({
        id: `segment_${archetype.name.toLowerCase().replace(/[\s/]+/g, "_")}`,
        title: `Customer Segment - ${archetype.name}`,
        text: `Customer Segment - ${archetype.name}: ${archetype.description}. Characteristics: ${archetype.characteristics.join("; ")}. Reach strategy: ${archetype.reachStrategy}.`,
      });
    }
  }

  if (data.channelStrategies) {
    for (const framework of data.channelStrategies.frameworks) {
      const details = framework.types
        ? `Types: ${framework.types.join(", ")}.`
        : framework.tactics
        ? `Tactics: ${framework.tactics.join(", ")}.`
        : framework.channels
        ? `Channels: ${framework.channels.join(", ")}.`
        : "";
      chunks.push({
        id: `channel_${framework.name.toLowerCase().replace(/[\s-]+/g, "_")}`,
        title: `Channel Strategy - ${framework.name}`,
        text: `Channel Strategy - ${framework.name}: ${framework.description}. ${details} Considerations: ${framework.considerations.join("; ")}.`,
      });
    }
  }

  if (data.financialPlanning) {
    for (const element of data.financialPlanning.elements) {
      const details = element.metrics
        ? `Key metrics: ${element.metrics.join(", ")}.`
        : element.components
        ? `Components: ${element.components.join(", ")}.`
        : "";
      chunks.push({
        id: `financial_${element.name.toLowerCase().replace(/[\s-]+/g, "_")}`,
        title: `Financial Planning - ${element.name}`,
        text: `Financial Planning - ${element.name}: ${element.description}. ${details} ${element.importance || ""} ${element.bestPractices ? "Best practices: " + element.bestPractices.join("; ") : ""}`.trim(),
      });
    }
  }

  return chunks;
}

export function chunkBusinessPlanSections(data) {
  const chunks = [];

  for (const section of data.sections || []) {
    chunks.push({
      id: `plan_section_${section.id}`,
      title: `Business Plan - ${section.title}`,
      text: `Business Plan Section ${section.number}. ${section.title}: ${section.purpose} Key questions: ${section.keyQuestions.join(" ")} Example metrics: ${section.exampleMetrics.join(", ")}. Anti-hallucination rules: ${section.antiHallucinationRules.join(" ")}`,
    });
  }

  return chunks;
}

async function embedAndStore(collectionName, chunks) {
  for (const chunk of chunks) {
    try {
      const embedding = await generateEmbedding(chunk.text);
      await addDocuments(collectionName, [
        {
          id: chunk.id,
          text: chunk.text,
          embedding,
          metadata: { title: chunk.title || chunk.id },
        },
      ]);
    } catch (err) {
      console.error(`    ✗ Failed to embed ${chunk.id}: ${err.message}`);
    }
  }
}

/**
 * Seed all knowledge collections (frameworks, SDGs, industry, business plan sections).
 */
export async function seedKnowledgeBase({ verbose = true } = {}) {
  const frameworks = JSON.parse(readFileSync(resolve(KNOWLEDGE_DIR, "frameworks.json"), "utf-8"));
  const sdgs = JSON.parse(readFileSync(resolve(KNOWLEDGE_DIR, "sdgs.json"), "utf-8"));
  const industry = JSON.parse(readFileSync(resolve(KNOWLEDGE_DIR, "industry.json"), "utf-8"));
  const planSections = JSON.parse(
    readFileSync(resolve(KNOWLEDGE_DIR, "business_plan_sections.json"), "utf-8")
  );

  const frameworkChunks = chunkFrameworks(frameworks);
  const sdgChunks = chunkSDGs(sdgs);
  const industryChunks = chunkIndustry(industry);
  const planChunks = chunkBusinessPlanSections(planSections);

  if (verbose) {
    console.log(
      `   📋 Seeding: ${frameworkChunks.length} frameworks, ${sdgChunks.length} SDGs, ${industryChunks.length} industry, ${planChunks.length} plan sections`
    );
  }

  await clearCollection(COLLECTIONS.FRAMEWORKS);
  await clearCollection(COLLECTIONS.SDGS);
  await clearCollection(COLLECTIONS.INDUSTRY);
  await clearCollection(COLLECTIONS.BUSINESS_PLAN);

  if (verbose) console.log("   📚 Embedding business frameworks...");
  await embedAndStore(COLLECTIONS.FRAMEWORKS, frameworkChunks);

  if (verbose) console.log("   🌍 Embedding SDG knowledge...");
  await embedAndStore(COLLECTIONS.SDGS, sdgChunks);

  if (verbose) console.log("   🏭 Embedding industry patterns...");
  await embedAndStore(COLLECTIONS.INDUSTRY, industryChunks);

  if (verbose) console.log("   📄 Embedding business plan section guidance...");
  await embedAndStore(COLLECTIONS.BUSINESS_PLAN, planChunks);

  const total =
    getDocumentCount(COLLECTIONS.FRAMEWORKS) +
    getDocumentCount(COLLECTIONS.SDGS) +
    getDocumentCount(COLLECTIONS.INDUSTRY) +
    getDocumentCount(COLLECTIONS.BUSINESS_PLAN);

  return { total, frameworkChunks, sdgChunks, industryChunks, planChunks };
}
