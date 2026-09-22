"""Retrieval for the nine workflow steps, including the BMC → business plan path.

Ports server/services/{ragService,planRagService,stepContextStore}.js onto the
real Chroma store. The plan step uses hybrid retrieval: metadata-filtered BMC
blocks and prior steps (exact, not fuzzy) plus a semantic sweep of the knowledge
base. That is the link Shiva reports as missing — it exists, but until now it was
invisible in the UI, so `sources` is returned for the frontend to display.
"""

from __future__ import annotations

import json
import logging
import time
import uuid
from typing import Any

from . import chroma_store as store
from .gemini_client import generate_embedding

log = logging.getLogger(__name__)

# Which collections each step draws on (orchestrator.js collectionMap).
STEP_COLLECTIONS: dict[str, list[str]] = {
    "story": [store.Collections.FRAMEWORKS, store.Collections.INDUSTRY],
    "focus": [store.Collections.FRAMEWORKS, store.Collections.SDGS],
    "values": [store.Collections.FRAMEWORKS, store.Collections.SDGS],
    "dilemmas": [store.Collections.FRAMEWORKS, store.Collections.SDGS, store.Collections.INDUSTRY],
    "tensions": [store.Collections.FRAMEWORKS, store.Collections.INDUSTRY],
    "issues": [store.Collections.FRAMEWORKS, store.Collections.INDUSTRY],
    "swot": [store.Collections.FRAMEWORKS, store.Collections.INDUSTRY],
    "bmc": [store.Collections.FRAMEWORKS, store.Collections.INDUSTRY, store.Collections.SDGS],
    "sdg": [store.Collections.SDGS, store.Collections.FRAMEWORKS],
    "businessplan": [
        store.Collections.FRAMEWORKS,
        store.Collections.INDUSTRY,
        store.Collections.SDGS,
        store.Collections.BUSINESS_PLAN,
    ],
    "plan": [
        store.Collections.BUSINESS_PLAN,
        store.Collections.FRAMEWORKS,
        store.Collections.INDUSTRY,
        store.Collections.SDGS,
    ],
}

_DEFAULT_COLLECTIONS = [store.Collections.FRAMEWORKS, store.Collections.INDUSTRY]

BMC_BLOCK_IDS = [
    "key_partners",
    "key_activities",
    "key_resources",
    "value_propositions",
    "customer_relationships",
    "channels",
    "customer_segments",
    "cost_structure",
    "revenue_streams",
    "social_environmental_cost",
    "social_environmental_benefit",
]

PRIOR_STEP_IDS = ["swot", "values", "dilemmas", "sdg_mapping", "focus", "issues", "tensions"]

KNOWLEDGE_COLLECTIONS = [
    store.Collections.BUSINESS_PLAN,
    store.Collections.FRAMEWORKS,
    store.Collections.INDUSTRY,
    store.Collections.SDGS,
]


def empty_context() -> dict[str, Any]:
    return {
        "knowledge": [],
        "userHistory": [],
        "sources": [],
        "bmcBlocks": [],
        "priorSteps": [],
        "coverageReport": None,
    }


# ── Step context store ────────────────────────────────────────────


