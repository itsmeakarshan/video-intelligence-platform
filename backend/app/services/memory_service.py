import uuid
from datetime import datetime
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.conversation import Conversation
from app.models.message import Message


def get_or_create_conversation(
    user_id: int,
    conversation_id: Optional[str] = None,
    course_id: Optional[int] = None,
    db: Session = None,
) -> Conversation:
    if conversation_id:
        conv = (
            db.query(Conversation)
            .filter(Conversation.id == conversation_id, Conversation.user_id == user_id)
            .first()
        )
        if conv:
            if course_id and not conv.course_id:
                conv.course_id = course_id
                db.commit()
            return conv

    if course_id:
        conv = (
            db.query(Conversation)
            .filter(Conversation.user_id == user_id, Conversation.course_id == course_id)
            .order_by(Conversation.created_at.desc())
            .first()
        )
        if conv:
            return conv

    # Create new
    conv = Conversation(
        id=str(uuid.uuid4()),
        user_id=user_id,
        course_id=course_id,
        created_at=datetime.utcnow(),
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


def get_history(
    conversation_id: str,
    user_id: int,
    db: Session,
    max_messages: int = 10,
) -> List[Tuple[str, str]]:
    conv = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.user_id == user_id)
        .first()
    )
    if not conv:
        return []

    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(max_messages)
        .all()
    )

    # Return chronological
    return [(m.role, m.text) for m in reversed(messages)]


def add_message(
    conversation_id: str,
    user_id: int,
    role: str,
    text: str,
    db: Session,
) -> Message:
    conv = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.user_id == user_id)
        .first()
    )
    if not conv:
        conv = Conversation(
            id=conversation_id,
            user_id=user_id,
            created_at=datetime.utcnow(),
        )
        db.add(conv)
        db.commit()

    msg = Message(
        conversation_id=conversation_id,
        role=role,
        text=text,
        created_at=datetime.utcnow(),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def get_course_conversation(user_id: int, course_id: int, db: Session) -> Optional[Conversation]:
    return (
        db.query(Conversation)
        .filter(Conversation.user_id == user_id, Conversation.course_id == course_id)
        .order_by(Conversation.created_at.desc())
        .first()
    )


def delete_course_conversation(user_id: int, course_id: int, db: Session) -> bool:
    convs = (
        db.query(Conversation)
        .filter(Conversation.user_id == user_id, Conversation.course_id == course_id)
        .all()
    )
    for c in convs:
        db.delete(c)
    db.commit()
    return True
