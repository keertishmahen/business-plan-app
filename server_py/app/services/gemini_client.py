"""Gemini chat + embedding calls.

Ported from server/agents/baseAgent.js and server/services/embeddingService.js.
Model IDs are unchanged so the existing persisted vectors remain valid.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from typing import Any

import httpx

from ..config import (
    CHAT_MODEL,
    EMBEDDING_MODEL,
    GEMINI_API_KEY,
    GEMINI_BASE_URL,
)

log = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(connect=10.0, read=120.0, write=30.0, pool=10.0)


class GeminiError(RuntimeError):
    """Raised when the Gemini API returns an error or unusable payload."""


def _require_key() -> str:
    if not GEMINI_API_KEY:
        raise GeminiError("GEMINI_API_KEY not set in environment")
    return GEMINI_API_KEY


async def generate_text(
    prompt: str,
    *,
    system_prompt: str | None = None,
    temperature: float = 0.7,
    max_output_tokens: int = 4096,
) -> str:
    """Single-turn generation. Returns the model's text."""
    key = _require_key()
    url = f"{GEMINI_BASE_URL}/{CHAT_MODEL}:generateContent?key={key}"

    body: dict[str, Any] = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_output_tokens,
        },
    }
    if system_prompt:
        body["systemInstruction"] = {"parts": [{"text": system_prompt}]}

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        res = await client.post(url, json=body)

    if res.status_code != 200:
        detail = ""
        try:
            detail = res.json().get("error", {}).get("message", "")
        except Exception:  # noqa: BLE001 - body may not be JSON
            detail = res.text[:300]
        raise GeminiError(f"Gemini API error (HTTP {res.status_code}): {detail}")

    data = res.json()
    candidates = data.get("candidates") or []
    if not candidates:
        raise GeminiError("Gemini returned no candidates")

    parts = candidates[0].get("content", {}).get("parts") or []
    text = "".join(p.get("text", "") for p in parts).strip()
    if not text:
        # A blocked or truncated response still has a finishReason worth surfacing.
        reason = candidates[0].get("finishReason", "unknown")
        raise GeminiError(f"Gemini returned empty text (finishReason={reason})")
    return text


_FENCE_RE = re.compile(r"^\s*```(?:json)?\s*|\s*```\s*$", re.IGNORECASE)


def parse_json_response(text: str) -> Any | None:
    """Best-effort JSON extraction from a model response.

    Mirrors the frontend's parseGeminiJSON: models often wrap JSON in fences or
    add a sentence before it.
    """
    if not text:
        return None

    cleaned = _FENCE_RE.sub("", text.strip())
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Fall back to the outermost {...} or [...] block.
    for opener, closer in (("{", "}"), ("[", "]")):
        start = cleaned.find(opener)
        end = cleaned.rfind(closer)
        if start != -1 and end > start:
            try:
                return json.loads(cleaned[start : end + 1])
            except json.JSONDecodeError:
                continue
    return None


async def generate_embedding(text: str) -> list[float]:
    """Embed a single string."""
    key = _require_key()
    url = f"{GEMINI_BASE_URL}/{EMBEDDING_MODEL}:embedContent?key={key}"
    body = {
        "model": f"models/{EMBEDDING_MODEL}",
        "content": {"parts": [{"text": text}]},
    }

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        res = await client.post(url, json=body)

    if res.status_code != 200:
        detail = ""
        try:
            detail = res.json().get("error", {}).get("message", "")
        except Exception:  # noqa: BLE001
            detail = res.text[:300]
        raise GeminiError(f"Embedding API error (HTTP {res.status_code}): {detail}")

    return res.json()["embedding"]["values"]


async def generate_embeddings(texts: list[str], *, delay: float = 0.1) -> list[list[float]]:
    """Embed several strings sequentially, pacing to respect rate limits."""
    out: list[list[float]] = []
    for text in texts:
        out.append(await generate_embedding(text))
        if delay:
            await asyncio.sleep(delay)
    return out
