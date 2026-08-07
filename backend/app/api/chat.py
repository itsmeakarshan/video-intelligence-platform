from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services.ai_service import (
    chat_with_ai,
    chat_with_ai_stream
)

router = APIRouter(
    prefix="/chat",
    tags=["AI Chat"]
)


class ChatRequest(BaseModel):

    question: str

    conversation_id: str | None = None

    video_ids: list[int] | None = None


@router.post("")
def chat(request: ChatRequest):

    return chat_with_ai(

        question=request.question,

        conversation_id=request.conversation_id,

        video_ids=request.video_ids

    )


@router.post("/stream")
def chat_stream(request: ChatRequest):

    stream, conversation_id = chat_with_ai_stream(

        question=request.question,

        conversation_id=request.conversation_id,

        video_ids=request.video_ids

    )

    return StreamingResponse(

        stream,

        media_type="text/plain",

        headers={

            "x-conversation-id": conversation_id

        }

    )