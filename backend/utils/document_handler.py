import logging
import os
import re
import tempfile
import httpx
import camelot
import cloudinary
import cloudinary.utils
from dotenv import load_dotenv
from pinecone import Pinecone
from llama_index.core import SimpleDirectoryReader, Document
from llama_index.core.node_parser import SentenceSplitter

load_dotenv()

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
)

logger = logging.getLogger(__name__)

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))

doc_index_name = "fyp-documents"
_doc_index = None


def _get_doc_index():
    global _doc_index
    if _doc_index is None:
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
        _doc_index = pc.Index(doc_index_name)
    return _doc_index


def extract_tables_from_pdf(file_path: str):
    
    try:
        tables = camelot.read_pdf(file_path, pages="all", flavor="lattice")
        if not tables or tables.n == 0:
            tables = camelot.read_pdf(file_path, pages="all", flavor="stream")

        table_texts = []
        for i, table in enumerate(tables):
            df = table.df
            table_text = f"Table {i + 1}:\n{df.to_string(index=False)}"
            table_texts.append(table_text)

        return table_texts
    except Exception:
        logger.exception("Camelot table extraction failed", extra={"file_path": file_path})
        return []


def _extract_public_id(file_url: str) -> tuple[str, str, str | None] | None:
    m = re.search(
        r'res\.cloudinary\.com/([^/]+)/(raw|image)/'
        r'(?:upload|authenticated)/'
        r'(?:s--[A-Za-z0-9_-]+--/)?'
        r'(?:v(\d+)/)?'
        r'(.+)$',
        file_url,
    )
    if not m:
        return None
    cloud_name = m.group(1)
    resource_type = m.group(2)
    version = m.group(3)
    public_id = m.group(4)
    if resource_type == "image":
        public_id = re.sub(r'\.\w+$', '', public_id)
    return cloud_name, resource_type, version, public_id


def _signed_cloudinary_url(file_url: str) -> str:
    parsed = _extract_public_id(file_url)
    if parsed is None:
        return file_url
    resource_type = parsed[1]
    public_id = parsed[3]

    return cloudinary.utils.private_download_url(
        public_id,
        "",
        resource_type=resource_type,
        type="authenticated",
    )


def load_document(file_url: str, file_name: str):
    with tempfile.TemporaryDirectory() as tmp_dir:
        response = httpx.get(file_url, follow_redirects=True, timeout=30)
        if response.status_code in (401, 403):
            signed = _signed_cloudinary_url(file_url)
            logger.debug("Falling back to signed URL: %s", signed)
            response = httpx.get(signed, follow_redirects=True, timeout=30)
        response.raise_for_status()
        logger.debug(
            "Document fetched",
            extra={"file_url": file_url, "status": response.status_code, "size": len(response.content)},
        )
        file_path = os.path.join(tmp_dir, file_name)

        with open(file_path, "wb") as f:
            f.write(response.content)

        docs = SimpleDirectoryReader(tmp_dir).load_data()

        if file_name.lower().endswith(".pdf"):
            table_texts = extract_tables_from_pdf(file_path)
            for table_text in table_texts:
                docs.append(Document(text=table_text))

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
    total = len(nodes)
    for i, node in enumerate(nodes):
        body = node.get_content()
        chunk_text = (
            f"Document: {file_name} (part {i + 1} of {total}).\n{body}"
        )
        records.append({
            "_id": f"doc-{document_id}-chunk-{i}",
            "chunk_text": chunk_text,
            "type": "document",
            "document_id": document_id,
            "user_id": user_id,
            "source": "upload",
            "file_name": file_name,
        })

    _get_doc_index().upsert_records(
        namespace=f"team-{team_id}",
        records=records
    )


def delete_document(document_id: str, team_id: int):
    _get_doc_index().delete(
        filter={"document_id": {"$eq": str(document_id)}},
        namespace=f"team-{team_id}"
    )


def search_documents(query: str, team_id: int, top_k: int = 5, document_id: str | None = None):
    query_payload = {
        "top_k": top_k,
        "inputs": {"text": query}
    }
    if document_id is not None:
        query_payload["filter"] = {"document_id": {"$eq": str(document_id)}}

    results = _get_doc_index().search(
        namespace=f"team-{team_id}",
        query=query_payload
    )
    return results

