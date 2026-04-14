from dotenv import load_dotenv
import os

from pinecone import Pinecone
load_dotenv()


pc = Pinecone(api_key=os.getenv("YOUR_KEY"))


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

def upsert_message(message_id: int, team_id: int, title: str, org_id: int, description: str):
    chunk_text = f"Message: {title}. Description: {description}"
    index.upsert_records(
        namespace=f"team-{team_id}",
        records=[{
            "_id": f"message-{message_id}",
            "chunk_text": chunk_text,
            "type": "message",
            "message_id": message_id,
            "team_id": team_id,
            "organization_id": org_id
        }]
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