async def store_step_output(session_id: str, step_id: str, content: Any) -> int:
    """Embed and persist a step's output so later steps can retrieve it.

    BMC output is split one document per block, which is what makes the
    metadata-filtered plan retrieval exact rather than fuzzy.
    """
    if not session_id or not step_id or content is None:
        return 0

    chunks: list[tuple[str, str, dict[str, Any]]] = []  # (id, text, metadata)
    stamp = int(time.time() * 1000)

    if step_id == "bmc" and isinstance(content, dict):
        blocks = content.get("blocks") if isinstance(content.get("blocks"), dict) else content
        for block_id, items in (blocks or {}).items():
            text = _as_text(items)
            if not text:
                continue
            chunks.append(
                (
                    f"{session_id}:bmc:{block_id}",
                    f"{block_id.replace('_', ' ')}: {text}",
                    {
                        "sessionId": session_id,
                        "stepId": "bmc",
                        "chunkType": "bmc_block",
                        "blockId": block_id,
                        "ts": stamp,
                    },
                )
            )
    else:
        text = _as_text(content)
        if text:
            chunks.append(
                (
                    f"{session_id}:{step_id}:{uuid.uuid4().hex[:8]}",
                    text,
                    {
                        "sessionId": session_id,
                        "stepId": step_id,
                        "chunkType": "step_output",
                        "ts": stamp,
                    },
                )
            )

    if not chunks:
        return 0

    stored = 0
    for chunk_id, text, metadata in chunks:
        try:
            embedding = await generate_embedding(text[:8000])
        except Exception as exc:  # noqa: BLE001 - storing context must not break a step
            log.warning("Embedding failed for %s: %s", chunk_id, exc)
            continue
        store.add_documents(
            store.Collections.USER_CONTEXT,
            ids=[chunk_id],
            documents=[text],
            embeddings=[embedding],
            metadatas=[metadata],
        )
        stored += 1

    return stored


def _as_text(value: Any) -> str:
    """Flatten a step output to embeddable text."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (int, float, bool)):
        return str(value)
    if isinstance(value, list):
        parts = [_as_text(v) for v in value]
        return "\n".join(p for p in parts if p)
    if isinstance(value, dict):
        for key in ("text", "content", "description", "title"):
            inner = value.get(key)
            if isinstance(inner, str) and inner.strip():
                return inner.strip()
        try:
            return json.dumps(value)[:8000]
        except (TypeError, ValueError):
            return ""
    return str(value)


# ── Generic per-step retrieval ────────────────────────────────────


async def retrieve_context(
    query: str,
    step_id: str,
    session_id: str,
    options: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Assemble grounding context for a step. Never raises."""
    options = options or {}
    context = empty_context()

    if step_id == "plan":
        try:
            plan_context = await retrieve_plan_context(
                session_id=session_id,
                prompt=query,
                selected_vp_title=options.get("selectedVpTitle", ""),
            )
            plan_context["planRagText"] = format_plan_rag_context(plan_context)
            return plan_context
        except Exception as exc:  # noqa: BLE001 - fall through to generic retrieval
            log.warning("Plan RAG retrieval failed, falling back: %s", exc)

    try:
        query_embedding = await generate_embedding(query[:500])
    except Exception as exc:  # noqa: BLE001
        log.warning("Query embedding failed: %s", exc)
        return context

    for collection in STEP_COLLECTIONS.get(step_id, _DEFAULT_COLLECTIONS):
        results = store.query_relevant(collection, query_embedding, 3)
        for i, document in enumerate(results["documents"]):
            distance = results["distances"][i]
            if not store.is_relevant(distance):
                continue
            context["knowledge"].append(
                {"text": document, "source": collection, "relevance": 1 - distance}
            )
            meta = results["metadatas"][i] or {}
            label = meta.get("title") or results["ids"][i]
            context["sources"].append(f"{collection}:{label}")

    if session_id:
        results = store.query_relevant(
            store.Collections.USER_CONTEXT, query_embedding, 5, {"sessionId": session_id}
        )
        for i, document in enumerate(results["documents"]):
            distance = results["distances"][i]
            if not store.is_relevant(distance):
                continue
            meta = results["metadatas"][i] or {}
            context["userHistory"].append(
                {
                    "text": document,
                    "step": meta.get("stepId", "unknown"),
                    "relevance": 1 - distance,
                }
            )

    return context


# ── BMC → business plan hybrid retrieval ──────────────────────────


