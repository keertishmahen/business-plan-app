/**
 * Safely format agent insight/warning/source items for React display.
 * Handles strings, numbers, and structured objects from LLM output.
 */
export function formatAgentText(item) {
  if (item == null) return "";
  if (typeof item === "string") return item.trim();
  if (typeof item === "number" || typeof item === "boolean") return String(item);

  if (typeof item === "object") {
    if (item.explanation) {
      const parts = [];
      if (item.type) parts.push(`[${item.type}]`);
      if (item.flag) parts.push(String(item.flag));
      parts.push(item.explanation);
      if (item.impact_metrics_recommendation) {
        parts.push(`Metrics: ${item.impact_metrics_recommendation}`);
      }
      return parts.join(" ").trim();
    }

    for (const key of [
      "text",
      "message",
      "description",
      "content",
      "insight",
      "warning",
      "label",
      "title",
      "summary",
      "finding",
      "tension",
      "dilemma",
      "recommendation",
    ]) {
      if (typeof item[key] === "string" && item[key].trim()) {
        return item[key].trim();
      }
    }

    try {
      return JSON.stringify(item);
    } catch {
      return "[Invalid data]";
    }
  }

  return String(item);
}

/**
 * Normalize an array of mixed items to display-safe strings.
 */
export function formatAgentTextList(items) {
  if (!items) return [];
  const arr = Array.isArray(items) ? items : [items];
  return arr.map(formatAgentText).filter(Boolean);
}

const ALTERNATE_INSIGHT_KEYS = [
  "findings",
  "tensions",
  "dilemmas",
  "observations",
  "keyInsights",
  "analysis",
  "points",
  "items",
];

/**
 * Collect displayable insight strings from a specialist payload,
 * including alternate LLM schema keys when `insights` is empty.
 */
export function collectSpecialistInsights(data) {
  if (!data || typeof data !== "object") return [];

  let insights = formatAgentTextList(data.insights);
  if (insights.length > 0) return insights;

  for (const key of ALTERNATE_INSIGHT_KEYS) {
    if (data[key] == null) continue;
    insights = formatAgentTextList(data[key]);
    if (insights.length > 0) return insights;
  }

  for (const key of ["summary", "narrative", "output"]) {
    if (typeof data[key] === "string" && data[key].trim()) {
      return [data[key].trim()];
    }
  }

  return [];
}

/**
 * Whether a specialist payload has anything worth showing in Agent Context.
 */
export function hasSpecialistDisplayContent(data) {
  if (!data || typeof data !== "object") return false;
  if (collectSpecialistInsights(data).length > 0) return true;
  if (formatAgentTextList(data.warnings).length > 0) return true;
  if (formatAgentTextList(data.sources).length > 0) return true;
  return false;
}

/**
 * Normalize specialist agent payloads so React never receives raw LLM objects.
 */
export function sanitizeSpecialistData(data) {
  if (!data || typeof data !== "object") return data;

  const insights = collectSpecialistInsights(data);
  const warnings = formatAgentTextList(data.warnings);
  const sources = formatAgentTextList(data.sources);

  return {
    ...data,
    insights,
    warnings,
    sources,
  };
}

/**
 * Sanitize full MIA agentMetadata before storing in React state.
 */
export function sanitizeAgentMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") return metadata;

  const specialists = metadata.specialists
    ? Object.fromEntries(
        Object.entries(metadata.specialists).map(([id, spec]) => [
          id,
          spec ? sanitizeSpecialistData(spec) : spec,
        ])
      )
    : metadata.specialists;

  const conflicts = Array.isArray(metadata.conflicts)
    ? metadata.conflicts.map((c) => ({
        ...c,
        description: formatAgentText(c.description),
        resolution: formatAgentText(c.resolution),
      }))
    : metadata.conflicts;

  return { ...metadata, specialists, conflicts };
}

/** Collect unique RAG source labels from specialist metadata. */
export function collectRagSourcesFromMetadata(metadata) {
  if (!metadata?.specialists) return [];
  const sources = [];
  Object.values(metadata.specialists).forEach((spec) => {
    if (spec?.sources?.length) {
      sources.push(...formatAgentTextList(spec.sources));
    }
  });
  return [...new Set(sources)].filter(Boolean);
}
