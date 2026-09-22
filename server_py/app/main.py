"""FastAPI entry point for the Symetra RAG + MIA backend.

Replaces the Node/Express server in server/. Route paths and payload shapes are
unchanged so the React client only needs a new base URL.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ORIGIN
from .routers import context, generate, health

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(name)s — %(message)s",
)

app = FastAPI(
    title="Symetra RAG + MIA API",
    description="SDG-aligned business model co-pilot: retrieval, agents and generation.",
    version="2.0.0",
)

# CORS_ORIGIN may be a comma-separated list of deployed frontends.
_origins = [o.strip() for o in CORS_ORIGIN.split(",") if o.strip()] or ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials="*" not in _origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/health", tags=["health"])
app.include_router(generate.router, prefix="/api/generate", tags=["generate"])
app.include_router(context.router, prefix="/api/context", tags=["context"])


@app.get("/")
async def root():
    return {
        "service": "Symetra RAG + MIA API",
        "endpoints": [
            "GET  /api/health",
            "POST /api/generate",
            "POST /api/generate/stream",
            "POST /api/context/store",
        ],
    }
