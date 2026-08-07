import re
import uuid

from app.services.memory_service import (
    add_message,
    get_history,
)

from app.services.rag_service import (
    ask_video,
    ask_video_stream,
)

from app.services.gemini_service import (
    ask_gemini,
    ask_gemini_stream,
)


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


def build_prompt(

    question: str,

    history_text: str

):

    return f"""

Conversation

{history_text}

User

{question}

"""


def chat_with_ai(

    question: str,

    conversation_id: str | None = None,

    video_ids: list[int] | None = None

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

        response = ask_video(

            build_prompt(

                question,

                history_text

            ),

            video_ids=video_ids

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


def chat_with_ai_stream(

    question: str,

    conversation_id: str | None = None,

    video_ids: list[int] | None = None

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

        stream = ask_gemini_stream(

            question=question,

            context=""

        )

    else:

        stream = ask_video_stream(

            build_prompt(

                question,

                history_text

            ),

            video_ids=video_ids

        )

    answer = []

    def event_stream():

        nonlocal answer

        for chunk in stream:

            answer.append(chunk)

            yield chunk

        add_message(

            conversation_id,

            "User",

            question

        )

        add_message(

            conversation_id,

            "Assistant",

            "".join(answer)

        )

    return event_stream(), conversation_id