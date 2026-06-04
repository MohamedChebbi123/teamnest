# Assistant Pipeline Roadmap

This document describes the end-to-end assistant flow, the supporting ingestion pipelines, and the exact files/functions involved.

## Entry point

- HTTP endpoint: `POST /organization/{org_id}/assistant`
- Router: [backend/routers/assistant_router.py](backend/routers/assistant_router.py)
  - `ask_assistant_endpoint()`
- Request schema: [backend/schemas/Assistant_input.py](backend/schemas/Assistant_input.py)
  - `Assistant_input` fields: `query`, `team_id`, `document_id`

## Request pipeline (query to answer)

1. **Auth + input**
   - `current_user` dependency resolves the user in the router.
   - `ask_assistant_service()` validates:
     - org membership
     - team membership
     - non-empty query
   - File: [backend/services/assistant_service.py](backend/services/assistant_service.py)

2. **Retrieval**
   - If `document_id` is present: search only the document index.
   - Else: search three sources in parallel (tasks, documents, messages).
   - Files:
     - [backend/utils/vector_db_handler.py](backend/utils/vector_db_handler.py) `search()`
     - [backend/utils/document_handler.py](backend/utils/document_handler.py) `search_documents()`
     - [backend/utils/messages_handler.py](backend/utils/messages_handler.py) `search_messages()`

3. **Scoring + selection**
   - Filter by `SCORE_THRESHOLD`.
   - Normalize scores across sources and keep `MAX_CONTEXT_HITS`.
   - Functions:
     - `_extract_hits()`
     - `_hit_to_dict()`
     - `_hit_score()`
     - `_normalize_hits()`
   - File: [backend/services/assistant_service.py](backend/services/assistant_service.py)

4. **Context assembly**
   - Build a compact list of hit metadata.
   - File: [backend/services/assistant_service.py](backend/services/assistant_service.py)

5. **Prompt formatting**
   - Convert metadata into readable headers and chunks.
   - Functions:
     - `format_context()`
     - `_display_id()`
     - `_display_date()`
   - File: [backend/utils/assistant_handler.py](backend/utils/assistant_handler.py)

6. **Model call**
   - Send `SYSTEM_PROMPT` + user query to Groq.
   - Function: `ask_assistant()`
   - File: [backend/utils/assistant_handler.py](backend/utils/assistant_handler.py)

7. **Response shaping**
   - Return:
     - `answer` (model response)
     - `sources` (typed metadata for each hit)
   - File: [backend/services/assistant_service.py](backend/services/assistant_service.py)

## Ingestion pipelines (data into indexes)

### Tasks

- File: [backend/utils/vector_db_handler.py](backend/utils/vector_db_handler.py)
- Functions:
  - `upsert_task()` creates a task record with `chunk_text`, `task_id`, `team_id`, `title`.
  - `delete_task()` removes a task record.
- Index: `fyp` (Pinecone)
- Namespace: `team-{team_id}`

### Documents

- File: [backend/utils/document_handler.py](backend/utils/document_handler.py)
- Functions:
  - `load_document()` downloads the file and reads it into documents.
  - `extract_tables_from_pdf()` pulls tables from PDFs (lattice, then stream).
  - `chunk_documents()` splits into sentence-based chunks and adds metadata.
  - `embed_document()` embeds and upserts all chunks.
  - `delete_document()` removes all chunks for a document.
- Index: `fyp-documents` (Pinecone)
- Namespace: `team-{team_id}`

### Messages

- File: [backend/utils/messages_handler.py](backend/utils/messages_handler.py)
- Functions:
  - `upsert_message()` creates a message record for team and org namespaces.
  - `delete_message()` removes message records.
  - `search_messages()` searches team namespace.
  - `search_messages_org()` searches org namespace.
  - `_to_epoch()` parses ISO timestamps to epoch seconds (optional field).
- Index: `fyp-messages` (Pinecone)
- Namespaces: `team-{team_id}`, `org-{org_id}`

## Environment variables

- `GROQ_KEY` used by the assistant client in [backend/utils/assistant_handler.py](backend/utils/assistant_handler.py)
- `PINECONE_API_KEY` used by Pinecone indexes in:
  - [backend/utils/vector_db_handler.py](backend/utils/vector_db_handler.py)
  - [backend/utils/document_handler.py](backend/utils/document_handler.py)
  - [backend/utils/messages_handler.py](backend/utils/messages_handler.py)

## Flow diagram

```mermaid
flowchart TD
    A[Client] --> B[POST /organization/{org_id}/assistant]
    B --> C[ask_assistant_endpoint]
    C --> D[ask_assistant_service]
    D --> E{document_id?}
    E -- yes --> F[search_documents]
    E -- no --> G[search tasks]
    E -- no --> H[search documents]
    E -- no --> I[search messages]
    F --> J[normalize + top hits]
    G --> J
    H --> J
    I --> J
    J --> K[build context]
    K --> L[format_context]
    L --> M[ask_assistant]
    M --> N[answer + sources]
```

## Function inventory (exhaustive)

- [backend/routers/assistant_router.py](backend/routers/assistant_router.py)
  - `ask_assistant_endpoint()`
- [backend/schemas/Assistant_input.py](backend/schemas/Assistant_input.py)
  - `Assistant_input`
- [backend/services/assistant_service.py](backend/services/assistant_service.py)
  - `_extract_hits()`
  - `_hit_to_dict()`
  - `_hit_score()`
  - `_normalize_hits()`
  - `ask_assistant_service()`
- [backend/utils/assistant_handler.py](backend/utils/assistant_handler.py)
  - `SYSTEM_PROMPT`
  - `_display_id()`
  - `_display_date()`
  - `format_context()`
  - `ask_assistant()`
- [backend/utils/vector_db_handler.py](backend/utils/vector_db_handler.py)
  - `_get_index()`
  - `upsert_task()`
  - `delete_task()`
  - `search()`
- [backend/utils/document_handler.py](backend/utils/document_handler.py)
  - `_get_doc_index()`
  - `extract_tables_from_pdf()`
  - `load_document()`
  - `chunk_documents()`
  - `embed_document()`
  - `delete_document()`
  - `search_documents()`
- [backend/utils/messages_handler.py](backend/utils/messages_handler.py)
  - `_get_index()`
  - `_to_epoch()`
  - `upsert_message()`
  - `delete_message()`
  - `search_messages()`
  - `search_messages_org()`
