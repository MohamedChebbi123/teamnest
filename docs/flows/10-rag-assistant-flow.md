# RAG Assistant Flow

## Router Endpoint

`backend/routers/assistant_router.py:9` defines `router = APIRouter()`. `POST /organization/{org_id}/assistant` at line 12 accepts `org_id` and an `Assistant_input` body (containing `query`, `team_id`, and optional `document_id`), requires authentication, and calls `ask_assistant_service(data.query, data.team_id, org_id, user, db, data.document_id)` (lines 12-19).

## Service: `assistant_service.py`

### Helper Functions

`_extract_hits(results)` at `backend/services/assistant_service.py:12` checks if the result has a `result.hits` attribute and returns it as a list (lines 13-14); otherwise checks for a `matches` attribute (lines 15-16); otherwise returns an empty list (line 17).

`_hit_to_dict(hit)` at line 20 handles both dict and object hits, merging `metadata` and `fields` together (lines 21-27).

`_hit_score(hit)` at line 30 extracts the `_score` or `score` attribute from dict or object hits, defaulting to `0.0` (lines 31-33).

### Constants

`MAX_CONTEXT_HITS = 10` (line 36), `SCORE_THRESHOLD = 0.15` (line 37), `NORMALIZED_THRESHOLD = 0.0` (line 38).

### `_normalize_hits`

`_normalize_hits(hits)` at line 41 returns an empty list if no hits (lines 43-44). It computes `scores = [_hit_score(h) for h in hits]`, finds `mx = max(scores)`, `mn = min(scores)`, and `spread = mx - mn` (lines 46-49). For each hit, if `spread > 0` it applies min-max normalization `(raw - mn) / spread`; otherwise if `mx > 0` it assigns `1.0` else `0.0` (lines 51-57). Returns a list of `(hit, normalized_score, raw_score)` tuples (line 58).

### `ask_assistant_service`

`ask_assistant_service(query, team_id, org_id, user, db, document_id=None)` at line 61 gets `user_id` (line 62). It checks org membership via `Organization_members` — if not found, raises `HTTPException(403, detail="User is not a member of this organization")` (lines 64-70). It checks team membership via `Team_association` — if not found, raises `HTTPException(403, detail="User is not a member of this team")` (lines 72-78). An empty query raises `HTTPException(400, detail="Query cannot be empty")` (lines 80-81).

When `document_id is not None` (lines 83-87), it performs a single-index search via `search_documents(query=query.strip(), team_id=team_id, top_k=8, document_id=str(document_id))`, extracts hits, sorts descending by score, and takes the top `MAX_CONTEXT_HITS`.

Otherwise (lines 88-104), it performs a three-index search: `search` on the `fyp` index for tasks at `namespace=f"team-{team_id}"` with `top_k=5` (line 89), `search_documents` on `fyp-documents` at `team_id=team_id` with `top_k=5` (line 90), and `search_messages` on `fyp-messages` at `team_id=team_id` with `top_k=5` (line 91). Each set of hits is filtered by `_hit_score(h) >= SCORE_THRESHOLD` (lines 93-95). The three lists are independently normalized via `_normalize_hits`, merged, sorted by normalized score descending, and truncated to `MAX_CONTEXT_HITS` (lines 97-104).

A context list of `{"metadata": _hit_to_dict(hit)}` dicts is built (line 106). The assistant is called via `ask_assistant(query=query.strip(), context=context)` (line 108). Sources are built by iterating all hits: each source gets `type` and `chunk_text`; tasks additionally get `task_id` and `team_id`; documents get `document_id`; messages get `message_id`, `channel_id`, `channel_name`, `sender_first_name`, `sender_last_name`, and `sent_at` (lines 110-130). Returns `{"answer": answer, "sources": sources}` (lines 132-135).

## Utils: `assistant_handler.py`

### Groq Client

`backend/utils/assistant_handler.py:12` reads `GROQ_KEY` from the environment. A `Groq` client is instantiated on line 13. `logger = logging.getLogger(__name__)` at line 10.

### System Prompt

`SYSTEM_PROMPT` at line 16 (spanning lines 16-57) instructs the model: "You are TeamNest AI, an assistant for a team collaboration platform." Items are prefixed with source headers like `[message #42 in #general by Jane Doe on Apr 20, 2026 at 03:45 PM]`, `[task #7 in team 3]`, or `[document #12]`. The prompt rules mandate using ONLY provided information, listing every item present, never inventing task names, matching document names case-insensitively for summarization, being concise, never saying "according to the context", citing every factual claim in parentheses with who/said it/where/when, and never denying knowledge present in the provided information.

### Display Helpers

