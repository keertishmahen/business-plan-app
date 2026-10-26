"""Embed the Six Capitals knowledge into the bundled vector snapshot.

The knowledge collections ship pre-embedded in app/knowledge/vectors_knowledge.json
so a cold container seeds itself with no API calls (chroma_store.
ensure_knowledge_seeded). This adds the `six_capitals_knowledge` collection to
that snapshot and refreshes the business-plan section 9 guidance, whose text now
covers the Six Capitals.

Requires GEMINI_API_KEY (same embedding model as the rest of the snapshot).

    python scripts/build_six_capitals_snapshot.py
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import KNOWLEDGE_DIR  # noqa: E402
from app.services import chroma_store as store  # noqa: E402
from app.services.gemini_client import generate_embeddings_batch  # noqa: E402
from scripts.seed_knowledge import chunk_plan_sections  # noqa: E402

SNAPSHOT = KNOWLEDGE_DIR / "vectors_knowledge.json"


def chunk_six_capitals(data: dict) -> list[dict[str, str]]:
    return [
        {"id": doc["id"], "title": doc["title"], "text": f"{doc['title']}: {doc['text']}"}
        for doc in data.get("documents", [])
    ]


async def embed(chunks: list[dict[str, str]]) -> list[dict]:
    vectors = await generate_embeddings_batch([c["text"] for c in chunks])
    return [
        {"id": c["id"], "text": c["text"], "embedding": v, "metadata": {"title": c["title"]}}
        for c, v in zip(chunks, vectors)
    ]


async def main() -> int:
    snapshot = json.loads(SNAPSHOT.read_text(encoding="utf-8"))

    capitals = json.loads((KNOWLEDGE_DIR / "six_capitals.json").read_text(encoding="utf-8"))
    docs = await embed(chunk_six_capitals(capitals))
    snapshot[store.Collections.SIX_CAPITALS] = {"documents": docs}
    print(f"  ✓ {store.Collections.SIX_CAPITALS}: {len(docs)} documents")

    plan = json.loads((KNOWLEDGE_DIR / "business_plan_sections.json").read_text(encoding="utf-8"))
    section9 = [c for c in chunk_plan_sections(plan) if c["id"] == "plan_section_sdg_alignment"]
    [refreshed] = await embed(section9)
    plan_docs = snapshot[store.Collections.BUSINESS_PLAN]["documents"]
    for i, doc in enumerate(plan_docs):
        if doc["id"] == refreshed["id"]:
            plan_docs[i] = refreshed
            break
    else:
        plan_docs.append(refreshed)
    print(f"  ✓ {store.Collections.BUSINESS_PLAN}: refreshed {refreshed['id']}")

    SNAPSHOT.write_text(json.dumps(snapshot), encoding="utf-8")
    print(f"Wrote {SNAPSHOT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
