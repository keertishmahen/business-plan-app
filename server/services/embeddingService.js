// ──────────────────────────────────────────────────────────────────
//  Embedding Service — Gemini text-embedding-004
//  Generates vector embeddings for text using Google's embedding model.
// ──────────────────────────────────────────────────────────────────

const EMBEDDING_MODEL = "gemini-embedding-001";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Generate a single embedding vector for a text string.
 * @param {string} text - The text to embed
 * @returns {Promise<number[]>} 768-dimensional float array
 */
export async function generateEmbedding(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not set in environment");
  }

  const url = `${BASE_URL}/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: {
        parts: [{ text }],
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Embedding API error (HTTP ${res.status}): ${err?.error?.message || "Unknown error"}`
    );
  }

  const data = await res.json();
  return data.embedding.values;
}

/**
 * Generate embeddings for multiple texts in batch.
 * Processes sequentially to respect rate limits.
 * @param {string[]} texts - Array of texts to embed
 * @returns {Promise<number[][]>} Array of embedding vectors
 */
export async function generateEmbeddings(texts) {
  const embeddings = [];
  for (const text of texts) {
    const embedding = await generateEmbedding(text);
    embeddings.push(embedding);
    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return embeddings;
}
