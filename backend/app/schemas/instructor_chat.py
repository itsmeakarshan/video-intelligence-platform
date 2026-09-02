from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class InstructorChatChannelDto(BaseModel):
    id: int
    course_id: int
    course_title: str
    student_id: int
    student_name: str
    student_email: str = ""
    instructor_id: Optional[int] = None
    instructor_name: Optional[str] = "Instructor"
    title: str = "Course Q&A & Doubts"
    last_message: Optional[str] = "No messages yet"
    last_message_type: Optional[str] = "text"
    last_message_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InstructorChatMessageDto(BaseModel):
    id: int
    channel_id: int
    sender_id: int
    sender_name: str
    sender_role: str = "student"
    text: str = ""
    message_type: str = "text"
    media_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    extra_data: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CreateChannelRequest(BaseModel):
    course_id: int
    student_id: Optional[int] = None
    title: Optional[str] = None


class SendMessageRequest(BaseModel):
    text: Optional[str] = ""
    message_type: Optional[str] = "text"
    media_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    extra_data: Optional[str] = None
