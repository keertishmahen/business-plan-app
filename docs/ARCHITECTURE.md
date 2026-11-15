# Architecture

How the code is layered, and the dependency rules that the harness tests enforce.
For the product view see [product-specs/workflow.md](product-specs/workflow.md).

## System

```
Browser — React 18 SPA (GitHub Pages)            Backend — FastAPI (Docker on Render)
  components/  screens and steps                   routers/   HTTP + SSE endpoints
  hooks/       state, routing, persistence  ─────►  agents/    MIA orchestrator, specialists, QA
  services/    ALL network I/O              HTTPS   services/  Gemini client, RAG, ingest, Chroma
  constants/   prompts, steps, branding              config.py  the only place env vars are read
  utils/       pure helpers                                │
                                                           ├─► Gemini API (gemini-2.5-flash, gemini-embedding-001)
                                                           └─► ChromaDB (knowledge snapshot + per-session data)
```

The browser never calls Gemini in production and never holds the API key. Working
state lives in `localStorage`; the server keeps session-scoped text and embeddings only.

## Frontend layers (`src/`)

Dependencies point downwards only:

| Layer | May import | Notes |
|---|---|---|
| `components/` | hooks, services, constants, utils | UI only; no `fetch` |
| `hooks/` | services, constants, utils | state and side effects |
| `services/` | constants, utils | the **only** place that does network I/O (`geminiClient.js`) |
| `constants/`, `utils/` | each other, `lucide-react` | framework-free; never import components or hooks |

Enforced by [`src/__harness__/architecture.test.js`](../src/__harness__/architecture.test.js):

- no `fetch`, `XMLHttpRequest` or `EventSource` outside `src/services/`;
- `constants/` and `utils/` do not import `components/` or `hooks/`;
- `REACT_APP_RAG_URL` is read only in `src/services/`.

Icons follow [design-docs/brand-and-icons.md](design-docs/brand-and-icons.md), enforced by
[`src/__harness__/icons.test.js`](../src/__harness__/icons.test.js).

## Backend layers (`server_py/app/`)

| Layer | May import | Notes |
|---|---|---|
| `routers/` | agents, services, config | request validation, SSE framing |
| `agents/` | services, config | orchestrator, specialists, quality agents |
| `services/` | config | Gemini, RAG, ingest, Chroma, Six Capitals |
| `config.py` | — | reads environment variables, nothing else does |

Enforced by [`server_py/tests/test_architecture.py`](../server_py/tests/test_architecture.py):

- only `services/gemini_client.py` imports an HTTP client;
- `services/` and `agents/` never import `routers/`;
- `os.getenv` / `os.environ` appear only in `config.py`;
- no API key in a URL query string (the key travels in the `x-goog-api-key` header).

## Key data paths

- **Generation:** step prompt (`src/constants/prompts.js`) → `services/geminiClient.js` →
  `POST /api/generate/stream` → `agents/orchestrator.py` (retrieval → 4 specialists in parallel →
  synthesis → fact-check / consistency / critic, ≤ 2 rewrites) → SSE progress → final response.
- **RAG:** uploads → `services/document_ingest.py` (extract, 1,000-char chunks, 150 overlap) →
  `gemini-embedding-001` (3,072-d) → Chroma `user_documents` (by `sessionId`) → hybrid retrieval in
  `services/rag_service.py` → user curation in the RAG Evidence step → plan grounding.
- **Health:** `GET /api/health` reports collection counts and `geminiKeyValid` (checked once at start-up).
