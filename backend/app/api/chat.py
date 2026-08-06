from fastapi import APIRouter
from pydantic import BaseModel

from app.services.ai_service import chat_with_ai

router = APIRouter(
    prefix="/chat",
    tags=["AI Chat"]
)


class ChatRequest(BaseModel):

    question: str

    conversation_id: str | None = None


@router.post("/")
def chat(request: ChatRequest):

    return chat_with_ai(

        question=request.question,

        conversation_id=request.conversation_id

    )