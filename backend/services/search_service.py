from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.Channels import Channels
from models.Messages import Messages
from models.Organization import Organization
from models.Organization_members import Organization_members
from models.Team_association import Team_association
from models.Users import Users
from utils.messages_handler import search_messages_org


MAX_TOP_K = 50
DEFAULT_TOP_K = 20


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


def global_search_messages_service(
    org_id: int,
    query: str,
    user: Users,
    db: Session,
    top_k: int | None = None,
):
    user_id = user.user_id

    organization = db.query(Organization).filter(
        Organization.organization_id == org_id
    ).first()
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    is_owner = organization.owner_id == user_id
    is_member = db.query(Organization_members).filter(
        Organization_members.org_id == org_id,
        Organization_members.memmber_id == user_id,
    ).first()

    if not is_owner and not is_member:
        raise HTTPException(
            status_code=403,
            detail="You must be a member of this organization to search messages",
        )

    if not query or not query.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty")

    requested_top_k = top_k if top_k is not None else DEFAULT_TOP_K
    if requested_top_k <= 0:
        raise HTTPException(status_code=400, detail="top_k must be greater than 0")
    if requested_top_k > MAX_TOP_K:
        requested_top_k = MAX_TOP_K

    raw_results = search_messages_org(
        query=query.strip(),
        org_id=org_id,
        top_k=requested_top_k,
    )
    hits = _extract_hits(raw_results)

    enriched = []
    for hit in hits:
        meta = _hit_to_dict(hit)
        message_id = meta.get("message_id")
        channel_id = meta.get("channel_id")
        if message_id is None or channel_id is None:
            continue
        enriched.append({"meta": meta, "score": _hit_score(hit)})

    if not enriched:
        return {"results": []}

    channel_ids = {int(item["meta"]["channel_id"]) for item in enriched}
    channels = db.query(Channels).filter(
        Channels.channel_id.in_(channel_ids),
        Channels.org_id == org_id,
    ).all()
    channels_by_id = {c.channel_id: c for c in channels}

    team_ids = {c.team_id for c in channels if c.team_id is not None}
    user_team_ids: set[int] = set()
    if team_ids and not is_owner:
        rows = db.query(Team_association.team_id).filter(
            Team_association.user_id == user_id,
            Team_association.team_id.in_(team_ids),
        ).all()
        user_team_ids = {row[0] for row in rows}

    accessible_channel_ids = set()
    for c in channels:
        if c.team_id is None:
            accessible_channel_ids.add(c.channel_id)
        elif is_owner or c.team_id in user_team_ids:
            accessible_channel_ids.add(c.channel_id)

    accessible = [
        item for item in enriched
        if int(item["meta"]["channel_id"]) in accessible_channel_ids
    ]
    if not accessible:
        return {"results": []}

    message_ids = {int(item["meta"]["message_id"]) for item in accessible}
    messages = db.query(Messages, Users).join(
        Users, Messages.sender_id == Users.user_id
    ).filter(
        Messages.message_id.in_(message_ids),
        Messages.is_deleted == False,
    ).all()
    messages_by_id = {m.message_id: (m, sender) for m, sender in messages}

    results = []
    for item in accessible:
        meta = item["meta"]
        mid = int(meta["message_id"])
        if mid not in messages_by_id:
            continue
        message, sender = messages_by_id[mid]
        channel = channels_by_id.get(int(meta["channel_id"]))
        if channel is None:
            continue
        results.append({
            "message_id": message.message_id,
            "message_content": message.message_content,
            "sent_at": message.sent_at,
            "edited_at": message.edited_at,
            "score": item["score"],
            "channel": {
                "channel_id": channel.channel_id,
                "channel_name": channel.channel_name,
                "channel_mode": channel.channel_mode,
                "channel_category": channel.channel_category,
                "team_id": channel.team_id,
            },
            "sender": {
                "user_id": sender.user_id,
                "first_name": sender.first_name,
                "last_name": sender.last_name,
                "avatar_url": sender.avatar_url,
                "user_tag": sender.user_tag,
            },
        })

    results.sort(key=lambda r: r["score"], reverse=True)

    return {"results": results}
