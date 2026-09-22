// ──────────────────────────────────────────────────────────────────
//  Gemini API Client Service
//  Reads API key from env variable, falls back to manual entry.
//  Provides auto-retry on JSON parse failure.
// ──────────────────────────────────────────────────────────────────

const MODEL = "gemini-2.5-flash";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// Module-level variable for manually-set API key
let _manualApiKey = null;

/**
 * Get the current API key.
 * Reads from REACT_APP_GEMINI_API_KEY env variable first,
 * then falls back to the manually-set key.
 * @returns {string|null} The API key, or null if none is available
 */
export function getApiKey() {
  const envKey = process.env.REACT_APP_GEMINI_API_KEY;
  if (envKey) return envKey;
  return _manualApiKey;
}

/**
 * Set the API key manually (in-memory storage).
 * @param {string} key - The Gemini API key
 */
export function setApiKey(key) {
  _manualApiKey = key;
}

/**
 * Check if an API key is available (either from env or manually set).
 * @returns {boolean}
 */
export function hasApiKey() {
  if (isServerManaged()) return true;
  return Boolean(getApiKey());
}

/**
 * Send a prompt to Gemini and return the raw text response.
 * Uses the configured API key (env variable or manual).
 * @param {string} prompt - Full prompt string
 * @param {object} opts - Optional generation config overrides
 * @returns {Promise<string>} Raw text response from Gemini
 */
export async function callGemini(prompt, opts = {}) {
  if (isServerManaged()) {
    return callRAG(prompt, { options: opts });
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("No API key configured. Set REACT_APP_GEMINI_API_KEY environment variable or enter a key manually.");
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
    const msg = apiMsg
      ? `Gemini API error (HTTP ${res.status}): ${apiMsg}`
      : `Gemini API error: HTTP ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini.");
  return text;
}

/**
 * Parse JSON from Gemini's raw text response.
 * Strips markdown fences if present.
 * @param {string} text - Raw text from Gemini
 * @returns {object|null} Parsed JSON object, or null if parsing fails
 */
export function parseGeminiJSON(text) {
  // Remove ```json ... ``` fences
  const stripped = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  // Extract first {...} block
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/**
 * Call Gemini and parse the response as JSON with auto-retry.
 * If the first parse attempt fails, retries the entire call ONCE.
 * If the second parse also fails, throws a descriptive error.
 * @param {string} prompt - Full prompt string
 * @param {object} opts - Optional generation config overrides
 * @returns {Promise<object>} Parsed JSON object from Gemini
 */
export async function callGeminiJSON(prompt, opts = {}) {
  // First attempt
  const text1 = await callGemini(prompt, opts);
  const result1 = parseGeminiJSON(text1);
  if (result1 !== null) return result1;

  // Retry once on parse failure
  const text2 = await callGemini(prompt, opts);
  const result2 = parseGeminiJSON(text2);
  if (result2 !== null) return result2;

  // Both attempts failed
  throw new Error(
    "The AI returned an unexpected response after 2 attempts. " +
    "Please try again."
  );
}

// ──────────────────────────────────────────────────────────────────
//  RAG Backend Integration
//  Calls the RAG server for context-enriched generation.
//  Falls back to direct Gemini calls if the backend is unavailable
//  (local/dev only — never on Azure static hosting).
// ──────────────────────────────────────────────────────────────────

const AZURE_API_URL = "https://symetra-mia-api.azurewebsites.net";
const AZURE_STATIC_HOST_HINT = "symetramiaweb";

function isLocalUrl(url) {
  if (!url) return true;
  return url.includes("localhost") || url.includes("127.0.0.1");
}

function isAzureStaticHost() {
  if (typeof window === "undefined" || !window.location?.hostname) return false;
  return window.location.hostname.includes(AZURE_STATIC_HOST_HINT);
}

/**
 * Resolve the RAG base URL at call time.
 * Production CRA builds use .env.production; this also corrects stale
 * localhost builds accidentally deployed to Azure static hosting.
 */
export function getRagBaseUrl() {
  const envUrl = process.env.REACT_APP_RAG_URL || "";
  if (isAzureStaticHost() && isLocalUrl(envUrl)) {
    return AZURE_API_URL;
  }
  return envUrl || "http://localhost:3002";
}

/** Production mode: all AI calls go through the RAG backend (no browser API key). */
export function isServerManaged() {
  if (isAzureStaticHost()) return true;
  const url = getRagBaseUrl();
  return !isLocalUrl(url);
}

/**
 * Attach retrieval sources to agent metadata without clobbering it.
 * Keeps provenance and agent telemetry in one object for the context panel.
 * @param {object|null} metadata
 * @param {string[]|undefined} sources
 * @returns {object|null}
 */
function withSources(metadata, sources) {
  if (!Array.isArray(sources) || sources.length === 0) return metadata || null;
  return { ...(metadata || {}), sources };
}

/**
 * Call the RAG backend for context-enriched generation.
 * Falls back to direct Gemini call if backend is unavailable (dev only).
 * @param {string} prompt - Full prompt string
 * @param {object} params - RAG parameters
 * @param {string} params.stepId - Current workflow step ID
 * @param {string} params.sessionId - User session identifier
 * @param {string} params.userStory - The user's business story
 * @param {object} params.options - Optional generation config
 * @returns {Promise<string>} Generated response text
 */
export async function callRAG(prompt, { stepId, sessionId, userStory, options = {}, onMeta } = {}) {
  const base = getRagBaseUrl();
  try {
    const res = await fetch(`${base}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, stepId, sessionId, userStory, options }),
    });
    if (!res.ok) throw new Error(`RAG server error: ${res.status}`);
    const data = await res.json();
    // Retrieval provenance is reported separately so the return type stays a
    // plain string for every existing caller (feedback p29: RAG was invisible).
    if (onMeta) {
      onMeta({ sources: data.sources || [], contextUsed: data.contextUsed || null });
    }
    return data.response;
  } catch (error) {
    if (isServerManaged()) {
      throw new Error(`RAG server unavailable: ${error.message}`);
    }
    console.warn("[RAG] Falling back to direct Gemini:", error.message);
    return callGemini(prompt, options);
  }
}

