import os
import tempfile
import httpx
from dotenv import load_dotenv
from pinecone import Pinecone
from llama_index.core import SimpleDirectoryReader
from llama_index.core.node_parser import SentenceSplitter

load_dotenv()

pc = Pinecone(api_key=os.getenv("YOUR_KEY"))

doc_index_name = "fyp-documents"
if not pc.has_index(doc_index_name):
    pc.create_index_for_model(
        name=doc_index_name,
        cloud="aws",
        region="us-east-1",
        embed={
            "model": "llama-text-embed-v2",
            "field_map": {"text": "chunk_text"}
        }
    )

doc_index = pc.Index(doc_index_name)


def load_document(file_url: str, file_name: str):
    with tempfile.TemporaryDirectory() as tmp_dir:
        response = httpx.get(file_url, follow_redirects=True)
        print(f"[EMBED DEBUG] URL: {file_url}, status: {response.status_code}, size: {len(response.content)} bytes")
        file_path = os.path.join(tmp_dir, file_name)

        with open(file_path, "wb") as f:
            f.write(response.content)

        docs = SimpleDirectoryReader(tmp_dir).load_data()

    return docs


def chunk_documents(documents, document_id: str, user_id: str):
    splitter = SentenceSplitter(
        chunk_size=500,
        chunk_overlap=50
    )

    nodes = splitter.get_nodes_from_documents(documents)

    for node in nodes:
        node.metadata = {
            "document_id": document_id,
            "user_id": user_id,
            "source": "upload"
        }

    return nodes


def embed_document(file_url: str, file_name: str, document_id: str, user_id: str, team_id: int):
    docs = load_document(file_url, file_name)
    nodes = chunk_documents(docs, document_id, user_id)

    records = []
    for i, node in enumerate(nodes):
        records.append({
            "_id": f"doc-{document_id}-chunk-{i}",
            "chunk_text": node.get_content(),
            "type": "document",
            "document_id": document_id,
            "user_id": user_id,
            "source": "upload"
        })

    doc_index.upsert_records(
        namespace=f"team-{team_id}",
        records=records
    )


def delete_document(document_id: str, team_id: int, total_chunks: int):
    ids = [f"doc-{document_id}-chunk-{i}" for i in range(total_chunks)]
    doc_index.delete(
        ids=ids,
        namespace=f"team-{team_id}"
    )


def search_documents(query: str, team_id: int, top_k: int = 5):
    results = doc_index.search(
        namespace=f"team-{team_id}",
        query={
            "top_k": top_k,
            "inputs": {"text": query}
        }
    )
    return results

