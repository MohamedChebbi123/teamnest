# Search Flow — Every Line of Code

## File: `backend/routers/search_router.py` (20 lines)

| Lines | Code |
|-------|------|
| 1-7 | Imports: `APIRouter, Depends, Query`, `Session`, `connect_databse`, `Users`, `global_search_messages_service`, `current_user` |
| 9 | `router = APIRouter()` |
| 12-20 | `@router.get("/organization/{org_id}/search/messages")` / `async def search_messages_global(org_id, q: str = Query(""), top_k: int \| None = Query(None), user=Depends(current_user), db=Depends(connect_databse)):` / `return global_search_messages_service(org_id, q, user, db, top_k=top_k)` |

## File: `backend/services/search_service.py` (169 lines)

| Line | Code |
|------|------|
| 1-10 | Imports: `HTTPException`, `Session`, `Channels`, `Messages`, `Organization`, `Organization_members`, `Team_association`, `Users`, `search_messages_org` |
| 13 | `MAX_TOP_K = 50` |
| 14 | `DEFAULT_TOP_K = 20` |
| 17 | `def _extract_hits(results):` |
| 18-19 | `if hasattr(results, "result") and hasattr(results.result, "hits"): return list(results.result.hits)` |
| 20-21 | `if hasattr(results, "matches"): return list(results.matches)` |
| 22 | `return []` |
| 25 | `def _hit_to_dict(hit):` |
| 26-28 | `if isinstance(hit, dict): fields = hit.get("fields") or {}; metadata = hit.get("metadata") or {}` |
| 30-31 | `else: fields = getattr(hit, "fields", None) or {}; metadata = getattr(hit, "metadata", None) or {}` |
| 32 | `return {**metadata, **fields}` |
| 35 | `def _hit_score(hit):` |
| 36-37 | `if isinstance(hit, dict): return hit.get("_score") or hit.get("score") or 0.0` |
| 38 | `return getattr(hit, "_score", None) or getattr(hit, "score", None) or 0.0` |
| 41-47 | `def global_search_messages_service(org_id, query: str, user: Users, db: Session, top_k: int \| None = None):` |
| 48 | `user_id = user.user_id` |
| 50-54 | `organization = db.query(Organization).filter(Organization.organization_id == org_id).first()` / `if not organization: raise HTTPException(404, "Organization not found")` |
| 56-66 | `is_owner = organization.owner_id == user_id` / `is_member = db.query(Organization_members).filter(Organization_members.org_id == org_id, Organization_members.memmber_id == user_id).first()` / `if not is_owner and not is_member: raise HTTPException(403, "You must be a member of this organization to search messages")` |
| 68-69 | `if not query or not query.strip(): raise HTTPException(400, "Search query cannot be empty")` |
| 71-75 | `requested_top_k = top_k if top_k is not None else DEFAULT_TOP_K` / `if requested_top_k <= 0: raise HTTPException(400, "top_k must be greater than 0")` / `if requested_top_k > MAX_TOP_K: requested_top_k = MAX_TOP_K` |
| 77-81 | `raw_results = search_messages_org(query=query.strip(), org_id=org_id, top_k=requested_top_k)` |
| 82 | `hits = _extract_hits(raw_results)` |
| 85-91 | For each `hit`: `meta = _hit_to_dict(hit); message_id = meta.get("message_id"); channel_id = meta.get("channel_id"); if message_id is None or channel_id is None: continue; enriched.append({"meta": meta, "score": _hit_score(hit)})` |
| 93-94 | `if not enriched: return {"results": []}` |
| 96-101 | `channel_ids = {int(item["meta"]["channel_id"]) for item in enriched}` / `channels = db.query(Channels).filter(Channels.channel_id.in_(channel_ids), Channels.org_id == org_id).all()` / `channels_by_id = {c.channel_id: c for c in channels}` |
| 103-117 | Access control: `team_ids = {c.team_id for c in channels if c.team_id is not None}` / `user_team_ids: set[int] = set()` / `if team_ids and not is_owner: rows = db.query(Team_association.team_id).filter(Team_association.user_id == user_id, Team_association.team_id.in_(team_ids)).all(); user_team_ids = {row[0] for row in rows}` / `accessible_channel_ids = set()` / for each `c in channels`: `if c.team_id is None: accessible_channel_ids.add(c.channel_id); elif is_owner or c.team_id in user_team_ids: accessible_channel_ids.add(c.channel_id)` |
| 119-124 | `accessible = [item for item in enriched if int(item["meta"]["channel_id"]) in accessible_channel_ids]` / `if not accessible: return {"results": []}` |
| 126-133 | `message_ids = {int(item["meta"]["message_id"]) for item in accessible}` / `messages = db.query(Messages, Users).join(Users, Messages.sender_id == Users.user_id).filter(Messages.message_id.in_(message_ids), Messages.is_deleted == False).all()` / `messages_by_id = {m.message_id: (m, sender) for m, sender in messages}` |
| 135-165 | Build results: for each `item in accessible`: `mid = int(meta["message_id"]); if mid not in messages_by_id: continue; message, sender = messages_by_id[mid]; channel = channels_by_id.get(int(meta["channel_id"])); if channel is None: continue` / Append `{"message_id": ..., "message_content": ..., "sent_at": ..., "edited_at": ..., "score": ..., "channel": {channel_id, channel_name, channel_mode, channel_category, team_id}, "sender": {user_id, first_name, last_name, avatar_url, user_tag}}` |
| 167 | `results.sort(key=lambda r: r["score"], reverse=True)` |
| 169 | `return {"results": results}` |

