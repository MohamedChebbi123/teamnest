from fastapi import HTTPException
from sqlalchemy.orm import Session
from utils.jwt_handler import verify_token
from utils.vector_db_handler import search
from utils.document_handler import search_documents
from utils.messages_handler import search_messages
from utils.assistant_handler import ask_assistant
from models.Organization_members import Organization_members
from models.Team_association import Team_association


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


def ask_assistant_service(query: str, team_id: int, org_id: int, authorization: str, db: Session, document_id: int | None = None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

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
        all_hits = _extract_hits(doc_results)
    else:
        task_results = search(query=query.strip(), namespace=f"team-{team_id}", top_k=5)
        doc_results = search_documents(query=query.strip(), team_id=team_id, top_k=5)
        message_results = search_messages(query=query.strip(), team_id=team_id, top_k=5)
        all_hits = _extract_hits(task_results) + _extract_hits(doc_results) + _extract_hits(message_results)

    context = [{"metadata": _hit_to_dict(hit)} for hit in all_hits]

    answer = ask_assistant(query=query.strip(), context=context)

    sources = []
    for hit in all_hits:
        merged = _hit_to_dict(hit)
        sources.append({
            "type": merged.get("type"),
            "chunk_text": merged.get("chunk_text"),
        })

    return {
        "answer": answer,
        "sources": sources,
    }
