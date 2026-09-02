import os
import mimetypes
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.video import Video
from app.schemas.video import VideoResponseDto
from app.services import video_service
from app.services.auth_service import (
    get_current_user,
    get_current_user_optional,
    require_admin,
    decode_access_token,
)

router = APIRouter(prefix="/videos", tags=["Videos"])


@router.post("/upload", response_model=VideoResponseDto, status_code=status.HTTP_201_CREATED)
async def upload_video(
    file: UploadFile = File(...),
    course_id: Optional[int] = Form(None),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    video = await video_service.save_uploaded_file_async(
        file=file,
        db=db,
        user_id=admin_user.id,
        course_id=course_id,
    )
    return VideoResponseDto(
        id=video.id,
        course_id=video.course_id,
        order_index=video.order_index,
        title=video.title or video.original_filename or video.filename,
        filename=video.filename,
        original_filename=video.original_filename,
        file_path=video.file_path,
        file_size=video.file_size,
        status=video.status,
        progress=video.progress,
        current_step=video.current_step,
        created_at=video.created_at,
    )


@router.get("", response_model=List[VideoResponseDto])
def list_videos(
    course_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Video)
    if course_id is not None:
        query = query.filter(Video.course_id == course_id)
    videos = query.order_by(Video.order_index.asc(), Video.created_at.asc()).all()

    return [
        VideoResponseDto(
            id=v.id,
            course_id=v.course_id,
            order_index=v.order_index,
            title=v.title or v.original_filename or v.filename,
            filename=v.filename,
            original_filename=v.original_filename,
            file_path=v.file_path,
            file_size=v.file_size,
            status=v.status,
            progress=v.progress,
            current_step=v.current_step,
            created_at=v.created_at,
        )
        for v in videos
    ]


def _stream_video_range(file_path: str, request: Request) -> StreamingResponse:
    file_size = os.path.getsize(file_path)
    mime_type, _ = mimetypes.guess_type(file_path)
    if not mime_type:
        mime_type = "video/mp4"

    range_header = request.headers.get("range")
    if not range_header:
        def full_iter():
            with open(file_path, "rb") as f:
                while chunk := f.read(1024 * 1024):
                    yield chunk

        return StreamingResponse(
            full_iter(),
            status_code=200,
            headers={
                "Accept-Ranges": "bytes",
                "Content-Length": str(file_size),
                "Content-Type": mime_type,
            },
        )

    # Parse Range: bytes=start-end
    range_match = range_header.replace("bytes=", "").split("-")
    start = int(range_match[0]) if range_match[0] else 0
    end = int(range_match[1]) if len(range_match) > 1 and range_match[1] else file_size - 1
    end = min(end, file_size - 1)
    chunk_length = end - start + 1

    def range_iter():
        with open(file_path, "rb") as f:
            f.seek(start)
            remaining = chunk_length
            while remaining > 0:
                read_size = min(remaining, 1024 * 512)
                data = f.read(read_size)
                if not data:
                    break
                remaining -= len(data)
                yield data

    return StreamingResponse(
        range_iter(),
        status_code=206,
        headers={
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(chunk_length),
            "Content-Type": mime_type,
        },
    )


@router.get("/{video_id}/file")
@router.get("/{video_id}/stream")
def stream_video(
    video_id: int,
    request: Request,
    access_token: Optional[str] = None,
    db: Session = Depends(get_db),
):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video or not video.file_path or not os.path.isfile(video.file_path):
        raise HTTPException(status_code=404, detail="Video file not found.")

    return _stream_video_range(video.file_path, request)


@router.get("/{video_id}/thumbnail")
async def get_video_thumbnail(
    video_id: int,
    db: Session = Depends(get_db),
):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video or not video.file_path or not os.path.isfile(video.file_path):
        raise HTTPException(status_code=404, detail="Video not found.")

    thumb_dir = Path(settings.THUMBNAILS_FOLDER)
    thumb_dir.mkdir(parents=True, exist_ok=True)
    thumb_path = thumb_dir / f"vid_{video.id}_thumb.jpg"

    if not thumb_path.is_file() or thumb_path.stat().st_size == 0:
        success = await video_service.generate_thumbnail_async(
            video.file_path, str(thumb_path), timestamp_sec=3.0
        )
        if not success:
            raise HTTPException(status_code=500, detail="Could not generate video thumbnail.")

    return FileResponse(str(thumb_path), media_type="image/jpeg")


@router.delete("/{video_id}")
def delete_video(
    video_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    success = video_service.delete_video(video_id, db)
    if not success:
        raise HTTPException(status_code=404, detail="Video not found.")
    return {"message": "Video deleted successfully."}
