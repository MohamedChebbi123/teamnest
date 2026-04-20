from dotenv import load_dotenv
import os
import logging
from fastapi import HTTPException
from groq import Groq, GroqError

load_dotenv()

logger = logging.getLogger(__name__)

api_key = os.getenv("GROQ_KEY")
client = Groq(api_key=api_key)


SYSTEM_PROMPT = """
You are TeamNest AI, an assistant for a team collaboration platform.

Rules:
- Use ONLY the provided context to answer.
- Be direct, natural, and concise.
- NEVER mention "context" or "according to the context".
- Do NOT explain how you found the answer unless the user explicitly asks.
- If the user asks "how did you know", briefly reference the message source.
- If the answer is not in the context, say you don't know.
"""


def format_context(context: list[dict]) -> str:
    formatted = []

    for item in context:
        metadata = item.get("metadata", item)

        chunk = metadata.get("chunk_text", "")
        doc_type = metadata.get("type", "unknown")

        if chunk:
            formatted.append(f"- [{doc_type}] {chunk}")

    return "\n".join(formatted)


def ask_assistant(query: str, context: list[dict]) -> str:
    context_text = format_context(context)

    if context_text.strip():
        user_content = f"""
Use the following information to answer:

{context_text}

Question:
{query}
"""
    else:
        user_content = query

    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT
        },
        {
            "role": "user",
            "content": user_content
        }
    ]

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.3,
            max_completion_tokens=1024,
        )
    except GroqError as e:
        logger.exception("Groq API call failed: %s", e)
        raise HTTPException(status_code=502, detail="Assistant unavailable")
    except Exception as e:
        logger.exception("Unexpected error calling Groq: %s", e)
        raise HTTPException(status_code=502, detail="Assistant unavailable")

    return completion.choices[0].message.content