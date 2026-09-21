# RAG Backend — Business Plan Co-Pilot

Retrieval-Augmented Generation server that enriches AI prompts with grounded business knowledge.

## Quick Start

```bash
cd server
npm install
npm start
```

The server starts on `http://localhost:3002` and auto-seeds the knowledge base on startup (~30s for first boot due to embedding generation).

## Architecture

```
Request flow:
  Frontend → POST /api/generate → RAG Service → Gemini API → Response
                                      ↓
                              Vector Store (query)
                                      ↓
                          Knowledge Base + User Context
```

### How It Works

1. Frontend sends a prompt with step/session context
2. RAG service generates an embedding for the query
3. Retrieves relevant documents from the knowledge base (business frameworks, SDGs, industry patterns)
4. Also retrieves user's previous answers for cross-step consistency
5. Augments the original prompt with retrieved context
6. Calls Gemini with the enriched prompt
7. Returns the grounded response with source attribution

## API Endpoints

### POST /api/generate
Main generation endpoint (replaces direct Gemini calls).

```json
{
  "prompt": "Your prompt here",
  "stepId": "bmc",
  "sessionId": "user-session-id",
  "userStory": "Optional user story text",
  "options": { "temperature": 0.7 }
}
```

Response:
```json
{
  "response": "AI-generated text grounded in knowledge base",
  "sources": ["business_frameworks:bmc_overview", "..."],
  "contextUsed": { "knowledgeDocs": 6, "userHistoryDocs": 1 }
}
```

### POST /api/context/store
Store user answers for cross-step retrieval.

```json
{
  "sessionId": "user-session-id",
  "stepId": "story",
  "content": "User's answer or output text"
}
```

### GET /api/health
Health check with knowledge base status.

## Knowledge Base

- **business_frameworks** — BMC 9 blocks, SWOT, Porter's Five Forces, Value Proposition Canvas, Lean Canvas, business model patterns, Dilemma Triangle
- **sdg_knowledge** — All 17 UN SDGs with targets, indicators, and business applications
- **industry_patterns** — Market sizing (TAM/SAM/SOM), competitive analysis, revenue models, customer archetypes, channel strategies, financial planning
- **user_context** — Per-session user answers (populated at runtime)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key |
| `PORT` | Server port (default: 3002) |

## Design Decisions

- **In-memory vector store**: No external database needed for local dev. Data re-embeds on startup.
- **Graceful degradation**: Frontend falls back to direct Gemini if RAG server is down.
- **Cosine similarity search**: Custom implementation for zero-dependency vector search.
- **Embedding model**: `gemini-embedding-001` (768 dimensions, available on free tier).
