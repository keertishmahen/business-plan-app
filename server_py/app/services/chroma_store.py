"""Persistent vector store backed by ChromaDB.

The Node implementation (server/services/chromaClient.js) declared a
ChromaDB-shaped interface but was actually an in-memory dict persisted to a
10MB vectors.json. This is a real PersistentClient: it survives restarts and
supports metadata filtering natively.

Embeddings are supplied by the caller (Gemini), so every collection is created
with embedding_function=None and we pass vectors explicitly.
"""

from __future__ import annotations

import logging
import threading
from typing import Any

import chromadb
from chromadb.config import Settings

from ..config import CHROMA_PATH, RELEVANCE_DISTANCE_CUTOFF

log = logging.getLogger(__name__)


class Collections:
    FRAMEWORKS = "business_frameworks"
    SDGS = "sdg_knowledge"
    INDUSTRY = "industry_patterns"
    USER_CONTEXT = "user_context"
    BUSINESS_PLAN = "business_plan_sections"


ALL_COLLECTIONS = [
    Collections.FRAMEWORKS,
    Collections.SDGS,
    Collections.INDUSTRY,
    Collections.USER_CONTEXT,
    Collections.BUSINESS_PLAN,
]

_client: chromadb.ClientAPI | None = None
_lock = threading.Lock()


def get_client() -> chromadb.ClientAPI:
    """Process-wide persistent client."""
    global _client
    if _client is None:
        with _lock:
            if _client is None:
                _client = chromadb.PersistentClient(
                    path=CHROMA_PATH,
                    settings=Settings(anonymized_telemetry=False, allow_reset=True),
                )
                log.info("Chroma persistent client open at %s", CHROMA_PATH)
    return _client


def get_collection(name: str):
    """Fetch or create a collection. Cosine space matches the Node distances."""
    return get_client().get_or_create_collection(
        name=name,
        embedding_function=None,
        metadata={"hnsw:space": "cosine"},
    )


def _clean_metadata(meta: dict[str, Any] | None) -> dict[str, Any]:
    """Chroma only accepts scalar metadata values."""
    if not meta:
        return {}
    out: dict[str, Any] = {}
    for key, value in meta.items():
        if value is None:
            continue
        if isinstance(value, (str, int, float, bool)):
            out[key] = value
        else:
            out[key] = str(value)
    return out


def add_documents(
    collection_name: str,
    *,
    ids: list[str],
    documents: list[str],
    embeddings: list[list[float]],
    metadatas: list[dict[str, Any]] | None = None,
) -> None:
    """Upsert documents so re-seeding is idempotent."""
    if not ids:
        return
    coll = get_collection(collection_name)
    coll.upsert(
        ids=ids,
        documents=documents,
        embeddings=embeddings,
        metadatas=[_clean_metadata(m) for m in (metadatas or [{}] * len(ids))],
    )


def _to_where(filters: dict[str, Any] | None) -> dict[str, Any] | None:
    """Build a Chroma `where` clause.

    Supports the `<field>In` convention the Node planRagService used for
    "field is one of these values".
    """
    if not filters:
        return None

    clauses: list[dict[str, Any]] = []
    for key, value in filters.items():
        if value is None:
            continue
        if key.endswith("In") and isinstance(value, (list, tuple, set)):
            field = key[:-2]
            clauses.append({field: {"$in": list(value)}})
        elif isinstance(value, (list, tuple, set)):
            clauses.append({key: {"$in": list(value)}})
        else:
            clauses.append({key: {"$eq": value}})

    if not clauses:
        return None
    if len(clauses) == 1:
        return clauses[0]
    return {"$and": clauses}


def query_relevant(
    collection_name: str,
    query_embedding: list[float],
    n_results: int = 3,
    filters: dict[str, Any] | None = None,
) -> dict[str, list]:
    """Nearest-neighbour search. Returns Node-compatible parallel lists."""
    empty = {"ids": [], "documents": [], "metadatas": [], "distances": []}
    try:
        coll = get_collection(collection_name)
        if coll.count() == 0:
            return empty
        res = coll.query(
            query_embeddings=[query_embedding],
            n_results=min(n_results, coll.count()),
            where=_to_where(filters),
            include=["documents", "metadatas", "distances"],
        )
    except Exception as exc:  # noqa: BLE001 - retrieval must never break generation
        log.warning("Chroma query on %s failed: %s", collection_name, exc)
        return empty

    return {
        "ids": (res.get("ids") or [[]])[0],
        "documents": (res.get("documents") or [[]])[0],
        "metadatas": (res.get("metadatas") or [[]])[0],
        "distances": (res.get("distances") or [[]])[0],
    }


def query_by_metadata(
    collection_name: str,
    filters: dict[str, Any],
    limit: int = 20,
) -> list[dict[str, Any]]:
    """Pure metadata lookup, no vector involved (used for BMC blocks)."""
    try:
        coll = get_collection(collection_name)
        res = coll.get(
            where=_to_where(filters),
            limit=limit,
            include=["documents", "metadatas"],
        )
    except Exception as exc:  # noqa: BLE001
        log.warning("Chroma metadata query on %s failed: %s", collection_name, exc)
        return []

    docs = res.get("documents") or []
    metas = res.get("metadatas") or []
    ids = res.get("ids") or []
    return [
        {"id": ids[i] if i < len(ids) else "", "text": docs[i], "metadata": metas[i] if i < len(metas) else {}}
        for i in range(len(docs))
    ]


def is_relevant(distance: float) -> bool:
    return distance < RELEVANCE_DISTANCE_CUTOFF


def stats() -> dict[str, int]:
    """Document counts per collection, for /api/health."""
    out: dict[str, int] = {}
    for name in ALL_COLLECTIONS:
        try:
            out[name] = get_collection(name).count()
        except Exception:  # noqa: BLE001
            out[name] = -1
    return out
