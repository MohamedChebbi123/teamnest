# Global Semantic Search Flow

## Files
- `backend/routers/search_router.py` (20 lines)
- `backend/services/search_service.py` (169 lines)
- `backend/utils/messages_handler.py` — `search_messages_org`
- `backend/models/Channels.py`, `Messages.py`, `Organization.py`, `Organization_members.py`, `Team_association.py`, `Users.py`

## Endpoint

### GET /organization/{org_id}/search/messages?q=term&top_k=20
**Service:** `global_search_messages_service(org_id, query, user, db, top_k)`

## Pipeline

```
Query (q) + org_id
    │
    ├─ Check user is org member (or org owner)
    ├─ Validate query non-empty
    ├─ Clamp top_k: min 1, max 50, default 20
    │
    ├─ Search Pinecone fyp-messages index → org-{org_id} namespace
    │   └─ messages_handler.search_messages_org(query, org_id, top_k)
    │
    ├─ Extract hits
    ├─ Look up Channels by channel_id (filter by org_id)
    │
    ├─ Access Control:
    │   ├─ Org-level channels (team_id = None): accessible to all org members
    │   └─ Team channels: only if user is team member (or org owner)
    │       └─ Queries Team_association for user's team IDs
    │
    ├─ Fetch Messages + Users by message_id (only non-deleted)
    │
    └─ Return {results: [{message_id, content, sent_at, edited_at, score, channel, sender}]}
         └─ Sorted by score descending
```

## Helper Functions

| Function | Purpose |
|----------|---------|
| `_extract_hits(results)` | Parse Pinecone response |
| `_hit_to_dict(hit)` | Convert hit to dict |
| `_hit_score(hit)` | Extract score |
| `DEFAULT_TOP_K` | 20 |
| `MAX_TOP_K` | 50 |
