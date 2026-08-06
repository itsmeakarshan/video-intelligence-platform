import re
import uuid

from app.services.memory_service import (
    add_message,
    get_history,
)

from app.services.rag_service import ask_video
from app.services.gemini_service import ask_gemini


GENERAL_PATTERNS = [

    r"\bhi\b",
    r"\bhello\b",
    r"\bhey\b",
    r"\bhiya\b",
    r"\bhow are you\b",
    r"\bwhat's up\b",
    r"\bwhats up\b",
    r"\bgood morning\b",
    r"\bgood afternoon\b",
    r"\bgood evening\b",
    r"\bthanks\b",
    r"\bthank you\b",
    r"\bbye\b",
    r"\bgoodbye\b",
    r"\bwho are you\b",
    r"\bwhat can you do\b",
    r"\bhelp\b",

]


def is_general_chat(question: str):

    question = question.lower().strip()

    return any(
        re.search(pattern, question)
        for pattern in GENERAL_PATTERNS
    )


def chat_with_ai(

    question: str,

    conversation_id: str | None = None

):

    if conversation_id is None:

        conversation_id = str(uuid.uuid4())

    history = get_history(
        conversation_id
    )

    history_text = ""

    for message in history:

        history_text += (

            f"{message['role']}: "

            f"{message['text']}\n"

        )

    if is_general_chat(question):

        answer = ask_gemini(

            question=question,

            context=""

        )

        response = {

            "answer": answer,

            "sources": []

        }

    else:

        enhanced_question = f"""

Conversation

{history_text}

User

{question}

"""

        response = ask_video(

            enhanced_question

        )

    add_message(

        conversation_id,

        "User",

        question

    )

    add_message(

        conversation_id,

        "Assistant",

        response["answer"]

    )

    response["conversation_id"] = conversation_id

    return response