async def retrieve_plan_context(
    *,
    session_id: str,
    prompt: str,
    selected_vp_title: str = "",
) -> dict[str, Any]:
    """Exact BMC blocks + prior steps + semantic knowledge sweep."""
    context = empty_context()

    bmc_docs = (
        store.query_by_metadata(
            store.Collections.USER_CONTEXT,
            {"sessionId": session_id, "stepId": "bmc", "chunkType": "bmc_block"},
            limit=20,
        )
        if session_id
        else []
    )
    for doc in bmc_docs:
        block_id = (doc.get("metadata") or {}).get("blockId", "unknown")
        context["bmcBlocks"].append(
            {
                "blockId": block_id,
                "label": str(block_id).replace("_", " "),
                "text": doc.get("text", ""),
                "metadata": doc.get("metadata", {}),
            }
        )
        context["sources"].append(f"user_context:bmc_{block_id}")

    prior_docs = (
        store.query_by_metadata(
            store.Collections.USER_CONTEXT,
            {"sessionId": session_id, "stepIdIn": PRIOR_STEP_IDS},
            limit=20,
        )
        if session_id
        else []
    )
    for doc in prior_docs:
        step = (doc.get("metadata") or {}).get("stepId", "unknown")
        context["priorSteps"].append(
            {"text": doc.get("text", ""), "step": step, "metadata": doc.get("metadata", {})}
        )
        context["sources"].append(f"user_context:{step}")

    query_text = "\n".join(
        part
        for part in [
            prompt[:400] if prompt else "",
            f"Value proposition: {selected_vp_title}" if selected_vp_title else "",
        ]
        if part
    )

    try:
        query_embedding = await generate_embedding(query_text or "business plan sections")
    except Exception as exc:  # noqa: BLE001
        log.warning("Plan query embedding failed: %s", exc)
        query_embedding = None

    if query_embedding is not None:
        for collection in KNOWLEDGE_COLLECTIONS:
            results = store.query_relevant(collection, query_embedding, 3)
            for i, document in enumerate(results["documents"]):
                distance = results["distances"][i]
                if not store.is_relevant(distance):
                    continue
                context["knowledge"].append(
                    {"text": document, "source": collection, "relevance": 1 - distance}
                )
                meta = results["metadatas"][i] or {}
                label = meta.get("title") or results["ids"][i]
                context["sources"].append(f"{collection}:{label}")

    retrieved_block_ids = {b["blockId"] for b in context["bmcBlocks"]}
    context["coverageReport"] = {
        "bmcBlocksRetrieved": len(retrieved_block_ids),
        "bmcBlocksTotal": len(BMC_BLOCK_IDS),
        "bmcComplete": all(bid in retrieved_block_ids for bid in BMC_BLOCK_IDS),
        "priorStepsRetrieved": len(context["priorSteps"]),
        "knowledgeDocs": len(context["knowledge"]),
    }

    context["userHistory"] = [
        {"text": b["text"], "step": "bmc", "blockId": b["blockId"]} for b in context["bmcBlocks"]
    ] + context["priorSteps"]

    return context


def format_plan_rag_context(plan_context: dict[str, Any]) -> str:
    """Render the plan grounding block, BMC first as the source of truth."""
    sections: list[str] = []

    if plan_context.get("bmcBlocks"):
        body = "\n".join(f"• [{b['label']}] {b['text']}" for b in plan_context["bmcBlocks"])
        sections.append(f"=== SOURCE OF TRUTH — BMC BLOCKS (do not contradict) ===\n{body}")

    if plan_context.get("priorSteps"):
        body = "\n".join(
            f"• [Step: {p['step']}] {p['text']}" for p in plan_context["priorSteps"]
        )
        sections.append(f"=== PRIOR WORKFLOW STEPS ===\n{body}")

    if plan_context.get("knowledge"):
        ranked = sorted(
            plan_context["knowledge"], key=lambda k: k.get("relevance", 0), reverse=True
        )
        body = "\n".join(f"• [{k['source']}] {k['text']}" for k in ranked)
        sections.append(f"=== BUSINESS PLAN SECTION GUIDANCE & FRAMEWORKS ===\n{body}")

    return "\n\n".join(sections)
