import re
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.services.memory_service import (
    add_message,
    get_history,
    get_or_create_conversation,
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


def _owned_video_ids(db: Session, user_id: int, video_ids: list[int] | None) -> list[int] | None:
    if not video_ids:
        return None
    from app.models.video import Video
    clean_ids = list({int(video_id) for video_id in video_ids})
    owned = db.query(Video.id).filter(Video.user_id == user_id, Video.id.in_(clean_ids)).all()
    if len(owned) != len(clean_ids):
        raise HTTPException(status_code=404, detail="Video not found.")
    return clean_ids


def chat_with_ai(
    question: str,
    db: Session,
    user_id: int,
    conversation_id: str | None = None,
    video_ids: list[int] | None = None
):

    conversation = get_or_create_conversation(db, user_id, conversation_id)
    conversation_id = conversation.id
    video_ids = _owned_video_ids(db, user_id, video_ids)

    history = get_history(
        db, conversation_id, user_id
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
            user_id=user_id,
            video_ids=video_ids
        )

    add_message(
        db, conversation_id, user_id,
        "User",
        question
    )

    add_message(
        db, conversation_id, user_id,
        "Assistant",
        response["answer"]
    )

    response["conversation_id"] = conversation_id

    return response


def chat_with_ai_stream(
    question: str,
    db: Session,
    user_id: int,
    conversation_id: str | None = None,
    video_ids: list[int] | None = None
):

    conversation = get_or_create_conversation(db, user_id, conversation_id)
    conversation_id = conversation.id
    video_ids = _owned_video_ids(db, user_id, video_ids)

    history = get_history(
        db, conversation_id, user_id
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
            user_id=user_id,
            video_ids=video_ids
        )

    answer = []

    def event_stream():

        nonlocal answer

        for chunk in stream:

            answer.append(chunk)
            yield chunk

        add_message(
            db, conversation_id, user_id,
            "User",
            question
        )

        add_message(
            db, conversation_id, user_id,
            "Assistant",
            "".join(answer)
        )

    return event_stream(), conversation_id


def summary_with_ai(
    db: Session,
    user_id: int,
    video_ids: list[int] | None = None
):

    return generate_summary(user_id, _owned_video_ids(db, user_id, video_ids))


def notes_with_ai(
    db: Session,
    user_id: int,
    video_ids: list[int] | None = None
):

    return generate_notes(user_id, _owned_video_ids(db, user_id, video_ids))


def quiz_with_ai(
    db: Session,
    user_id: int,
    difficulty: str = "Medium",
    questions: int = 10,
    video_ids: list[int] | None = None
):

    return generate_quiz(
        user_id=user_id,
        difficulty=difficulty,
        questions=questions,
        video_ids=_owned_video_ids(db, user_id, video_ids)
    )
