// ──────────────────────────────────────────────────────────────────
//  Vector Store Client — In-memory vector storage for RAG
//  Uses an in-memory implementation for local development (no
//  separate server required). Can be swapped for a ChromaDB server
//  connection in production by changing CHROMA_MODE=server in .env.
//
//  Collections: business_frameworks, sdg_knowledge, industry_patterns, user_context
// ──────────────────────────────────────────────────────────────────

// Collection name constants
export const COLLECTIONS = {
  FRAMEWORKS: "business_frameworks",
  SDGS: "sdg_knowledge",
  INDUSTRY: "industry_patterns",
  USER_CONTEXT: "user_context",
  BUSINESS_PLAN: "business_plan_sections",
};

/**
 * In-memory vector store that provides ChromaDB-like interface.
 * Stores documents with embeddings and supports cosine similarity search.
 */
class InMemoryVectorStore {
  constructor() {
    this.collections = {};
  }

  getOrCreateCollection(name) {
    if (!this.collections[name]) {
      this.collections[name] = {
        name,
        documents: [], // { id, text, embedding, metadata }
      };
    }
    return this.collections[name];
  }

  listCollections() {
    return Object.keys(this.collections).map((name) => ({ name }));
  }

  deleteCollection(name) {
    delete this.collections[name];
  }
}

import { loadVectors, scheduleSave } from "./vectorPersistence.js";

let store = null;

/**
 * Get or create the vector store instance.
 * @returns {InMemoryVectorStore}
 */
export function getClient() {
  if (!store) {
    store = new InMemoryVectorStore();
    const saved = loadVectors();
    if (saved) {
      store.collections = saved;
    }
  }
  return store;
}

/**
 * Persist user_context collection to disk (debounced).
 */
export function persistUserContextCollection() {
  const client = getClient();
  scheduleSave(client.collections);
}

/**
 * Get or create a collection by name.
 * @param {string} name - Collection name
 * @returns {object} Collection reference
 */
export function getCollection(name) {
  const client = getClient();
  return client.getOrCreateCollection(name);
}

/**
 * Compute cosine similarity between two vectors.
 * @param {number[]} a - First vector
 * @param {number[]} b - Second vector
 * @returns {number} Cosine similarity (1 = identical, 0 = orthogonal)
 */
function cosineSimilarity(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dotProduct / denom;
}

/**
 * Add documents with embeddings to a collection.
 * @param {string} collectionName - Target collection name
 * @param {object[]} docs - Array of { id, text, embedding, metadata }
 */
export async function addDocuments(collectionName, docs, options = {}) {
  const collection = getCollection(collectionName);

  for (const doc of docs) {
    // Remove existing doc with same ID (upsert behavior)
    collection.documents = collection.documents.filter((d) => d.id !== doc.id);
    collection.documents.push({
      id: doc.id,
      text: doc.text,
      embedding: doc.embedding,
      metadata: doc.metadata || {},
    });
  }

  console.log(`  ✓ Added ${docs.length} documents to "${collectionName}"`);

  if (collectionName === COLLECTIONS.USER_CONTEXT && !options.skipPersist) {
    persistUserContextCollection();
  }
}

/**
 * Query a collection for the most relevant documents using cosine similarity.
 * @param {string} collectionName - Collection to query
 * @param {number[]} queryEmbedding - Query embedding vector
 * @param {number} topK - Number of results to return (default 5)
 * @param {object} whereFilter - Optional metadata filter
 * @returns {Promise<object>} Query results with documents, distances, metadatas
 */
/**
 * Filter documents by metadata (exact match or stepIdIn array).
 * @param {string} collectionName
 * @param {object} filters - { sessionId, stepId, stepIdIn, blockId, chunkType }
 * @param {number} limit
 * @returns {object[]} Matching documents
 */
export function queryByMetadata(collectionName, filters = {}, limit = 50) {
  const collection = getCollection(collectionName);
  let docs = collection.documents;

  if (filters.sessionId) {
    docs = docs.filter((doc) => doc.metadata.sessionId === filters.sessionId);
  }
  if (filters.stepId) {
    docs = docs.filter((doc) => doc.metadata.stepId === filters.stepId);
  }
  if (filters.stepIdIn?.length) {
    docs = docs.filter((doc) => filters.stepIdIn.includes(doc.metadata.stepId));
  }
  if (filters.blockId) {
    docs = docs.filter((doc) => doc.metadata.blockId === filters.blockId);
  }
  if (filters.chunkType) {
    docs = docs.filter((doc) => doc.metadata.chunkType === filters.chunkType);
  }

  return docs.slice(0, limit).map((doc) => ({
    id: doc.id,
    text: doc.text,
    metadata: doc.metadata,
  }));
}

export async function queryRelevant(collectionName, queryEmbedding, topK = 5, whereFilter = null) {
  const collection = getCollection(collectionName);
  let docs = collection.documents;

  // Apply metadata filter if specified
  if (whereFilter) {
    docs = docs.filter((doc) => {
      for (const [key, value] of Object.entries(whereFilter)) {
        if (doc.metadata[key] !== value) return false;
      }
      return true;
    });
  }

  // Calculate similarities
  const scored = docs.map((doc) => ({
    ...doc,
    similarity: cosineSimilarity(queryEmbedding, doc.embedding),
  }));

  // Sort by similarity (highest first) and take top K
  scored.sort((a, b) => b.similarity - a.similarity);
  const topResults = scored.slice(0, topK);

  // Convert similarity to distance (ChromaDB convention: distance = 1 - similarity for cosine)
  return {
    documents: topResults.map((r) => r.text),
    distances: topResults.map((r) => 1 - r.similarity),
    metadatas: topResults.map((r) => r.metadata),
    ids: topResults.map((r) => r.id),
  };
}

/**
 * Delete all documents from a collection (useful for re-seeding).
 * @param {string} collectionName - Collection to clear
 */
export async function clearCollection(collectionName) {
  const client = getClient();
  client.deleteCollection(collectionName);
  console.log(`  ✓ Cleared collection "${collectionName}"`);
}

/**
 * Get document count for a collection.
 * @param {string} collectionName - Collection name
 * @returns {number} Number of documents in the collection
 */
export function getDocumentCount(collectionName) {
  const collection = getCollection(collectionName);
  return collection.documents.length;
}
