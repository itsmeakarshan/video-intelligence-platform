import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.conversation import Conversation, Message

MAX_HISTORY = 20


def get_or_create_conversation(db: Session, user_id: int, conversation_id: str | None) -> Conversation:
    if conversation_id:
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id, Conversation.user_id == user_id
        ).first()
        if conversation is None:
            raise HTTPException(status_code=404, detail="Conversation not found.")
        return conversation

    conversation = Conversation(id=str(uuid.uuid4()), user_id=user_id)
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


def get_history(db: Session, conversation_id: str, user_id: int) -> list[dict]:
    messages = db.query(Message).join(Conversation).filter(
        Message.conversation_id == conversation_id, Conversation.user_id == user_id
    ).order_by(Message.created_at.desc(), Message.id.desc()).limit(MAX_HISTORY).all()
    return [{"role": message.role, "text": message.text} for message in reversed(messages)]


def add_message(db: Session, conversation_id: str, user_id: int, role: str, text: str) -> None:
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id, Conversation.user_id == user_id
    ).first()
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    db.add(Message(conversation_id=conversation_id, role=role, text=text))
    db.commit()
