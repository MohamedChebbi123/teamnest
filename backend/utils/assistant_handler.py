from dotenv import load_dotenv
import os
from groq import Groq

load_dotenv()

client = Groq(api_key=os.getenv("groq_key"))


def ask_assistant(query: str, context: list[dict]) -> str:
    context_text = ""
    for item in context:
        metadata = item.get("metadata", item)
        chunk = metadata.get("chunk_text", "")
        doc_type = metadata.get("type", "unknown")
        context_text += f"[{doc_type}] {chunk}\n"

    messages = [
        {
            "role": "system",
            "content": (
                "You are TeamNest AI, a helpful assistant for a team collaboration platform. "
                "Answer questions based on the provided context from team tasks and uploaded documents. "
                "Be concise and helpful. If the context doesn't contain enough information to answer, "
                "say so honestly. Do not make up information."
            )
        },
        {
            "role": "user",
            "content": f"Context:\n{context_text}\n\nQuestion: {query}" if context_text.strip() else query
        }
    ]

    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        temperature=0.7,
        max_completion_tokens=1024,
    )

    return completion.choices[0].message.content
