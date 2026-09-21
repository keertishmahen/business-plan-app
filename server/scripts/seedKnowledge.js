// ──────────────────────────────────────────────────────────────────
//  Seed Knowledge Base — Embeds and indexes all knowledge files
//  Run: node scripts/seedKnowledge.js
// ──────────────────────────────────────────────────────────────────

import "dotenv/config";
import { seedKnowledgeBase } from "../services/knowledgeSeeder.js";

async function seed() {
  console.log("🌱 Seeding knowledge base into ChromaDB...\n");
  const { total, frameworkChunks, sdgChunks, industryChunks, planChunks } =
    await seedKnowledgeBase({ verbose: true });

  console.log("\n✅ Knowledge base seeding complete!");
  console.log(`   Total documents indexed: ${total}`);
  console.log(
    `   Breakdown: ${frameworkChunks.length} frameworks, ${sdgChunks.length} SDGs, ${industryChunks.length} industry, ${planChunks.length} plan sections`
  );
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
