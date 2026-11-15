"""Start-up Gemini key check and its /api/health field.

A revoked key used to leave /api/health reporting "healthy" while every AI call
failed. No network: Gemini is replaced by an httpx MockTransport.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app  # noqa: E402
from app.services import chroma_store as store  # noqa: E402
from app.services import gemini_client  # noqa: E402

_RealAsyncClient = httpx.AsyncClient


def _mock_gemini(monkeypatch, handler):
    """Route gemini_client's HTTP calls to `handler` and record each request."""
    seen = []

    def recording(request):
        seen.append(request)
        return handler(request)

    def factory(*args, **kwargs):
        kwargs["transport"] = httpx.MockTransport(recording)
        return _RealAsyncClient(*args, **kwargs)

    monkeypatch.setattr(gemini_client.httpx, "AsyncClient", factory)
    return seen


@pytest.fixture(autouse=True)
def configured_key(monkeypatch):
    monkeypatch.setattr(gemini_client, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(gemini_client, "key_valid", None)


def test_valid_key_sent_as_header_not_url(monkeypatch):
    seen = _mock_gemini(monkeypatch, lambda req: httpx.Response(200, json={"name": "models/x"}))
    assert asyncio.run(gemini_client.check_key()) is True
    assert seen[0].headers["x-goog-api-key"] == "test-key"
    assert "key=" not in str(seen[0].url)


@pytest.mark.parametrize("status", [400, 401, 403])
def test_rejected_key_is_invalid(monkeypatch, status):
    _mock_gemini(monkeypatch, lambda req: httpx.Response(status, json={"error": {"message": "API key not valid"}}))
    assert asyncio.run(gemini_client.check_key()) is False
    assert gemini_client.key_valid is False


def test_unexpected_status_is_unknown(monkeypatch):
    _mock_gemini(monkeypatch, lambda req: httpx.Response(503))
    assert asyncio.run(gemini_client.check_key()) is None


def test_network_error_is_unknown(monkeypatch):
    def boom(request):
        raise httpx.ConnectError("offline", request=request)

    _mock_gemini(monkeypatch, boom)
    assert asyncio.run(gemini_client.check_key()) is None


def test_missing_key_makes_no_request(monkeypatch):
    monkeypatch.setattr(gemini_client, "GEMINI_API_KEY", "")
    seen = _mock_gemini(monkeypatch, lambda req: httpx.Response(200))
    assert asyncio.run(gemini_client.check_key()) is None
    assert seen == []


@pytest.mark.parametrize("value", [True, False, None])
def test_health_reports_key_validity(monkeypatch, value):
    monkeypatch.setattr(store, "stats", lambda: {"business_frameworks": 1})
    monkeypatch.setattr(gemini_client, "key_valid", value)
    res = TestClient(app).get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "healthy"
    assert body["geminiKeyValid"] is value
    assert "test-key" not in res.text
