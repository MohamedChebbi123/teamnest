from dotenv import load_dotenv
import os
import logging
from datetime import datetime

from pinecone import Pinecone
load_dotenv()

logger = logging.getLogger(__name__)


pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))


index_name = "fyp-messages"
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

index = pc.Index(index_name)

def _format_date(iso_str: str) -> str:
    try:
        dt = datetime.fromisoformat(iso_str)
        return dt.strftime("%b %d, %Y at %I:%M %p")
    except (ValueError, TypeError) as e:
        logger.warning("Failed to parse date %r: %s", iso_str, e)
        return iso_str


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
        "sent_at": _format_date(sent_at),
    }
    if parent_id is not None:
        record["parent_id"] = parent_id
    index.upsert_records(
        namespace=f"team-{team_id}",
        records=[record]
    )


def delete_message(message_id: int, team_id: int):
    index.delete(
        ids=[f"message-{message_id}"],
        namespace=f"team-{team_id}"
    )


def search_messages(query: str, team_id: int, top_k: int = 5):
    results = index.search(
        namespace=f"team-{team_id}",
        query={
            "top_k": top_k,
            "inputs": {"text": query}
        }
    )
    return results
