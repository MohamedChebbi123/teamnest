# RAG Assistant Flow — Every Line of Code

## File: `backend/routers/assistant_router.py` (19 lines)

| Lines | Code |
|-------|------|
| 1-7 | Imports: `APIRouter, Depends`, `Session`, `connect_databse`, `Assistant_input`, `ask_assistant_service`, `Users`, `current_user` |
| 9 | `router = APIRouter()` |
| 12-19 | `@router.post("/organization/{org_id}/assistant")` / `async def ask_assistant_endpoint(org_id, data: Assistant_input, user=Depends(current_user), db=Depends(connect_databse)):` / `return ask_assistant_service(data.query, data.team_id, org_id, user, db, data.document_id)` |

## File: `backend/services/assistant_service.py` (135 lines)

| Line | Code |
|------|------|
| 1-9 | Imports: `HTTPException`, `Session`, `search` from `vector_db_handler`, `search_documents` from `document_handler`, `search_messages` from `messages_handler`, `ask_assistant` from `assistant_handler`, `Organization_members`, `Team_association`, `Users` |
| 12 | `def _extract_hits(results):` |
| 13-14 | `if hasattr(results, "result") and hasattr(results.result, "hits"): return list(results.result.hits)` |
| 15-16 | `if hasattr(results, "matches"): return list(results.matches)` |
| 17 | `return []` |
| 20 | `def _hit_to_dict(hit):` |
| 21-23 | `if isinstance(hit, dict): fields = hit.get("fields") or {}; metadata = hit.get("metadata") or {}` |
| 25-26 | `else: fields = getattr(hit, "fields", None) or {}; metadata = getattr(hit, "metadata", None) or {}` |
| 27 | `return {**metadata, **fields}` |
| 30 | `def _hit_score(hit):` |
| 31-32 | `if isinstance(hit, dict): return hit.get("_score") or hit.get("score") or 0.0` |
| 33 | `return getattr(hit, "_score", None) or getattr(hit, "score", None) or 0.0` |
| 36 | `MAX_CONTEXT_HITS = 10` |
| 37 | `SCORE_THRESHOLD = 0.15` |
| 38 | `NORMALIZED_THRESHOLD = 0.0` |
| 41 | `def _normalize_hits(hits):` |
| 43-44 | `if not hits: return []` |
| 46-49 | `scores = [_hit_score(h) for h in hits]; mx = max(scores); mn = min(scores); spread = mx - mn` |
| 51-57 | `normalized = []; for hit, raw in zip(hits, scores): if spread > 0: norm = (raw - mn) / spread; else: norm = 1.0 if mx > 0 else 0.0; normalized.append((hit, norm, raw))` |
| 58 | `return normalized` — min-max normalization returning `[(hit, normalized_score, raw_score)]` |
| 61 | `def ask_assistant_service(query, team_id, org_id, user, db, document_id=None):` |
| 62 | `user_id = user.user_id` |
| 64-70 | `member = db.query(Organization_members).filter(Organization_members.memmber_id == user_id, Organization_members.org_id == org_id).first()` / `if not member: raise HTTPException(403, "User is not a member of this organization")` |
| 72-78 | `is_team_member = db.query(Team_association).filter(Team_association.team_id == team_id, Team_association.user_id == user_id).first()` / `if not is_team_member: raise HTTPException(403, "User is not a member of this team")` |
| 80-81 | `if not query or not query.strip(): raise HTTPException(400, "Query cannot be empty")` |
| 83-87 | `if document_id is not None:` — single-index search: `doc_results = search_documents(query=query.strip(), team_id=team_id, top_k=8, document_id=str(document_id)); doc_hits = _extract_hits(doc_results); doc_hits.sort(key=_hit_score, reverse=True); all_hits = doc_hits[:MAX_CONTEXT_HITS]` |
| 88-104 | `else:` — 3-index search: `task_results = search(query=query.strip(), namespace=f"team-{team_id}", top_k=5); doc_results = search_documents(query=query.strip(), team_id=team_id, top_k=5); message_results = search_messages(query=query.strip(), team_id=team_id, top_k=5)` / `task_hits = [h for h in _extract_hits(task_results) if _hit_score(h) >= SCORE_THRESHOLD]` / `doc_hits = [h for h in _extract_hits(doc_results) if _hit_score(h) >= SCORE_THRESHOLD]` / `message_hits = [h for h in _extract_hits(message_results) if _hit_score(h) >= SCORE_THRESHOLD]` / `merged = _normalize_hits(task_hits) + _normalize_hits(doc_hits) + _normalize_hits(message_hits)` / `merged.sort(key=lambda item: item[1], reverse=True); all_hits = [item[0] for item in merged[:MAX_CONTEXT_HITS]]` |
| 106 | `context = [{"metadata": _hit_to_dict(hit)} for hit in all_hits]` |
| 108 | `answer = ask_assistant(query=query.strip(), context=context)` |
| 110-130 | Build `sources`: for each hit — `merged = _hit_to_dict(hit); doc_type = merged.get("type")` / if `"task"`: `source = {type, chunk_text, task_id, team_id}` / if `"document"`: `source = {type, chunk_text, document_id}` / if `"message"`: `source = {type, chunk_text, message_id, channel_id, channel_name, sender_first_name, sender_last_name, sent_at}` |
| 132-135 | `return {"answer": answer, "sources": sources}` |

