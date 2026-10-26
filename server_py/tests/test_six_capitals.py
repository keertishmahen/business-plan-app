"""Six Capitals: knowledge snapshot, profile normalisation, endpoint, and MIA reach.

No network: fake LLM and embedder, throwaway Chroma directory.
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

import chromadb
import pytest
from chromadb.config import Settings
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.agents.specialists import SPECIALISTS, build_agent_prompt, filter_rag_context  # noqa: E402
from app.config import KNOWLEDGE_DIR  # noqa: E402
from app.main import app  # noqa: E402
from app.services import chroma_store as store  # noqa: E402
from app.services import rag_service  # noqa: E402
from app.services import six_capitals as caps  # noqa: E402

S = "session_caps"
BMC = {
    "bmc": [
        {
            "value_proposition": "Refill stations",
            "canvas": {
                "keyPartners": ["Local council recycling depot"],
                "valuePropositions": ["Refills 40% cheaper, no single-use plastic"],
                "socialEnvironmentalBenefit": ["12 tonnes of plastic avoided per year"],
                "revenueStreams": ["Per-litre refill sales"],
            },
        }
    ]
}
LLM_PROFILE = {
    "capitals": [
        {"id": "natural", "emphasis": "primary", "score": 5, "rationale": "Avoids plastic",
         "evidence": ["social_environmental_benefit: 12 tonnes of plastic avoided"], "bmcBlocks": ["social_environmental_benefit"], "risk": "Claims unverified"},
        {"id": "Social & Relationship", "emphasis": "PRIMARY", "score": 9, "rationale": "Council partnership",
         "evidence": ["key_partners: council depot"], "bmcBlocks": ["key_partners"]},
        {"id": "financial", "emphasis": "bogus", "score": "3", "rationale": "Per-litre sales"},
    ],
    "spheres": {"viable": "Low cost refills", "equitable": "Cheaper for households", "bearable": "Less plastic"},
    "dominantSphere": "environmental",
    "summary": "A natural-capital-led refill business.",
}


def _fake_embedding(text):
    vec = [0.0] * 8
    for i, ch in enumerate(text.encode("utf-8")):
        vec[i % 8] += ch
    norm = sum(v * v for v in vec) ** 0.5 or 1.0
    return [v / norm for v in vec]


@pytest.fixture(autouse=True)
def isolated(tmp_path, monkeypatch):
    client = chromadb.PersistentClient(
        path=str(tmp_path / "chroma"), settings=Settings(anonymized_telemetry=False, allow_reset=True)
    )
    monkeypatch.setattr(store, "_client", client)

    async def fake_embed(text):
        return _fake_embedding(text)

    monkeypatch.setattr(rag_service, "generate_embedding", fake_embed)
    yield


def run(coro):
    return asyncio.run(coro)


# ── Knowledge ─────────────────────────────────────────────────────


class TestKnowledge:
    def test_json_covers_all_six_capitals_and_the_spheres(self):
        data = json.loads((KNOWLEDGE_DIR / "six_capitals.json").read_text(encoding="utf-8"))
        ids = {d["id"] for d in data["documents"]}
        for cid in ("financial", "manufactured", "human", "intellectual", "social_relationship", "natural"):
            assert f"capital_{cid}" in ids
        assert {"six_capitals_overview", "spheres_viable_equitable_bearable"} <= ids

    def test_snapshot_ships_embedded_six_capitals(self):
        snap = json.loads((KNOWLEDGE_DIR / "vectors_knowledge.json").read_text(encoding="utf-8"))
        docs = snap[store.Collections.SIX_CAPITALS]["documents"]
        assert len(docs) == 12
        assert all(len(d["embedding"]) == 3072 for d in docs)
        plan9 = [d for d in snap[store.Collections.BUSINESS_PLAN]["documents"] if d["id"] == "plan_section_sdg_alignment"]
        assert "Six Capitals" in plan9[0]["text"]

    def test_cold_start_seeds_the_collection(self):
        loaded = store.ensure_knowledge_seeded()
        assert loaded[store.Collections.SIX_CAPITALS] == 12
        assert store.stats()[store.Collections.SIX_CAPITALS] == 12

    def test_specialist_routing_includes_six_capitals(self):
        routing = rag_service.agent_routing()
        assert {"sdg", "financial", "critique"} <= set(routing[store.Collections.SIX_CAPITALS])
        assert store.Collections.SIX_CAPITALS in rag_service.KNOWLEDGE_COLLECTIONS


# ── Normalisation ─────────────────────────────────────────────────


class TestNormalize:
    def test_always_six_capitals_in_fixed_order(self):
        p = caps.normalize_profile(LLM_PROFILE)
        assert [c["id"] for c in p["capitals"]] == caps.CAPITAL_IDS

    def test_fixes_ids_emphasis_and_scores(self):
        p = {c["id"]: c for c in caps.normalize_profile(LLM_PROFILE)["capitals"]}
        assert p["social_relationship"]["emphasis"] == "primary"
        assert p["social_relationship"]["score"] == 5  # clamped from 9
        assert p["financial"]["emphasis"] == "limited"  # "bogus" → limited
        assert p["financial"]["score"] == 3
        assert p["human"]["rationale"] == "Not evidenced in the canvas."
        assert p["natural"]["sphere"] == "environmental"

    def test_primary_list_and_dominant_sphere(self):
        p = caps.normalize_profile(LLM_PROFILE)
        assert set(p["primary"]) == {"natural", "social_relationship"}
        assert p["dominantSphere"] == "environmental"

    def test_garbage_input_still_yields_six(self):
        p = caps.normalize_profile("not json")
        assert len(p["capitals"]) == 6 and p["dominantSphere"] in caps.SPHERES

    def test_profile_text_lists_primary_first(self):
        text = caps.profile_text(caps.normalize_profile(LLM_PROFILE))
        lines = text.splitlines()
        assert "PRIMARY" in lines[2]
        assert "Viable:" in text and "Bearable:" in text


# ── Analysis, storage and MIA reach ───────────────────────────────


@pytest.fixture
def fake_llm(monkeypatch):
    seen = {}

    async def fake_generate(prompt, **kwargs):
        seen["prompt"] = prompt
        seen["kwargs"] = kwargs
        return json.dumps(LLM_PROFILE)

    monkeypatch.setattr(caps, "generate_text", fake_generate)
    return seen


class TestAnalysis:
    def test_prompt_uses_knowledge_bmc_and_uploads(self, fake_llm):
        store.ensure_knowledge_seeded()
        run(rag_service.store_step_output(S, "bmc", json.dumps(BMC)))
        store.add_documents(
            store.Collections.USER_DOCS, ids=[f"{S}:doc:x:0"], documents=["Council grant of 18,000 GBP"],
            embeddings=[_fake_embedding("g")], metadatas=[{"sessionId": S, "source": "grant.txt", "docId": "x"}],
        )
        run(caps.analyze_six_capitals(S, story="Refill stations", bmc=BMC))
        prompt = fake_llm["prompt"]
        assert "Natural capital" in prompt  # knowledge
        assert "Local council recycling depot" in prompt  # stored BMC block
        assert "Council grant of 18,000 GBP" in prompt  # upload
        assert fake_llm["kwargs"]["json_mode"] is True

    def test_profile_is_stored_and_reaches_every_specialist(self, fake_llm):
        run(rag_service.store_step_output(S, "bmc", json.dumps(BMC)))
        profile = run(caps.analyze_six_capitals(S, story="x", bmc=BMC))
        assert profile["stored"] is True

        ctx = run(rag_service.retrieve_plan_context(session_id=S, prompt="plan"))
        steps = {p["step"]: p for p in ctx["priorSteps"]}
        assert "six_capitals" in steps
        text = rag_service.format_plan_rag_context(ctx)
        assert "=== SIX CAPITALS PROFILE" in text and "Natural capital" in text

        for agent_id, spec in SPECIALISTS.items():
            prompt = build_agent_prompt(
                role=agent_id, task="t", rag_context=filter_rag_context(ctx, spec.collections),
                user_story="", step_id="plan",
            )
            assert "Six Capitals profile" in prompt, agent_id

    def test_curating_the_profile_out_removes_it(self, fake_llm):
        run(rag_service.store_step_output(S, "bmc", json.dumps(BMC)))
        run(caps.analyze_six_capitals(S, story="x", bmc=BMC))
        ctx = run(rag_service.retrieve_plan_context(session_id=S, prompt="plan"))
        kept = [p for p in ctx["priorSteps"] if p["step"] != "six_capitals"] + ctx["bmcBlocks"]
        curated = run(rag_service.retrieve_context("plan", "plan", S, {"curatedContext": kept}))
        assert "SIX CAPITALS PROFILE" not in curated["planRagText"]

    def test_falls_back_to_request_bmc_when_nothing_stored(self, fake_llm):
        run(caps.analyze_six_capitals("fresh_session", story="x", bmc=BMC))
        assert "Local council recycling depot" in fake_llm["prompt"]


class TestEndpoint:
    def test_capitals_endpoint(self, fake_llm):
        res = TestClient(app).post("/api/rag/capitals", json={"sessionId": S, "story": "x", "bmc": BMC})
        assert res.status_code == 200, res.text
        body = res.json()
        assert len(body["capitals"]) == 6 and body["primary"]

    def test_capitals_endpoint_validation(self):
        client = TestClient(app)
        assert client.post("/api/rag/capitals", json={"bmc": BMC}).status_code == 400
        assert client.post("/api/rag/capitals", json={"sessionId": S}).status_code == 400

    def test_llm_failure_is_502(self, monkeypatch):
        async def boom(prompt, **kwargs):
            raise RuntimeError("HTTP 402")

        monkeypatch.setattr(caps, "generate_text", boom)
        res = TestClient(app).post("/api/rag/capitals", json={"sessionId": S, "bmc": BMC})
        assert res.status_code == 502
