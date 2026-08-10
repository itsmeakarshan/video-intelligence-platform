from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.user import User

from app.services.ai_service import (
    chat_with_ai,
    chat_with_ai_stream,
    summary_with_ai,
    notes_with_ai,
    quiz_with_ai,
)

router = APIRouter(
    prefix="/chat",
    tags=["AI Chat"],
)


class ChatRequest(BaseModel):
    question: str
    conversation_id: str | None = None
    video_ids: list[int] | None = None


class SummaryRequest(BaseModel):
    video_ids: list[int] | None = None


class NotesRequest(BaseModel):
    video_ids: list[int] | None = None


class QuizRequest(BaseModel):
    video_ids: list[int] | None = None
    difficulty: str = "Medium"
    questions: int = 10


@router.post("")
def chat(request: ChatRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):

    return chat_with_ai(
        question=request.question,
        db=db,
        user_id=current_user.id,
        conversation_id=request.conversation_id,
        video_ids=request.video_ids,
    )


@router.post("/stream")
def chat_stream(request: ChatRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):

    stream, conversation_id = chat_with_ai_stream(
        question=request.question,
        db=db,
        user_id=current_user.id,
        conversation_id=request.conversation_id,
        video_ids=request.video_ids,
    )

    return StreamingResponse(
        stream,
        media_type="text/plain",
        headers={
            "x-conversation-id": conversation_id
        },
    )


@router.post("/summary")
def summary(request: SummaryRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):

    return summary_with_ai(
        db=db, user_id=current_user.id, video_ids=request.video_ids
    )


@router.post("/notes")
def notes(request: NotesRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):

    return notes_with_ai(
        db=db, user_id=current_user.id, video_ids=request.video_ids
    )


@router.post("/quiz")
def quiz(request: QuizRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):

    return quiz_with_ai(
        db=db, user_id=current_user.id, difficulty=request.difficulty,
        questions=request.questions,
        video_ids=request.video_ids,
    )
