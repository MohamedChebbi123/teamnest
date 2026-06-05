# Search Flow

## Router Endpoint

`backend/routers/search_router.py:9` defines `router = APIRouter()`. `GET /organization/{org_id}/search/messages` at line 12 accepts `org_id`, a query parameter `q` (defaulting to empty string), an optional `top_k` query parameter, requires authentication, and calls `global_search_messages_service(org_id, q, user, db, top_k=top_k)` (lines 12-20).

## Service: `search_service.py`

### Helper Functions

`_extract_hits(results)` at `backend/services/search_service.py:17` mirrors the assistant service: checks for `result.hits` (lines 18-19), then `matches` (lines 20-21), otherwise returns `[]` (line 22).

`_hit_to_dict(hit)` at line 25 merges `metadata` and `fields` from dict or object hits (lines 26-32).

`_hit_score(hit)` at line 35 extracts `_score` or `score`, defaulting to `0.0` (lines 36-38).

### Constants

`MAX_TOP_K = 50` (line 13). `DEFAULT_TOP_K = 20` (line 14).

### `global_search_messages_service`

`global_search_messages_service(org_id, query, user, db, top_k=None)` at line 41 gets `user_id` (line 48). It looks up the `Organization` by `organization_id` — if not found, raises `HTTPException(404, detail="Organization not found")` (lines 50-54). It checks if the user is the org owner (`organization.owner_id == user_id`, line 56) or an `Organization_members` member (lines 57-60). If neither, raises `HTTPException(403, detail="You must be a member of this organization to search messages")` (lines 62-66). An empty query raises `HTTPException(400, detail="Search query cannot be empty")` (lines 68-69).

The effective `top_k` is set: if the caller provided a value it's used, otherwise `DEFAULT_TOP_K` (line 71). A non-positive value raises `HTTPException(400, detail="top_k must be greater than 0")` (lines 72-73). If the requested value exceeds `MAX_TOP_K`, it's capped (lines 74-75). Calls `search_messages_org(query=query.strip(), org_id=org_id, top_k=requested_top_k)` (lines 77-81). Hits are extracted (line 82).

Each hit is enriched: `meta = _hit_to_dict(hit)`, extracting `message_id` and `channel_id` — if either is missing the hit is skipped (lines 85-91). If no enriched results remain, returns `{"results": []}` (lines 93-94).

Channel IDs are collected and used to query `Channels` filtered by `org_id` (lines 96-101). Access control is computed: all `team_id` values from channels are collected (line 103). If the user is not the owner, their team memberships are queried from `Team_association` (lines 105-110). A channel is accessible if it's org-level (`team_id is None`), or the user is the owner, or the user belongs to the channel's team (lines 112-117). Hits in inaccessible channels are filtered out — if nothing remains, returns `{"results": []}` (lines 119-124).

Remaining message IDs are used to query `Messages` joined with `Users` on `sender_id`, filtering by `message_id` set and `is_deleted == False` (lines 126-133). Each accessible hit is built into a result dict with `message_id`, `message_content`, `sent_at`, `edited_at`, `score`, a `channel` sub-dict (with `channel_id`, `channel_name`, `channel_mode`, `channel_category`, `team_id`), and a `sender` sub-dict (with `user_id`, `first_name`, `last_name`, `avatar_url`, `user_tag`) (lines 135-165). Results are sorted by `score` descending (line 167). Returns `{"results": results}` (line 169).

## Utils: `messages_handler.py`

### Pinecone Setup

`backend/utils/messages_handler.py:12` initializes Pinecone with `PINECONE_API_KEY`. The index name is `"fyp-messages"` (line 15), with `_index = None` (line 16). `_get_index()` at line 19 creates the index on demand with the same pattern: `cloud="aws"`, `region="us-east-1"`, embedding model `"llama-text-embed-v2"` with `field_map: {"text": "chunk_text"}` (lines 22-31).

### `_to_epoch`

`_to_epoch(iso_str)` at line 35 parses an ISO datetime string via `datetime.fromisoformat(iso_str).timestamp()` (line 37), returning `None` on `ValueError` or `TypeError` with a warning log (lines 38-40).

### `upsert_message`

`upsert_message(message_id, team_id, org_id, content, channel_id, channel_name, sender_id, sender_first_name, sender_last_name, sent_at, team_name="", org_name="", parent_id=None)` at line 43 builds `chunk_text = f"{sender_first_name} {sender_last_name}: {content}"` (line 58). The record includes `_id: f"message-{message_id}"`, `chunk_text`, `type: "message"`, `message_id`, `team_id`, `team_name`, `organization_id`, `organization_name`, `channel_id`, `channel_name`, `sender_id`, `sender_first_name`, `sender_last_name`, `sent_at`, and optionally `sent_at_ts` (from `_to_epoch` conversion) and `parent_id` (lines 59-79). The record is upserted into the `f"team-{team_id}"` namespace (lines 80-84). A copy with `_id: f"org-message-{message_id}"` (prefixed with "org-") is upserted into the `f"org-{org_id}"` namespace (lines 85-89).

### `delete_message`

`delete_message(message_id, team_id, org_id=None)` at line 92 deletes the message from the team namespace (lines 94-97). If `org_id` is provided, also deletes the `"org-message-{message_id}"` record from the org namespace (lines 98-102).

### `search_messages`

`search_messages(query, team_id, top_k=5)` at line 105 searches the `f"team-{team_id}"` namespace with `top_k` and `inputs: {"text": query}` (lines 106-113).

### `search_messages_org`

`search_messages_org(query, org_id, top_k=20)` at line 116 searches the `f"org-{org_id}"` namespace with the same query structure (lines 117-124).