`_display_id(value)` at line 60 returns `"?"` for None or empty (lines 61-62), strips `.0` from float integers (lines 63-64), otherwise returns `str(value)` (line 65).

`_display_date(value)` at line 68 returns `"unknown date"` if falsy (lines 69-70). For numeric values it attempts `datetime.fromtimestamp(value).strftime("%b %d, %Y at %I:%M %p")` (lines 71-75). For strings it attempts `datetime.fromisoformat(value)` formatting (lines 76-80). Falls back to `str(value)` (line 81).

### `format_context`

`format_context(context)` at line 84 iterates each item (line 87), extracts `metadata`, `chunk_text`, and `doc_type` (lines 88-91). Empty chunks are skipped (lines 93-94). For `"message"` type (lines 96-103), it builds `sender`, `channel` (falling back to `#channel {_display_id(channel_id)}`), `sent_at`, and `message_id`, producing a header like `[message #{message_id} in #{channel} by {sender} on {sent_at}]`. For `"task"` type (lines 105-112), it builds `[task #{task_id} "{title}" in team {team_id}]` or without title. For `"document"` type (lines 114-120), it builds `[document #{document_id} "{file_name}"]` or without filename. Unknown types get `[{doc_type}]` (lines 122-123). Each entry is formatted as `- {header} {chunk}` and joined with newlines (lines 125-127).

### `ask_assistant`

`ask_assistant(query, context)` at line 130 calls `format_context(context)` to get `context_text` (line 131). If context is non-empty, the user message becomes `"Use the following information to answer:\n\n{context_text}\n\nQuestion:\n{query}\n"` (lines 133-141); otherwise just the raw query (lines 142-143). Messages are sent as system + user to `client.chat.completions.create` with model `"llama-3.3-70b-versatile"`, `temperature=0.3`, and `max_completion_tokens=1024` (lines 156-162). On `GroqError`, logs and raises `HTTPException(502, detail="Assistant unavailable")` (lines 163-165). On any other exception, logs and raises the same 502 error (lines 166-168). Returns `completion.choices[0].message.content` (line 170).

## Utils: `document_handler.py`

### Pinecone Setup

`backend/utils/document_handler.py:15` initializes Pinecone with `PINECONE_API_KEY`. The document index name is `"fyp-documents"` (line 17), with a lazy `_get_doc_index()` (line 21) that creates the index identically to `vector_db_handler` — `cloud="aws"`, `region="us-east-1"`, embedding model `"llama-text-embed-v2"` with `field_map: {"text": "chunk_text"}` (lines 24-33).

### `extract_tables_from_pdf`

`extract_tables_from_pdf(file_path)` at line 38 attempts `camelot.read_pdf(file_path, pages="all", flavor="lattice")` (line 41). If no tables are found (`not tables or tables.n == 0`), it falls back to `flavor="stream"` (lines 42-43). Each table is converted to a string via `df.to_string(index=False)` with a `"Table {i + 1}:\n"` header (lines 45-49). On any exception, it logs and returns an empty list (lines 52-54).

### `load_document`

`load_document(file_url, file_name)` at line 57 downloads the file into a temporary directory via `httpx.get` with `follow_redirects=True` (line 59). After writing the content to disk (lines 67-68), it calls `SimpleDirectoryReader(tmp_dir).load_data()` to parse it as text (line 70). For PDFs, it additionally extracts tables and appends each as a `Document` object (lines 72-75). Returns the document list (line 77).

### `chunk_documents`

`chunk_documents(documents, document_id, user_id)` at line 80 uses `SentenceSplitter(chunk_size=500, chunk_overlap=50)` (lines 81-84). Each node gets metadata with `document_id`, `user_id`, and `source: "upload"` (lines 88-93).

### `embed_document`

`embed_document(file_url, file_name, document_id, user_id, team_id)` at line 98 calls `load_document` then `chunk_documents` (lines 99-100). For each chunk, it builds `chunk_text = f"Document: {file_name} (part {i + 1} of {total}).\n{body}"` (lines 106-108), and upserts a record with `_id = f"doc-{document_id}-chunk-{i}"`, `chunk_text`, `type: "document"`, `document_id`, `user_id`, `source`, and `file_name` (lines 109-117). All records are upserted into namespace `f"team-{team_id}"` (lines 119-122).

### `delete_document`

`delete_document(document_id, team_id)` at line 125 deletes via `filter={"document_id": {"$eq": str(document_id)}}` in the team namespace (lines 126-129).

### `search_documents`

`search_documents(query, team_id, top_k=5, document_id=None)` at line 132 builds a `query_payload` with `top_k` and `inputs: {"text": query}` (lines 133-136). If `document_id` is provided, a `filter` is added (lines 137-138). Searches namespace `f"team-{team_id}"` (lines 140-143).
