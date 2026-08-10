from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

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
def chat(request: ChatRequest):

    return chat_with_ai(
        question=request.question,
        conversation_id=request.conversation_id,
        video_ids=request.video_ids,
    )


@router.post("/stream")
def chat_stream(request: ChatRequest):

    stream, conversation_id = chat_with_ai_stream(
        question=request.question,
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
def summary(request: SummaryRequest):

    return summary_with_ai(
        video_ids=request.video_ids
    )


@router.post("/notes")
def notes(request: NotesRequest):

    return notes_with_ai(
        video_ids=request.video_ids
    )


@router.post("/quiz")
def quiz(request: QuizRequest):

    return quiz_with_ai(
        difficulty=request.difficulty,
        questions=request.questions,
        video_ids=request.video_ids,
    )