## File: `backend/utils/assistant_handler.py` (170 lines)

| Line | Code |
|------|------|
| 1-6 | Imports: `load_dotenv`, `os`, `logging`, `datetime`, `HTTPException`, `Groq`, `GroqError` |
| 8 | `load_dotenv()` |
| 10 | `logger = logging.getLogger(__name__)` |
| 12-13 | `api_key = os.getenv("GROQ_KEY")` / `client = Groq(api_key=api_key)` |
| 16-57 | `SYSTEM_PROMPT = """` Full prompt: "You are TeamNest AI, an assistant for a team collaboration platform." / Source header format: `[message #42 in #general by Jane Doe on Apr 20, 2026 at 03:45 PM]`, `[task #7 in team 3]`, `[document #12]` / Rules: use ONLY provided info; list every item when asked; task NAME/TITLE follows "Task:"; document name is quoted in header; match document names case-insensitively; be concise; NEVER say "according to the context"; cite every factual claim with source in parentheses; answer "how did you know" by citing sources; never deny knowledge present in context |
| 60 | `def _display_id(value) -> str:` |
| 61-62 | `if value is None or value == "": return "?"` |
| 63-64 | `if isinstance(value, float) and value.is_integer(): return str(int(value))` |
| 65 | `return str(value)` |
| 68 | `def _display_date(value) -> str:` |
| 69-70 | `if not value: return "unknown date"` |
| 71-75 | `if isinstance(value, (int, float)): try: return datetime.fromtimestamp(value).strftime("%b %d, %Y at %I:%M %p"); except: return str(value)` |
| 76-80 | `if isinstance(value, str): try: return datetime.fromisoformat(value).strftime("%b %d, %Y at %I:%M %p"); except ValueError: return value` |
| 81 | `return str(value)` |
| 84 | `def format_context(context: list[dict]) -> str:` |
| 85-94 | `formatted = []; for item in context: metadata = item.get("metadata", item); chunk = metadata.get("chunk_text", ""); doc_type = metadata.get("type", "unknown"); if not chunk: continue` |
| 96-103 | `if doc_type == "message":` — builds `sender`, `channel`, `sent_at`, `message_id`; header = `[message #{message_id} in #{channel} by {sender} on {sent_at}]` |
| 105-112 | `elif doc_type == "task":` — header = `[task #{task_id} "{title}" in team {team_id}]` or `[task #{task_id} in team {team_id}]` |
| 114-120 | `elif doc_type == "document":` — header = `[document #{document_id} "{file_name}"]` or `[document #{document_id}]` |
| 122-123 | `else: header = f"[{doc_type}]"` |
| 125-127 | `formatted.append(f"- {header} {chunk}"); return "\n".join(formatted)` |
| 130 | `def ask_assistant(query: str, context: list[dict]) -> str:` |
| 131 | `context_text = format_context(context)` |
| 133-141 | `if context_text.strip(): user_content = f"Use the following information to answer:\n\n{context_text}\n\nQuestion:\n{query}\n"; else: user_content = query` |
| 145-154 | `messages = [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": user_content}]` |
| 156-162 | `try: completion = client.chat.completions.create(model="llama-3.3-70b-versatile", messages=messages, temperature=0.3, max_completion_tokens=1024)` |
| 163-165 | `except GroqError as e: logger.exception("Groq API call failed: %s", e); raise HTTPException(502, detail="Assistant unavailable")` |
| 166-168 | `except Exception as e: logger.exception("Unexpected error calling Groq: %s", e); raise HTTPException(502, detail="Assistant unavailable")` |
| 170 | `return completion.choices[0].message.content` |

