from dotenv import load_dotenv
import os

from pinecone import Pinecone
load_dotenv()


pc = Pinecone(api_key=os.getenv("YOUR_KEY"))

index_name = "fyp"
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


def upsert_task(task_id: int, title: str, description: str, team_id: int):
    chunk_text = f"Task: {title}. Description: {description}"
    index.upsert_records(
        namespace=f"team-{team_id}",
        records=[{
            "_id": f"task-{task_id}",
            "chunk_text": chunk_text,
            "type": "task",
            "task_id": task_id,
            "team_id": team_id
        }]
    )



def delete_task(task_id: int, team_id: int):
    index.delete(
        ids=[f"task-{task_id}"],
        namespace=f"team-{team_id}"
    )


def search(query: str, namespace: str, top_k: int = 5):
    results = index.search(
        namespace=namespace,
        query={
            "top_k": top_k,
            "inputs": {"text": query}
        }
    )
    return results
