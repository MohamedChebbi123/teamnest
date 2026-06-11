import re
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException
from sqlalchemy.orm import Session
from utils.vector_db_handler import search
from utils.document_handler import search_documents
from utils.messages_handler import search_messages
from utils.assistant_handler import ask_assistant
from models.Organization_members import Organization_members
from models.Team_association import Team_association
from models.Users import Users


def _extract_hits(results):
    if hasattr(results, "result") and hasattr(results.result, "hits"):
        return list(results.result.hits)
    if hasattr(results, "matches"):
        return list(results.matches)
    return []


def _hit_to_dict(hit):
    if isinstance(hit, dict):
        fields = hit.get("fields") or {}
        metadata = hit.get("metadata") or {}
    else:
        fields = getattr(hit, "fields", None) or {}
        metadata = getattr(hit, "metadata", None) or {}
    return {**metadata, **fields}


def _hit_score(hit):
    if isinstance(hit, dict):
        return hit.get("_score") or hit.get("score") or 0.0
    return getattr(hit, "_score", None) or getattr(hit, "score", None) or 0.0


MAX_CONTEXT_HITS = 10
SCORE_THRESHOLD = 0.15
NORMALIZED_THRESHOLD = 0.0


def _normalize_hits(hits):

    if not hits:
        return []

    scores = [_hit_score(h) for h in hits]
    mx = max(scores)
    mn = min(scores)
    spread = mx - mn

    normalized = []
    for hit, raw in zip(hits, scores):
        if spread > 0:
            norm = (raw - mn) / spread
        else:
            norm = 1.0 if mx > 0 else 0.0
        normalized.append((hit, norm, raw))
    return normalized


def _detect_time_filter(query: str) -> dict | None:
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    q = query.lower().strip()

    if re.search(r'\btoday\b', q):
        return {"sent_at_ts": {"$gte": today_start.timestamp()}}
    if re.search(r'\byesterday\b', q):
        yesterday_start = today_start - timedelta(days=1)
        return {"sent_at_ts": {"$gte": yesterday_start.timestamp(), "$lt": today_start.timestamp()}}
    if re.search(r'\bthis week\b', q):
        week_start = today_start - timedelta(days=today_start.weekday())
        return {"sent_at_ts": {"$gte": week_start.timestamp()}}
    return None


def ask_assistant_service(query: str, team_id: int, org_id: int, user: Users, db: Session, document_id: int | None = None, history: list | None = None):
    user_id = user.user_id

    member = db.query(Organization_members).filter(
        Organization_members.memmber_id == user_id,
        Organization_members.org_id == org_id
    ).first()

    if not member:
        raise HTTPException(status_code=403, detail="User is not a member of this organization")

    is_team_member = db.query(Team_association).filter(
        Team_association.team_id == team_id,
        Team_association.user_id == user_id
    ).first()

    if not is_team_member:
        raise HTTPException(status_code=403, detail="User is not a member of this team")

    if not query or not query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    if document_id is not None:
        doc_results = search_documents(query=query.strip(), team_id=team_id, top_k=8, document_id=str(document_id))
        doc_hits = _extract_hits(doc_results)
        doc_hits.sort(key=_hit_score, reverse=True)
        all_hits = doc_hits[:MAX_CONTEXT_HITS]
    else:
        time_filter = _detect_time_filter(query)
        task_results = search(query=query.strip(), namespace=f"team-{team_id}", top_k=5)
        doc_results = search_documents(query=query.strip(), team_id=team_id, top_k=5)
        message_top_k = 20 if time_filter else 5
        message_results = search_messages(query=query.strip(), team_id=team_id, top_k=message_top_k, filter=time_filter)

        task_hits = [h for h in _extract_hits(task_results) if _hit_score(h) >= SCORE_THRESHOLD]
        doc_hits = [h for h in _extract_hits(doc_results) if _hit_score(h) >= SCORE_THRESHOLD]
        msg_threshold = 0.0 if time_filter else SCORE_THRESHOLD
        message_hits = [h for h in _extract_hits(message_results) if _hit_score(h) >= msg_threshold]

        merged = (
            _normalize_hits(task_hits)
            + _normalize_hits(doc_hits)
            + _normalize_hits(message_hits)
        )

        merged.sort(key=lambda item: item[1], reverse=True)
        all_hits = [item[0] for item in merged[:MAX_CONTEXT_HITS]]

    context = [{"metadata": _hit_to_dict(hit)} for hit in all_hits]

    answer = ask_assistant(query=query.strip(), context=context, history=history)

    sources = []
    for hit in all_hits:
        merged = _hit_to_dict(hit)
        doc_type = merged.get("type")
        source = {
            "type": doc_type,
            "chunk_text": merged.get("chunk_text"),
        }
        if doc_type == "task":
            source["task_id"] = merged.get("task_id")
            source["team_id"] = merged.get("team_id")
        elif doc_type == "document":
            source["document_id"] = merged.get("document_id")
        elif doc_type == "message":
            source["message_id"] = merged.get("message_id")
            source["channel_id"] = merged.get("channel_id")
            source["channel_name"] = merged.get("channel_name")
            source["sender_first_name"] = merged.get("sender_first_name")
            source["sender_last_name"] = merged.get("sender_last_name")
            source["sent_at"] = merged.get("sent_at")
        sources.append(source)

    return {
        "answer": answer,
        "sources": sources,
    }
