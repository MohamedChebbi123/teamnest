# RAG / AI Assistant Flow

## Files
- `backend/routers/assistant_router.py` (19 lines)
- `backend/services/assistant_service.py` (135 lines)
- `backend/utils/assistant_handler.py` (170 lines)
- `backend/utils/vector_db_handler.py` (62 lines)
- `backend/utils/messages_handler.py` (124 lines)
- `backend/utils/document_handler.py` (145 lines)
- `backend/models/Organization_members.py`, `Team_association.py`, `Users.py`
- `backend/schemas/Assistant_input.py`

## Pinecone Indices

| Index Name | Namespace Pattern | Contains | Handler |
|------------|------------------|----------|---------|
| `fyp` | `team-{team_id}` | Task vectors | `vector_db_handler.py` |
| `fyp-messages` | `team-{team_id}` + `org-{org_id}` | Message vectors | `messages_handler.py` |
| `fyp-documents` | `team-{team_id}` | Document chunk vectors | `document_handler.py` |

## Endpoint

### POST /organization/{org_id}/assistant
**Service:** `ask_assistant_service(data.query, data.team_id, org_id, user, db, data.document_id)`

## RAG Pipeline

```
User Query
    │
    ├─ Permission: must be org member AND team member
    │
    ├─ If document_id IS provided:
    │   └─ search_documents(query, team_id, top_k=8, document_id=str(document_id))
    │       └─ Pinecone fyp-documents → team-{team_id} namespace
    │           └─ Filtered by document_id ($eq)
    │
    ├─ If NO document_id (general query):
    │   ├─ vector_db_handler.search(query, namespace=team-{team_id}, top_k=5)
    │   │   └─ Pinecone fyp → tasks
    │   ├─ document_handler.search_documents(query, team_id, top_k=5)
    │   │   └─ Pinecone fyp-documents → document chunks
    │   └─ messages_handler.search_messages(query, team_id, top_k=5)
    │       └─ Pinecone fyp-messages → team-{team_id} namespace
    │
    ├─ Score filtering:
    │   ├─ Filter by SCORE_THRESHOLD = 0.15
    │   └─ Normalize scores 0-1 across all hit types
    │
    ├─ Merge & rank: take top MAX_CONTEXT_HITS = 10
    │
    ├─ Format context via assistant_handler.format_context(context)
    │   └─ Each hit → source header:
    │       • [message #42 in #general by Jane Doe on Apr 20, 2026 at 03:45 PM]
    │       • [task #7 "Implement login" in team 3]
    │       • [document #5 "rag_guide.pdf"]
    │
    └─ LLM Call: assistant_handler.ask_assistant(query, context)
        ├─ Model: llama-3.3-70b-versatile (Groq)
        ├─ Temperature: 0.3
        ├─ Max tokens: 1024
        ├─ System prompt: TeamNest AI persona, source citation rules
        └─ Returns: {answer: str, sources: [{type, chunk_text, ...}]}
```

## Document Embedding Pipeline

When a file is uploaded to a channel:
1. `send_file_realtime_service()` calls `embed_document(file_url, file_name, document_id, user_id, team_id)`
2. `load_document()` downloads file, loads via LlamaIndex `SimpleDirectoryReader`
3. If PDF: also extracts tables via Camelot (`lattice` → `stream` fallback), appends as extra Documents
4. `chunk_documents()` splits into 500-char chunks with 50-char overlap via `SentenceSplitter`
5. Each chunk is upserted to Pinecone `fyp-documents` → `team-{team_id}` namespace with metadata: `document_id`, `user_id`, `source`, `file_name`

## Helper Functions (assistant_service.py)

| Function | Purpose |
|----------|---------|
| `_extract_hits(results)` | Extracts hits from Pinecone response (handles different formats) |
| `_hit_to_dict(hit)` | Converts hit to dict (handles object or dict) |
| `_hit_score(hit)` | Extracts score from hit |
| `_normalize_hits(hits)` | Min-max normalization to 0-1 |
| `MAX_CONTEXT_HITS` | 10 |
| `SCORE_THRESHOLD` | 0.15 |
| `NORMALIZED_THRESHOLD` | 0.0 |

## Helper Functions (assistant_handler.py)

| Function | Purpose |
|---------|---------|
| `_display_id(value)` | Formats ID for display (int if float) |
| `_display_date(value)` | Formats timestamp to human-readable |
| `format_context(context)` | Builds source-prefixed context string |
| `ask_assistant(query, context)` | Calls Groq API with system prompt |
