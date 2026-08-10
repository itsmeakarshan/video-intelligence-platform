import re
import uuid

from app.services.memory_service import (
    add_message,
    get_history,
)

from app.services.query_rewriter_service import (
    rewrite_question,
)

from app.services.rag_service import (
    ask_video,
    ask_video_stream,
    generate_summary,
    generate_notes,
    generate_quiz,
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

        rewritten_question = rewrite_question(
            question=question,
            history=history
        )

        print("=" * 60)
        print("QUERY REWRITER")
        print("=" * 60)
        print(f"Original : {question}")
        print(f"Rewritten: {rewritten_question}")
        print("=" * 60)

        response = ask_video(
            question=rewritten_question,
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

    if is_general_chat(question):

        stream = ask_gemini_stream(
            question=question,
            context=""
        )

    else:

        rewritten_question = rewrite_question(
            question=question,
            history=history
        )

        print("=" * 60)
        print("QUERY REWRITER")
        print("=" * 60)
        print(f"Original : {question}")
        print(f"Rewritten: {rewritten_question}")
        print("=" * 60)

        stream = ask_video_stream(
            question=rewritten_question,
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


def summary_with_ai(
    video_ids: list[int] | None = None
):

    return generate_summary(
        video_ids
    )


def notes_with_ai(
    video_ids: list[int] | None = None
):

    return generate_notes(
        video_ids
    )


def quiz_with_ai(
    difficulty: str = "Medium",
    questions: int = 10,
    video_ids: list[int] | None = None
):

    return generate_quiz(
        difficulty=difficulty,
        questions=questions,
        video_ids=video_ids
    )