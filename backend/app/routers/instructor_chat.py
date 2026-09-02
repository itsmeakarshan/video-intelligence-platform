import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.course import Course
from app.models.instructor_chat import InstructorChatChannel, InstructorChatMessage
from app.models.user import User
from app.schemas.instructor_chat import (
    InstructorChatChannelDto,
    InstructorChatMessageDto,
    CreateChannelRequest,
    SendMessageRequest,
)
from app.services.auth_service import get_current_user
from app.routers.videos import _stream_video_range

router = APIRouter(prefix="/instructor-chat", tags=["Instructor Chat & Doubts"])


@router.get("/channels", response_model=List[InstructorChatChannelDto])
def list_channels(
    course_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(InstructorChatChannel)

    if current_user.role == "admin":
        if course_id is not None:
            query = query.filter(InstructorChatChannel.course_id == course_id)
    else:
        query = query.filter(InstructorChatChannel.student_id == current_user.id)
        if course_id is not None:
            query = query.filter(InstructorChatChannel.course_id == course_id)

    channels = query.order_by(InstructorChatChannel.updated_at.desc()).all()
    results = []

    for ch in channels:
        course = db.query(Course).filter(Course.id == ch.course_id).first()
        student = db.query(User).filter(User.id == ch.student_id).first()
        instructor = db.query(User).filter(User.id == ch.instructor_id).first() if ch.instructor_id else None

        last_msg = (
            db.query(InstructorChatMessage)
            .filter(InstructorChatMessage.channel_id == ch.id)
            .order_by(InstructorChatMessage.created_at.desc())
            .first()
        )

        results.append(
            InstructorChatChannelDto(
                id=ch.id,
                course_id=ch.course_id,
                course_title=course.title if course else f"Course #{ch.course_id}",
                student_id=ch.student_id,
                student_name=student.name if student else "Student",
                student_email=student.email if student else "",
                instructor_id=ch.instructor_id,
                instructor_name=instructor.name if instructor else "Instructor",
                title=ch.title,
                last_message=last_msg.text if last_msg else "No messages yet",
                last_message_type=last_msg.message_type if last_msg else "text",
                last_message_at=last_msg.created_at if last_msg else ch.created_at,
                created_at=ch.created_at,
                updated_at=ch.updated_at,
            )
        )

    return results


@router.post("/channels", response_model=InstructorChatChannelDto)
def get_or_create_channel(
    req: CreateChannelRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == req.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    student_id = req.student_id if (current_user.role == "admin" and req.student_id) else current_user.id
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    channel = (
        db.query(InstructorChatChannel)
        .filter(
            InstructorChatChannel.course_id == req.course_id,
            InstructorChatChannel.student_id == student_id,
        )
        .first()
    )

    if not channel:
        instructor = db.query(User).filter(User.id == course.user_id).first() if course.user_id else None
        if not instructor:
            instructor = db.query(User).filter(User.role == "admin").first()

        channel = InstructorChatChannel(
            course_id=req.course_id,
            student_id=student_id,
            instructor_id=instructor.id if instructor else None,
            title=req.title or f"Course Q&A: {course.title}",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(channel)
        db.commit()
        db.refresh(channel)

    instructor = db.query(User).filter(User.id == channel.instructor_id).first() if channel.instructor_id else None

    return InstructorChatChannelDto(
        id=channel.id,
        course_id=channel.course_id,
        course_title=course.title,
        student_id=student.id,
        student_name=student.name,
        student_email=student.email,
        instructor_id=channel.instructor_id,
        instructor_name=instructor.name if instructor else "Instructor",
        title=channel.title,
        last_message="No messages yet",
        last_message_type="text",
        last_message_at=channel.created_at,
        created_at=channel.created_at,
        updated_at=channel.updated_at,
    )


@router.get("/channels/{channel_id}/messages", response_model=List[InstructorChatMessageDto])
def get_channel_messages(
    channel_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    channel = db.query(InstructorChatChannel).filter(InstructorChatChannel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found.")

    if current_user.role != "admin" and channel.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    messages = (
        db.query(InstructorChatMessage)
        .filter(InstructorChatMessage.channel_id == channel_id)
        .order_by(InstructorChatMessage.created_at.asc())
        .all()
    )

    results = []
    for m in messages:
        sender = db.query(User).filter(User.id == m.sender_id).first()
        results.append(
            InstructorChatMessageDto(
                id=m.id,
                channel_id=m.channel_id,
                sender_id=m.sender_id,
                sender_name=sender.name if sender else "User",
                sender_role=m.sender_role,
                text=m.text or "",
                message_type=m.message_type or "text",
                media_url=m.media_url,
                file_name=m.file_name,
                file_size=m.file_size,
                extra_data=m.extra_data,
                created_at=m.created_at,
            )
        )

    return results


@router.post("/channels/{channel_id}/messages", response_model=InstructorChatMessageDto)
def send_channel_message(
    channel_id: int,
    req: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    channel = db.query(InstructorChatChannel).filter(InstructorChatChannel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found.")

    if current_user.role != "admin" and channel.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    msg = InstructorChatMessage(
        channel_id=channel_id,
        sender_id=current_user.id,
        sender_role=current_user.role,
        text=req.text or "",
        message_type=req.message_type or "text",
        media_url=req.media_url,
        file_name=req.file_name,
        file_size=req.file_size,
        extra_data=req.extra_data,
        created_at=datetime.utcnow(),
    )
    db.add(msg)
    channel.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(msg)

    return InstructorChatMessageDto(
        id=msg.id,
        channel_id=msg.channel_id,
        sender_id=msg.sender_id,
        sender_name=current_user.name,
        sender_role=msg.sender_role,
        text=msg.text,
        message_type=msg.message_type,
        media_url=msg.media_url,
        file_name=msg.file_name,
        file_size=msg.file_size,
        extra_data=msg.extra_data,
        created_at=msg.created_at,
    )


@router.post("/channels/{channel_id}/upload", response_model=InstructorChatMessageDto)
async def upload_channel_media(
    channel_id: int,
    file: UploadFile = File(...),
    message_type: str = Form("file"),
    text: Optional[str] = Form(""),
    extra_data: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    channel = db.query(InstructorChatChannel).filter(InstructorChatChannel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found.")

    if current_user.role != "admin" and channel.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    media_dir = Path(settings.CHAT_MEDIA_FOLDER)
    media_dir.mkdir(parents=True, exist_ok=True)

    orig_name = file.filename or "file.bin"
    ext = Path(orig_name).suffix
    unique_name = f"{uuid.uuid4().hex[:12]}{ext}"
    dest = media_dir / unique_name

    file_size = 0
    with open(dest, "wb") as f:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            f.write(chunk)
            file_size += len(chunk)

    media_url = f"/instructor-chat/media/{unique_name}"

    msg = InstructorChatMessage(
        channel_id=channel_id,
        sender_id=current_user.id,
        sender_role=current_user.role,
        text=text or orig_name,
        message_type=message_type,
        media_url=media_url,
        file_name=orig_name,
        file_size=file_size,
        extra_data=extra_data,
        created_at=datetime.utcnow(),
    )
    db.add(msg)
    channel.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(msg)

    return InstructorChatMessageDto(
        id=msg.id,
        channel_id=msg.channel_id,
        sender_id=msg.sender_id,
        sender_name=current_user.name,
        sender_role=msg.sender_role,
        text=msg.text,
        message_type=msg.message_type,
        media_url=msg.media_url,
        file_name=msg.file_name,
        file_size=msg.file_size,
        extra_data=msg.extra_data,
        created_at=msg.created_at,
    )


@router.get("/media/{file_name}")
@router.head("/media/{file_name}")
def get_channel_media(file_name: str, request: Request):
    clean_name = os.path.basename(file_name)
    dest = Path(settings.CHAT_MEDIA_FOLDER) / clean_name
    if not dest.is_file():
        raise HTTPException(status_code=404, detail="Media file not found.")

    return _stream_video_range(str(dest), request)


@router.delete("/messages/{message_id}")
def delete_channel_message(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    msg = db.query(InstructorChatMessage).filter(InstructorChatMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")

    if current_user.role != "admin" and msg.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    if msg.media_url and "/media/" in msg.media_url:
        f_name = os.path.basename(msg.media_url)
        dest = Path(settings.CHAT_MEDIA_FOLDER) / f_name
        if dest.is_file():
            try:
                os.remove(dest)
            except Exception:
                pass

    db.delete(msg)
    db.commit()
    return {"message": "Message deleted."}
