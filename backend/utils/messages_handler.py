from dotenv import load_dotenv
import os
import logging
from datetime import datetime

from pinecone import Pinecone
load_dotenv()

logger = logging.getLogger(__name__)


pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))


index_name = "fyp-messages"
_index = None


def _get_index():
    global _index
    if _index is None:
        if not pc.has_index(index_name):
            pc.create_index_for_model(
                name=index_name,
                cloud="aws",
                region="us-east-1",
                embed={
                    "model": "llama-text-embed-v2",
                    "field_map": {"text": "chunk_text"}
                }
            )
        _index = pc.Index(index_name)
    return _index

def _to_epoch(iso_str: str) -> float | None:
    try:
        return datetime.fromisoformat(iso_str).timestamp()
    except (ValueError, TypeError) as e:
        logger.warning("Failed to parse date %r: %s", iso_str, e)
        return None


def upsert_message(
    message_id: int,
    team_id: int,
    org_id: int,
    content: str,
    channel_id: int,
    channel_name: str,
    sender_id: int,
    sender_first_name: str,
    sender_last_name: str,
    sent_at: str,
    team_name: str = "",
    org_name: str = "",
    parent_id: int = None
):
    chunk_text = f"{sender_first_name} {sender_last_name}: {content}"
    record = {
        "_id": f"message-{message_id}",
        "chunk_text": chunk_text,
        "type": "message",
        "message_id": message_id,
        "team_id": team_id,
        "team_name": team_name,
        "organization_id": org_id,
        "organization_name": org_name,
        "channel_id": channel_id,
        "channel_name": channel_name,
        "sender_id": sender_id,
        "sender_first_name": sender_first_name,
        "sender_last_name": sender_last_name,
        "sent_at": sent_at,
    }
    sent_at_ts = _to_epoch(sent_at)
    if sent_at_ts is not None:
        record["sent_at_ts"] = sent_at_ts
    if parent_id is not None:
        record["parent_id"] = parent_id
    index = _get_index()
    index.upsert_records(
        namespace=f"team-{team_id}",
        records=[record]
    )
    org_record = {**record, "_id": f"org-message-{message_id}"}
    index.upsert_records(
        namespace=f"org-{org_id}",
        records=[org_record]
    )


def delete_message(message_id: int, team_id: int, org_id: int | None = None):
    index = _get_index()
    index.delete(
        ids=[f"message-{message_id}"],
        namespace=f"team-{team_id}"
    )
    if org_id is not None:
        index.delete(
            ids=[f"org-message-{message_id}"],
            namespace=f"org-{org_id}"
        )


def search_messages(query: str, team_id: int, top_k: int = 5):
    results = _get_index().search(
        namespace=f"team-{team_id}",
        query={
            "top_k": top_k,
            "inputs": {"text": query}
        }
    )
    return results


def search_messages_org(query: str, org_id: int, top_k: int = 20):
    results = _get_index().search(
        namespace=f"org-{org_id}",
        query={
            "top_k": top_k,
            "inputs": {"text": query}
        }
    )
    return results
