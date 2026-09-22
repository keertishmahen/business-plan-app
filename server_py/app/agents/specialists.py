"""The four MIA specialist agents: market, financial, SDG, critique.

Ported from server/agents/{market,financial,sdg,critique}Agent.js. Those four
modules differed only in system prompt, task framing and which knowledge
collections they draw on, so they are expressed here as one declarative table
rather than four near-identical files.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from ..services import chroma_store as store
from ..services.gemini_client import generate_text, parse_json_response
from .base import create_fallback_result, normalize_agent_output

log = logging.getLogger(__name__)

STANDARD_OUTPUT_SCHEMA = """{
  "insights": ["plain text strings only — one insight per array item"],
  "confidence": 0.0 to 1.0,
  "sources": ["plain text source references"],
  "warnings": ["plain text warning strings only — NEVER use nested objects"]
}

CRITICAL: insights, sources, and warnings MUST be arrays of plain strings only. Do NOT use nested JSON objects inside these arrays."""

_JSON_RULE = (
    "IMPORTANT: Output ONLY valid JSON with no markdown formatting, no code fences.\n"
    "All items in insights, sources, and warnings arrays MUST be plain text strings "
    "— never nested objects."
)


@dataclass(frozen=True)
class Specialist:
    agent_id: str
    role: str
    system_prompt: str
    task: str
    collections: list[str] = field(default_factory=list)


SPECIALISTS: dict[str, Specialist] = {
    "market": Specialist(
        agent_id="market",
        role="Market Research Agent — sizing, segments, competitors",
        collections=[store.Collections.INDUSTRY, store.Collections.FRAMEWORKS],
        system_prompt=(
            "You are a Market Research specialist agent in a Multi-Intelligence Agent (MIA) system.\n"
            "Your expertise covers TAM/SAM/SOM market sizing, customer segments, competitive "
            "landscape, and go-to-market channels.\n\n"
            "Analyze the business context and provide specific, actionable market insights. Use "
            "concrete numbers where reasonable.\nBe realistic — avoid inflated market claims. "
            "Reference the grounding knowledge provided.\n\n" + _JSON_RULE
        ),
        task=(
            "Analyze market opportunity for this business plan step.\n"
            "Focus on: market sizing (TAM/SAM/SOM estimates), target customer segments, key "
            "competitors, and distribution channels."
        ),
    ),
    "financial": Specialist(
        agent_id="financial",
        role="Financial Modeling Agent — unit economics and runway",
        collections=[store.Collections.INDUSTRY],
        system_prompt=(
            "You are a Financial Modeling specialist agent in a Multi-Intelligence Agent (MIA) system.\n"
            "Your expertise covers unit economics, revenue models, cost structures, burn rate, and "
            "runway projections.\n\n"
            "Analyze the business context and provide specific financial insights. Use realistic "
            "assumptions.\nFlag unrealistic projections or missing financial data.\n\n" + _JSON_RULE
        ),
        task=(
            "Analyze financial viability for this business plan step.\n"
            "Focus on: unit economics (CAC, LTV, margins), revenue model, cost structure, and "
            "runway estimates."
        ),
    ),
    "sdg": Specialist(
        agent_id="sdg",
        role="SDG Alignment Agent — mapping to UN Sustainable Development Goals",
        collections=[store.Collections.SDGS, store.Collections.FRAMEWORKS],
        system_prompt=(
            "You are an SDG Alignment specialist agent in a Multi-Intelligence Agent (MIA) system.\n"
            "Your expertise covers UN Sustainable Development Goals mapping, impact measurement, "
            "and anti-greenwashing analysis.\n\n"
            "Map business activities to specific SDG numbers (1-17) with correct names.\n"
            "Flag greenwashing risks where claimed impact doesn't match actual business activities.\n"
            "Recommend measurable impact metrics tied to specific SDGs.\n\n" + _JSON_RULE + "\n"
            'Example insight: "SDG 7 (Affordable Energy): Solar packaging reduces grid reliance by 30%"\n'
            'Example warning: "Greenwashing risk: sustainability claims lack measurable impact data"'
        ),
        task=(
            "Analyze SDG alignment and sustainability impact for this business plan step.\n"
            "Focus on: specific SDG mappings (number + name), impact metrics, anti-greenwashing "
            "flags, and local relevance."
        ),
    ),
    "critique": Specialist(
        agent_id="critique",
        role="Critique & Diagnosis Agent — tensions and dilemmas",
        collections=[],  # sees the unfiltered context
        system_prompt=(
            "You are a Critique & Diagnosis specialist agent in a Multi-Intelligence Agent (MIA) system.\n"
            "Your expertise covers ethical dilemmas, stakeholder tensions, People/Planet/Prosperity "
            "trade-offs, and strategic conflicts.\n\n"
            "Identify tensions between competing priorities, hidden stakeholder impacts, and "
            "unresolved dilemmas.\nBe constructively critical — surface real conflicts that the "
            "business plan must address.\n\n" + _JSON_RULE
        ),
        task=(
            "Analyze dilemmas, tensions, and stakeholder conflicts for this business plan step.\n"
            "Focus on: People/Planet/Prosperity trade-offs, ethical dilemmas, stakeholder "
            "conflicts, and unresolved tensions."
        ),
    ),
}


def filter_rag_context(rag_context: dict[str, Any], collections: list[str]) -> dict[str, Any]:
    """Narrow grounding knowledge to the collections this specialist cares about.

    Mirrors baseAgent.filterRagContext: if filtering leaves nothing, fall back to
    the full set rather than sending the agent in blind.
    """
    knowledge = (rag_context or {}).get("knowledge") or []
    history = (rag_context or {}).get("userHistory") or []

    if not knowledge or not collections:
        return {"knowledge": knowledge, "userHistory": history}

    narrowed = [
        k
        for k in knowledge
        if any(k.get("source") == c or c in str(k.get("source", "")) for c in collections)
    ]
    return {"knowledge": narrowed or knowledge, "userHistory": history}


def build_agent_prompt(
    *,
    role: str,
    task: str,
    rag_context: dict[str, Any],
    user_story: str,
    step_id: str,
    output_schema: str = STANDARD_OUTPUT_SCHEMA,
) -> str:
    """Assemble the user-content block. Section order matches baseAgent.js:77."""
    sections: list[str] = []

    knowledge = (rag_context or {}).get("knowledge") or []
    if knowledge:
        body = "\n".join(f"• [{k.get('source', '')}] {k.get('text', '')}" for k in knowledge)
        sections.append(f"=== GROUNDING KNOWLEDGE ===\n{body}")

    history = (rag_context or {}).get("userHistory") or []
    if history:
        body = "\n".join(f"• [Step: {h.get('step', 'unknown')}] {h.get('text', '')}" for h in history)
        sections.append(f"=== PREVIOUS STEP OUTPUTS ===\n{body}")

    if user_story:
        sections.append(f"=== USER'S BUSINESS STORY ===\n{user_story}")

    sections.append(f"=== WORKFLOW STEP ===\n{step_id}")
    sections.append(f"=== YOUR ROLE ===\n{role}")
    sections.append(f"=== TASK ===\n{task}")
    sections.append(f"=== REQUIRED OUTPUT FORMAT ===\n{output_schema}")

    return "\n\n".join(sections)


async def analyze(
    agent_id: str,
    *,
    prompt: str,
    rag_context: dict[str, Any],
    user_story: str,
    step_id: str,
) -> dict[str, Any]:
    """Run one specialist. Never raises — returns a fallback result on failure."""
    spec = SPECIALISTS.get(agent_id)
    if spec is None:
        return create_fallback_result(agent_id, "Unknown agent")

    filtered = filter_rag_context(rag_context, spec.collections)
    user_content = build_agent_prompt(
        role=spec.role,
        task=f"{spec.task}\nOriginal task prompt: {prompt}",
        rag_context=filtered,
        user_story=user_story,
        step_id=step_id,
    )

    try:
        raw = await generate_text(
            user_content,
            system_prompt=spec.system_prompt,
            temperature=0.4,
            max_output_tokens=2048,
        )
        parsed = parse_json_response(raw)
        if parsed is None:
            # Not JSON, but the prose is still useful — normalize_agent_output
            # promotes "summary" into insights when no array was returned.
            return normalize_agent_output({"summary": raw, "confidence": 0.3}, agent_id)
        return normalize_agent_output(parsed, agent_id)
    except Exception as exc:  # noqa: BLE001 - a specialist must never sink the step
        log.error("[%sAgent] %s", agent_id, exc)
        return create_fallback_result(agent_id, str(exc))
