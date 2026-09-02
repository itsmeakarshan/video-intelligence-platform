from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ChatRequestDto(BaseModel):
    question: str = Field(..., min_length=1)
    conversation_id: Optional[str] = None
    video_ids: Optional[List[int]] = None
    course_id: Optional[int] = None


class SummaryRequestDto(BaseModel):
    video_ids: Optional[List[int]] = None


class NotesRequestDto(BaseModel):
    video_ids: Optional[List[int]] = None


class QuizRequestDto(BaseModel):
    video_ids: Optional[List[int]] = None
    course_id: Optional[int] = None
    difficulty: str = "Medium"
    questions: int = 10


class SourceDto(BaseModel):
    video_id: Optional[int] = None
    video_title: Optional[str] = None
    chunk_id: Optional[int] = None
    start_time: float = 0.0
    end_time: float = 0.0


class ChatResponseDto(BaseModel):
    answer: str
    sources: List[SourceDto] = Field(default_factory=list)
    conversation_id: Optional[str] = None


class ChatMessageItemDto(BaseModel):
    id: str
    role: str
    text: str
    created_at: datetime


class CourseConversationResponseDto(BaseModel):
    conversation_id: Optional[str] = None
    course_id: int
    messages: List[ChatMessageItemDto] = Field(default_factory=list)


class GeminiApiKeyUpdateDto(BaseModel):
    api_key: str = Field(..., min_length=1)


class GeminiApiKeyTestDto(BaseModel):
    api_key: Optional[str] = None


class GeminiApiKeyStatusDto(BaseModel):
    configured: bool
    masked_key: str
    model: str


class GeminiApiKeyTestResultDto(BaseModel):
    success: bool
    message: str
    model: Optional[str] = None
