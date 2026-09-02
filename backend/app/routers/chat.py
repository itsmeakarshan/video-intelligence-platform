import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.user import User
from app.schemas.chat import (
    ChatRequestDto,
    ChatResponseDto,
    SummaryRequestDto,
    NotesRequestDto,
    QuizRequestDto,
    CourseConversationResponseDto,
    ChatMessageItemDto,
    GeminiApiKeyStatusDto,
    GeminiApiKeyUpdateDto,
    GeminiApiKeyTestDto,
    GeminiApiKeyTestResultDto,
)
from app.services import ai_service, gemini_service, memory_service
from app.services.auth_service import get_current_user, require_admin

router = APIRouter(prefix="/chat", tags=["AI Chat & Study Tools"])


@router.post("", response_model=ChatResponseDto)
async def chat_endpoint(
    dto: ChatRequestDto,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        response = await ai_service.chat_with_ai_async(
            question=dto.question,
            user_id=current_user.id,
            conversation_id=dto.conversation_id,
            video_ids=dto.video_ids,
            course_id=dto.course_id,
            db=db,
        )
        return response
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"AI chat error: {ex}")


@router.post("/stream")
async def chat_stream_endpoint(
    dto: ChatRequestDto,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conv = memory_service.get_or_create_conversation(
        user_id=current_user.id,
        conversation_id=dto.conversation_id,
        course_id=dto.course_id,
        db=db,
    )
    conv_id = conv.id

    async def stream_generator():
        async for chunk in ai_service.chat_with_ai_stream_async(
            question=dto.question,
            user_id=current_user.id,
            conversation_id=conv_id,
            video_ids=dto.video_ids,
            course_id=dto.course_id,
            db=db,
        ):
            yield chunk

    return StreamingResponse(
        stream_generator(),
        media_type="text/plain; charset=utf-8",
        headers={
            "x-conversation-id": conv_id,
            "Access-Control-Expose-Headers": "x-conversation-id",
        },
    )


@router.get("/course/{course_id}", response_model=CourseConversationResponseDto)
def get_course_chat_history(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conv = memory_service.get_course_conversation(current_user.id, course_id, db)
    if not conv:
        return CourseConversationResponseDto(
            conversation_id=None,
            course_id=course_id,
            messages=[],
        )

    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .order_by(Message.created_at.asc())
        .all()
    )

    return CourseConversationResponseDto(
        conversation_id=conv.id,
        course_id=course_id,
        messages=[
            ChatMessageItemDto(
                id=str(m.id),
                role=m.role.lower(),
                text=m.text or "",
                created_at=m.created_at,
            )
            for m in messages
        ],
    )


@router.delete("/course/{course_id}")
def clear_course_chat_history(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    memory_service.delete_course_conversation(current_user.id, course_id, db)
    return {"message": "Chat history cleared successfully.", "course_id": course_id}


@router.post("/summary", response_model=ChatResponseDto)
async def generate_summary(
    dto: SummaryRequestDto,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return await ai_service.summary_with_ai_async(current_user.id, dto.video_ids, db)
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Summary error: {ex}")


@router.post("/notes", response_model=ChatResponseDto)
async def generate_notes(
    dto: NotesRequestDto,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return await ai_service.notes_with_ai_async(current_user.id, dto.video_ids, db)
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Notes error: {ex}")


@router.post("/quiz", response_model=ChatResponseDto)
async def generate_quiz(
    dto: QuizRequestDto,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return await ai_service.quiz_with_ai_async(
            user_id=current_user.id,
            difficulty=dto.difficulty,
            questions=dto.questions,
            video_ids=dto.video_ids,
            course_id=dto.course_id,
            db=db,
        )
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Quiz error: {ex}")


@router.get("/api-key", response_model=GeminiApiKeyStatusDto)
def get_api_key_status(current_user: User = Depends(get_current_user)):
    key = gemini_service.get_active_api_key()
    return GeminiApiKeyStatusDto(
        configured=bool(key and len(key) > 5),
        masked_key=gemini_service.get_masked_api_key(),
        model=settings.GEMINI_MODEL,
    )


@router.post("/api-key", response_model=GeminiApiKeyStatusDto)
def set_api_key(
    dto: GeminiApiKeyUpdateDto,
    current_user: User = Depends(get_current_user),
):
    success = gemini_service.update_api_key(dto.api_key)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to save Gemini API key.")

    return GeminiApiKeyStatusDto(
        configured=True,
        masked_key=gemini_service.get_masked_api_key(),
        model=settings.GEMINI_MODEL,
    )


@router.post("/api-key/test", response_model=GeminiApiKeyTestResultDto)
async def test_api_key(
    dto: Optional[GeminiApiKeyTestDto] = None,
    current_user: User = Depends(get_current_user),
):
    test_k = dto.api_key if dto else None
    success, msg, model = await gemini_service.test_api_key_async(test_k)
    return GeminiApiKeyTestResultDto(
        success=success,
        message=msg,
        model=model or settings.GEMINI_MODEL,
    )


@router.delete("/api-key")
def remove_api_key(admin_user: User = Depends(require_admin)):
    gemini_service.remove_api_key()
    return {"message": "Gemini API key removed."}