/**
 * Store user context in the RAG vector database for cross-step consistency.
 * Uses chunked storage for structured steps (BMC blocks, plan sections).
 */
export async function storeStepOutput(sessionId, stepId, content, metadata = {}) {
  if (content == null || content === "") return;

  const payload =
    typeof content === "string" ? content : JSON.stringify(content, null, 2);

  try {
    await fetch(`${getRagBaseUrl()}/api/context/store`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        stepId,
        content: payload,
        metadata,
        chunked: true,
      }),
    });
  } catch (error) {
    console.warn("[RAG] Failed to store step output:", error.message);
  }
}

/**
 * @deprecated Use storeStepOutput — kept for backward compatibility.
 */
export async function storeUserContext(sessionId, stepId, content, metadata = {}) {
  return storeStepOutput(sessionId, stepId, content, metadata);
}

/**
 * Call RAG with multi-agent pipeline.
 * Uses the orchestrator to coordinate Writer, Fact-Checker, Consistency,
 * and Critic agents for higher-quality outputs.
 * Supports progress callbacks for showing agent stages to the user.
 * Falls back to standard RAG if multi-agent pipeline fails.
 * @param {string} prompt - The generation prompt
 * @param {object} params - { stepId, sessionId, userStory, options }
 * @param {function} onProgress - callback({ stage, message, metadata }) for UI updates
 * @returns {Promise<string>} Final generated response
 */
/** Steps that use the MIA multi-agent pipeline */
export const MIA_STEPS = ["focus", "issues", "tensions", "dilemmas", "values", "swot", "bmc", "plan"];

export function shouldUseMultiAgent(stepId) {
  return MIA_STEPS.includes(stepId);
}

/**
 * Parse SSE stream from the MIA pipeline (event-block based).
 */
async function parseSSEStream(response, onProgress) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResponse = null;

  function processBlock(block) {
    if (!block.trim()) return;

    let eventType = "stage";
    let data = null;

    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith("event:")) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        try {
          data = JSON.parse(line.slice(5).trim());
        } catch {
          // skip malformed JSON
        }
      }
    }

    if (data && onProgress) {
      onProgress({ event: eventType, ...data });
      if (eventType === "complete" && data.response) {
        finalResponse = data;
      }
    }
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() || "";

    for (const block of blocks) {
      processBlock(block);
    }
  }

  if (buffer.trim()) {
    processBlock(buffer);
  }

  return finalResponse;
}

