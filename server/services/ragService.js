// ──────────────────────────────────────────────────────────────────
//  RAG Service — Retrieval-Augmented Generation orchestration
//  1. Receives user prompt + step context
//  2. Generates query embedding
//  3. Retrieves relevant docs from ChromaDB collections
//  4. Augments prompt with retrieved context
//  5. Calls Gemini with the enriched prompt
//  6. Returns the response
// ──────────────────────────────────────────────────────────────────

import { generateEmbedding } from "./embeddingService.js";
import { queryRelevant, COLLECTIONS } from "./chromaClient.js";

const MODEL = "gemini-2.5-flash";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Determine which knowledge collections are most relevant for a given step.
 * @param {string} stepId - The current workflow step
 * @returns {string[]} Collection names to query
 */
function getRelevantCollections(stepId) {
  const collectionMap = {
    story: [COLLECTIONS.FRAMEWORKS, COLLECTIONS.INDUSTRY],
    focus: [COLLECTIONS.FRAMEWORKS, COLLECTIONS.SDGS],
    values: [COLLECTIONS.FRAMEWORKS, COLLECTIONS.SDGS],
    dilemmas: [COLLECTIONS.FRAMEWORKS, COLLECTIONS.SDGS, COLLECTIONS.INDUSTRY],
    tensions: [COLLECTIONS.FRAMEWORKS, COLLECTIONS.INDUSTRY],
    issues: [COLLECTIONS.FRAMEWORKS, COLLECTIONS.INDUSTRY],
    swot: [COLLECTIONS.FRAMEWORKS, COLLECTIONS.INDUSTRY],
    bmc: [COLLECTIONS.FRAMEWORKS, COLLECTIONS.INDUSTRY],
    sdg: [COLLECTIONS.SDGS, COLLECTIONS.FRAMEWORKS],
    plan: [COLLECTIONS.BUSINESS_PLAN, COLLECTIONS.FRAMEWORKS, COLLECTIONS.INDUSTRY, COLLECTIONS.SDGS],
    businessplan: [COLLECTIONS.FRAMEWORKS, COLLECTIONS.INDUSTRY, COLLECTIONS.SDGS, COLLECTIONS.BUSINESS_PLAN],
  };

  return collectionMap[stepId] || [COLLECTIONS.FRAMEWORKS, COLLECTIONS.INDUSTRY];
}

/**
 * Retrieve relevant context from the knowledge base and user history.
 * @param {string} query - The query text (prompt or summary)
 * @param {string} stepId - Current step identifier
 * @param {string} sessionId - User session ID
 * @returns {Promise<object>} Retrieved context organized by source
 */
async function retrieveContext(query, stepId, sessionId) {
  const queryEmbedding = await generateEmbedding(query);

  const collections = getRelevantCollections(stepId);
  const context = {
    knowledge: [],
    userHistory: [],
    sources: [],
  };

  // Query each relevant knowledge collection
  for (const collectionName of collections) {
    try {
      const results = await queryRelevant(collectionName, queryEmbedding, 3);
      for (let i = 0; i < results.documents.length; i++) {
        if (results.distances[i] < 1.5) {
          // Only include reasonably relevant results
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
      console.warn(`[RAG] Failed to query ${collectionName}:`, err.message);
    }
  }

  // Query user context for cross-step consistency
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
      console.warn("[RAG] Failed to query user context:", err.message);
    }
  }

  return context;
}

/**
 * Build the augmented prompt with retrieved context prepended.
 * @param {string} originalPrompt - The original user prompt
 * @param {object} context - Retrieved context from retrieveContext()
 * @param {string} userStory - The user's business story (if available)
 * @returns {string} Augmented prompt
 */
function augmentPrompt(originalPrompt, context, userStory) {
  const sections = [];

  // Add grounding knowledge
  if (context.knowledge.length > 0) {
    const knowledgeText = context.knowledge
      .sort((a, b) => b.relevance - a.relevance)
      .map((k) => `• [${k.source}] ${k.text}`)
      .join("\n");
    sections.push(
      `=== GROUNDING CONTEXT (Business Frameworks & Knowledge) ===\nUse the following verified knowledge to ground your response:\n${knowledgeText}`
    );
  }

  // Add user history for cross-step consistency
  if (context.userHistory.length > 0) {
    const historyText = context.userHistory
      .map((h) => `• [Step: ${h.step}] ${h.text}`)
      .join("\n");
    sections.push(
      `=== USER CONTEXT (Previous Steps) ===\nThe user has previously provided the following context. Maintain consistency with these inputs:\n${historyText}`
    );
  }

  // Add user story if provided
  if (userStory) {
    sections.push(`=== USER'S BUSINESS STORY ===\n${userStory}`);
  }

  // Combine with original prompt
  if (sections.length > 0) {
    return `${sections.join("\n\n")}\n\n=== TASK ===\n${originalPrompt}`;
  }

  return originalPrompt;
}

/**
 * Call Gemini with a prompt and return the text response.
 * @param {string} prompt - Complete prompt to send
 * @param {object} opts - Generation config options
 * @returns {Promise<string>} Gemini response text
 */
async function callGemini(prompt, opts = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not set in environment");
  }

  const url = `${BASE_URL}/${MODEL}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxTokens ?? 4096,
      topP: 0.95,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const apiMsg = errData?.error?.message || "";
    throw new Error(
      apiMsg
        ? `Gemini API error (HTTP ${res.status}): ${apiMsg}`
        : `Gemini API error: HTTP ${res.status}`
    );
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini.");
  return text;
}

/**
 * Main RAG orchestration function.
 * Retrieves context, augments the prompt, and calls Gemini.
 * @param {object} params
 * @param {string} params.prompt - The original prompt
 * @param {string} params.stepId - Current workflow step ID
 * @param {string} params.sessionId - User session ID
 * @param {string} params.userStory - User's business story
 * @param {object} params.options - Generation config options
 * @returns {Promise<object>} { response: string, sources: string[] }
 */
export async function generateWithRAG({ prompt, stepId, sessionId, userStory, options = {} }) {
  // 1. Create a shorter query for embedding (use first 500 chars of prompt)
  const queryText = prompt.length > 500 ? prompt.substring(0, 500) : prompt;

  // 2. Retrieve relevant context
  const context = await retrieveContext(queryText, stepId, sessionId);

  // 3. Augment the prompt with retrieved context
  const augmentedPrompt = augmentPrompt(prompt, context, userStory);

  // 4. Call Gemini with the enriched prompt
  const response = await callGemini(augmentedPrompt, options);

  // 5. Return response with source attribution
  return {
    response,
    sources: context.sources,
    contextUsed: {
      knowledgeDocs: context.knowledge.length,
      userHistoryDocs: context.userHistory.length,
    },
  };
}
