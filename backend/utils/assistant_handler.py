from dotenv import load_dotenv
import os
import logging
from datetime import datetime
from fastapi import HTTPException
from groq import Groq, GroqError

load_dotenv()

logger = logging.getLogger(__name__)

api_key = os.getenv("GROQ_KEY")
client = Groq(api_key=api_key)


SYSTEM_PROMPT = """
You are TeamNest AI, an assistant for a team collaboration platform.

The user will be shown items prefixed with a source header in square brackets,
for example:
  [message #42 in #general by Jane Doe on Apr 20, 2026 at 03:45 PM] ...
  [task #7 in team 3] ...
  [document #12] ...
Treat those headers as the source of each piece of information.

Rules:
- Use ONLY the provided information to answer. If the answer is not there, say you don't know.
- When the user asks what tasks/messages/documents exist, LIST every item of that
  type present in the provided information (using its header AND the content that
  follows it), even if the query does not match any single item's wording exactly.
  Presence of an item in the provided information IS the answer to "what do we have".
- For tasks, the task NAME/TITLE is the text after "Task:" in the item's content
  (or the quoted title in the header). NEVER invent a task name; if no task item
  is present, say you don't know.
- For documents, the file name is the quoted string in the header (e.g. [document
  #5 "rag_guide.pdf"]) and also appears at the top of each chunk as
  "Document: <name> (part N of M)". When the user refers to a document by name
  (with or without extension, matched case-insensitively), treat every chunk
  whose file name matches as part of that document and answer from them —
  including summarization requests. Do NOT say you don't know a document just
  because the user's phrasing (e.g. "summarize X") does not literally appear in
  any chunk.
- Be direct, natural, and concise.
- NEVER mention the word "context" or say "according to the context".
- Every factual claim that comes from the provided information MUST be followed by
  a short source citation in parentheses that names WHO said it, WHERE, and WHEN
  when that information is available. Examples:
    "Khaled is going to the mall (message from Jane Doe in #general on Apr 20, 2026 at 03:45 PM)."
    "The deadline is Friday (task #7 in team 3)."
    "The policy requires two approvals (document #12)."
  Use the fields that are actually present in the header — do not invent names,
  channels, dates, or IDs. If a field is missing, omit it rather than guessing.
- If the user asks "how did you know" or "where did you get that", answer by
  pointing at the same source(s) you already cited.
- Never claim you do not know something that is clearly present in the provided
  information, and never claim knowledge that is not in it.
"""


def _display_id(value) -> str:
    if value is None or value == "":
        return "?"
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)


def _display_date(value) -> str:
    if not value:
        return "unknown date"
    if isinstance(value, (int, float)):
        try:
            return datetime.fromtimestamp(value).strftime("%b %d, %Y at %I:%M %p")
        except (ValueError, OSError, OverflowError):
            return str(value)
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value).strftime("%b %d, %Y at %I:%M %p")
        except ValueError:
            return value
    return str(value)


def format_context(context: list[dict]) -> str:
    formatted = []

    for item in context:
        metadata = item.get("metadata", item)

        chunk = metadata.get("chunk_text", "")
        doc_type = metadata.get("type", "unknown")

        if not chunk:
            continue

        if doc_type == "message":
            sender_first = metadata.get("sender_first_name", "")
            sender_last = metadata.get("sender_last_name", "")
            sender = f"{sender_first} {sender_last}".strip() or "unknown sender"
            channel = metadata.get("channel_name") or f"channel {_display_id(metadata.get('channel_id'))}"
            sent_at = _display_date(metadata.get("sent_at"))
            message_id = _display_id(metadata.get("message_id"))
            header = f"[message #{message_id} in #{channel} by {sender} on {sent_at}]"

        elif doc_type == "task":
            task_id = _display_id(metadata.get("task_id"))
            team_id = _display_id(metadata.get("team_id"))
            title = metadata.get("title")
            if title:
                header = f'[task #{task_id} "{title}" in team {team_id}]'
            else:
                header = f"[task #{task_id} in team {team_id}]"

        elif doc_type == "document":
            document_id = _display_id(metadata.get("document_id"))
            file_name = metadata.get("file_name")
            if file_name:
                header = f'[document #{document_id} "{file_name}"]'
            else:
                header = f"[document #{document_id}]"

        else:
            header = f"[{doc_type}]"

        formatted.append(f"- {header} {chunk}")

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