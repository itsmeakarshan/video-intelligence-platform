import os
import re
import uuid
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Optional
from fastapi import UploadFile
from sqlalchemy.orm import Session
from app.config import settings
from app.models.video import Video


def sanitize_filename(filename: str) -> str:
    if not filename:
        return f"video_{uuid.uuid4().hex[:8]}.mp4"
    clean = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', filename)
    clean = re.sub(r'_+', '_', clean).strip('_')
    return clean if clean else f"video_{uuid.uuid4().hex[:8]}.mp4"


async def save_uploaded_file_async(
    file: UploadFile,
    db: Session,
    user_id: Optional[int] = None,
    course_id: Optional[int] = None,
) -> Video:
    uploads_dir = Path(settings.UPLOAD_FOLDER)
    uploads_dir.mkdir(parents=True, exist_ok=True)

    orig_name = file.filename or "uploaded_video.mp4"
    safe_name = sanitize_filename(orig_name)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    unique_filename = f"{timestamp}_{uuid.uuid4().hex[:6]}_{safe_name}"
    dest_path = uploads_dir / unique_filename

    # Read and save in chunks
    file_size = 0
    with open(dest_path, "wb") as buffer:
        while True:
            chunk = await file.read(1024 * 1024)  # 1MB chunks
            if not chunk:
                break
            buffer.write(chunk)
            file_size += len(chunk)

    title = Path(orig_name).stem.replace("_", " ").replace("-", " ").strip()
    title = re.sub(r'\s+', ' ', title)

    order_index = 1
    if course_id:
        last_vid = (
            db.query(Video)
            .filter(Video.course_id == course_id)
            .order_by(Video.order_index.desc())
            .first()
        )
        if last_vid:
            order_index = (last_vid.order_index or 0) + 1

    video = Video(
        user_id=user_id,
        course_id=course_id,
        order_index=order_index,
        title=title if title else safe_name,
        filename=unique_filename,
        original_filename=orig_name,
        file_path=str(dest_path),
        file_size=file_size,
        status="queued",
        progress=0.0,
        current_step="Uploaded and queued for processing",
        created_at=datetime.utcnow(),
    )
    db.add(video)
    db.commit()
    db.refresh(video)
    return video


async def generate_thumbnail_async(video_path: str, output_path: str, timestamp_sec: float = 3.0) -> bool:
    try:
        cmd = [
            "ffmpeg",
            "-y",
            "-ss", str(timestamp_sec),
            "-i", video_path,
            "-vframes", "1",
            "-q:v", "2",
            output_path
        ]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        await proc.communicate()
        return os.path.isfile(output_path) and os.path.getsize(output_path) > 0
    except Exception:
        return False


def delete_video(video_id: int, db: Session) -> bool:
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        return False

    # Delete physical file if exists
    if video.file_path and os.path.isfile(video.file_path):
        try:
            os.remove(video.file_path)
        except Exception:
            pass

    db.delete(video)
    db.commit()
    return True