## File: `backend/utils/document_handler.py` (145 lines)

| Line | Code |
|------|------|
| 1-9 | Imports: `logging`, `os`, `tempfile`, `httpx`, `camelot`, `load_dotenv`, `Pinecone`, `SimpleDirectoryReader`, `Document`, `SentenceSplitter` |
| 11 | `load_dotenv()` |
| 13 | `logger = logging.getLogger(__name__)` |
| 15 | `pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))` |
| 17 | `doc_index_name = "fyp-documents"` |
| 18 | `_doc_index = None` |
| 21 | `def _get_doc_index():` |
| 22-23 | `global _doc_index; if _doc_index is None:` |
| 24-33 | `if not pc.has_index(doc_index_name): pc.create_index_for_model(name=doc_index_name, cloud="aws", region="us-east-1", embed={"model": "llama-text-embed-v2", "field_map": {"text": "chunk_text"}}); _doc_index = pc.Index(doc_index_name)` |
| 35 | `return _doc_index` |
| 38 | `def extract_tables_from_pdf(file_path: str):` |
| 40-43 | `try: tables = camelot.read_pdf(file_path, pages="all", flavor="lattice"); if not tables or tables.n == 0: tables = camelot.read_pdf(file_path, pages="all", flavor="stream")` |
| 45-49 | `table_texts = []; for i, table in enumerate(tables): df = table.df; table_text = f"Table {i + 1}:\n{df.to_string(index=False)}"; table_texts.append(table_text)` |
| 51-54 | `return table_texts; except Exception: logger.exception("Camelot table extraction failed"); return []` |
| 57 | `def load_document(file_url: str, file_name: str):` |
| 58-64 | `with tempfile.TemporaryDirectory() as tmp_dir: response = httpx.get(file_url, follow_redirects=True); response.raise_for_status(); logger.debug("Document fetched", extra={"file_url": file_url, "status": response.status_code, "size": len(response.content)})` |
| 65-68 | `file_path = os.path.join(tmp_dir, file_name); with open(file_path, "wb") as f: f.write(response.content)` |
| 70 | `docs = SimpleDirectoryReader(tmp_dir).load_data()` |
| 72-75 | `if file_name.lower().endswith(".pdf"): table_texts = extract_tables_from_pdf(file_path); for table_text in table_texts: docs.append(Document(text=table_text))` |
| 77 | `return docs` |
| 80 | `def chunk_documents(documents, document_id: str, user_id: str):` |
| 81-84 | `splitter = SentenceSplitter(chunk_size=500, chunk_overlap=50)` |
| 86 | `nodes = splitter.get_nodes_from_documents(documents)` |
| 88-93 | `for node in nodes: node.metadata = {"document_id": document_id, "user_id": user_id, "source": "upload"}` |
| 95 | `return nodes` |
| 98 | `def embed_document(file_url, file_name, document_id, user_id, team_id):` |
| 99-100 | `docs = load_document(file_url, file_name); nodes = chunk_documents(docs, document_id, user_id)` |
| 102-117 | `records = []; total = len(nodes); for i, node in enumerate(nodes): body = node.get_content(); chunk_text = f"Document: {file_name} (part {i + 1} of {total}).\n{body}"; records.append({"_id": f"doc-{document_id}-chunk-{i}", "chunk_text": chunk_text, "type": "document", "document_id": document_id, "user_id": user_id, "source": "upload", "file_name": file_name})` |
| 119-122 | `_get_doc_index().upsert_records(namespace=f"team-{team_id}", records=records)` |
| 125 | `def delete_document(document_id: str, team_id: int):` |
| 126-129 | `_get_doc_index().delete(filter={"document_id": {"$eq": str(document_id)}}, namespace=f"team-{team_id}")` |
| 132 | `def search_documents(query: str, team_id: int, top_k: int = 5, document_id: str \| None = None):` |
| 133-136 | `query_payload = {"top_k": top_k, "inputs": {"text": query}}` |
| 137-138 | `if document_id is not None: query_payload["filter"] = {"document_id": {"$eq": str(document_id)}}` |
| 140-143 | `results = _get_doc_index().search(namespace=f"team-{team_id}", query=query_payload); return results` |
