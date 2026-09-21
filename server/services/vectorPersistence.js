// ──────────────────────────────────────────────────────────────────
//  Vector Persistence — File-based save/load for in-memory vector store
// ──────────────────────────────────────────────────────────────────

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const VECTORS_FILE = path.join(DATA_DIR, "vectors.json");

/**
 * Ensure data directory exists.
 */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Save vector store collections to disk.
 * @param {object} collections - The collections object from InMemoryVectorStore
 */
export function saveVectors(collections) {
  try {
    ensureDataDir();
    const serializable = {};

    for (const [name, collection] of Object.entries(collections)) {
      serializable[name] = {
        name: collection.name,
        documents: collection.documents.map((doc) => ({
          id: doc.id,
          text: doc.text,
          embedding: doc.embedding,
          metadata: doc.metadata || {},
        })),
      };
    }

    fs.writeFileSync(VECTORS_FILE, JSON.stringify(serializable, null, 2));
    console.log(`  ✓ Saved vector store to ${VECTORS_FILE}`);
  } catch (error) {
    console.warn("[VectorPersistence] Failed to save vectors:", error.message);
  }
}

/**
 * Load vector store collections from disk.
 * @returns {object|null} Collections object or null if no saved data
 */
export function loadVectors() {
  try {
    if (!fs.existsSync(VECTORS_FILE)) return null;

    const raw = fs.readFileSync(VECTORS_FILE, "utf-8");
    const data = JSON.parse(raw);

    console.log(`  ✓ Loaded vector store from ${VECTORS_FILE}`);
    return data;
  } catch (error) {
    console.warn("[VectorPersistence] Failed to load vectors:", error.message);
    return null;
  }
}

/**
 * Schedule a debounced save (avoid writing on every document add).
 */
let saveTimer = null;

export function scheduleSave(collections) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveVectors(collections);
    saveTimer = null;
  }, 5000);
}