## File: `backend/utils/messages_handler.py` (124 lines)

| Line | Code |
|------|------|
| 1-6 | Imports: `load_dotenv`, `os`, `logging`, `datetime`, `Pinecone` |
| 7 | `load_dotenv()` |
| 9 | `logger = logging.getLogger(__name__)` |
| 12 | `pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))` |
| 15 | `index_name = "fyp-messages"` |
| 16 | `_index = None` |
| 19 | `def _get_index():` |
| 20-21 | `global _index; if _index is None:` |
| 22-31 | `if not pc.has_index(index_name): pc.create_index_for_model(name=index_name, cloud="aws", region="us-east-1", embed={"model": "llama-text-embed-v2", "field_map": {"text": "chunk_text"}}); _index = pc.Index(index_name)` |
| 33 | `return _index` |
| 35 | `def _to_epoch(iso_str: str) -> float \| None:` |
| 36-39 | `try: return datetime.fromisoformat(iso_str).timestamp(); except (ValueError, TypeError) as e: logger.warning("Failed to parse date %r: %s", iso_str, e); return None` |
| 43-57 | `def upsert_message(message_id, team_id, org_id, content, channel_id, channel_name, sender_id, sender_first_name, sender_last_name, sent_at, team_name="", org_name="", parent_id=None):` |
| 58 | `chunk_text = f"{sender_first_name} {sender_last_name}: {content}"` |
| 59-84 | Builds `record` dict with `_id: f"message-{message_id}"`, `chunk_text`, `type: "message"`, `message_id`, `team_id`, `team_name`, `organization_id`, `organization_name`, `channel_id`, `channel_name`, `sender_id`, `sender_first_name`, `sender_last_name`, `sent_at` / Converts `sent_at` to epoch via `_to_epoch`, sets `sent_at_ts` if valid / Sets `parent_id` if not None / `index = _get_index()` / `index.upsert_records(namespace=f"team-{team_id}", records=[record])` |
| 85-89 | `org_record = {**record, "_id": f"org-message-{message_id}"}` / `index.upsert_records(namespace=f"org-{org_id}", records=[org_record])` — duplicates into org namespace |
| 92-102 | `def delete_message(message_id, team_id, org_id=None):` / `index = _get_index()` / `index.delete(ids=[f"message-{message_id}"], namespace=f"team-{team_id}")` / `if org_id is not None: index.delete(ids=[f"org-message-{message_id}"], namespace=f"org-{org_id}")` |
| 105-113 | `def search_messages(query: str, team_id: int, top_k: int = 5):` / `results = _get_index().search(namespace=f"team-{team_id}", query={"top_k": top_k, "inputs": {"text": query}}); return results` |
| 116-124 | `def search_messages_org(query: str, org_id: int, top_k: int = 20):` / `results = _get_index().search(namespace=f"org-{org_id}", query={"top_k": top_k, "inputs": {"text": query}}); return results` |