function isUnreachableError(error) {
  const msg = String(error?.message || error || "");
  return (
    msg.includes("Failed to fetch") ||
    msg.includes("NetworkError") ||
    msg.includes("Load failed") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("Network request failed")
  );
}

/**
 * Call MIA pipeline with SSE streaming for real-time agent progress.
 */
export async function callMultiAgentStream(prompt, params = {}, onProgress) {
  const base = getRagBaseUrl();
  try {
    if (onProgress) {
      onProgress({
        event: "stage",
        name: "starting",
        status: "running",
        message: "Initializing MIA pipeline...",
      });
    }

    const res = await fetch(`${base}/api/generate/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...params, prompt }),
    });

    if (!res.ok) throw new Error(`Multi-agent stream error: ${res.status}`);

    const result = await parseSSEStream(res, onProgress);
    if (result?.response) {
      // Carry retrieval provenance alongside the agent metadata so the context
      // panel can show which documents grounded this step (feedback p29).
      return {
        response: result.response,
        agentMetadata: withSources(result.agentMetadata, result.sources),
      };
    }

    throw new Error("Stream completed without response");
  } catch (error) {
    console.warn("[MultiAgentStream] Falling back to callMultiAgent:", error.message);
    if (onProgress && isUnreachableError(error)) {
      onProgress({
        event: "stage",
        name: "mia-unreachable",
        status: "error",
        message: "MIA backend unreachable — trying alternate path",
      });
    }
    return callMultiAgent(prompt, params, onProgress, {
      skipInitEvent: true,
      streamFailedUnreachable: isUnreachableError(error),
    });
  }
}

export async function callMultiAgent(prompt, params = {}, onProgress, options = {}) {
  const { skipInitEvent = false } = options;
  const base = getRagBaseUrl();

  try {
    if (onProgress && !skipInitEvent) {
      onProgress({
        event: "stage",
        name: "starting",
        status: "running",
        message: "Initializing multi-agent pipeline...",
      });
    }

    const res = await fetch(`${base}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...params,
        prompt,
        useAgents: true,
      }),
    });

    if (!res.ok) throw new Error(`Multi-agent error: ${res.status}`);
    const data = await res.json();

    if (onProgress && data.agentMetadata) {
      onProgress({
        event: "complete",
        name: "complete",
        status: "complete",
        message: "Multi-agent pipeline complete",
        agentMetadata: data.agentMetadata,
      });
    }

    return {
      response: data.response,
      agentMetadata: withSources(data.agentMetadata, data.sources),
    };
  } catch (error) {
    console.warn("[MultiAgent] Falling back to direct RAG:", error.message);
    const unreachable = isUnreachableError(error) || options.streamFailedUnreachable;
    if (onProgress) {
      onProgress({
        event: "stage",
        name: unreachable ? "mia-unreachable" : "fallback",
        status: "running",
        message: unreachable
          ? "MIA agents offline — using direct generation"
          : "Using direct generation",
      });
    }

    // Server-managed: stay on RAG without useAgents; never drop to browser Gemini
    // unless callRAG itself decides (dev-only).
    const response = await callRAG(prompt, params);
    if (onProgress) {
      onProgress({
        event: "stage",
        name: "fallback",
        status: "complete",
        message: "Direct generation complete",
      });
    }
    return { response, agentMetadata: null };
  }
}

/**
 * Check if the RAG backend is available.
 * @returns {Promise<boolean>} true if backend is healthy
 */
export async function isRAGAvailable() {
  try {
    const res = await fetch(`${getRagBaseUrl()}/api/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Test an API key with a trivial prompt.
 * @param {string} key - API key to test (uses provided key, not the configured one)
 * @returns {Promise<boolean>} true if the key is valid
 */
export async function testApiKey(key) {
  const url = `${BASE_URL}/${MODEL}:generateContent?key=${key}`;

  const body = {
    contents: [{ parts: [{ text: 'Respond with exactly the word "ok" and nothing else.' }] }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 10,
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
    const msg = apiMsg
      ? `API key validation failed (HTTP ${res.status}): ${apiMsg}`
      : `API key validation failed: HTTP ${res.status}`;
    throw new Error(msg);
  }

  return true;
}
