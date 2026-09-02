import asyncio
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.video import (
    YouTubeDownloadRequestDto,
    YouTubeDownloadResponseDto,
)
from app.services import youtube_service
from app.services.auth_service import require_admin

router = APIRouter(prefix="/youtube", tags=["YouTube Downloads"])


@router.post("/download", response_model=YouTubeDownloadResponseDto, status_code=status.HTTP_201_CREATED)
async def download_youtube(
    dto: YouTubeDownloadRequestDto,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        video = await asyncio.to_thread(
            youtube_service.download_youtube_video,
            url=dto.url,
            db=db,
            quality=dto.quality or "720",
            course_id=dto.course_id,
            user_id=admin_user.id,
        )

        return YouTubeDownloadResponseDto(
            message="YouTube video downloaded and queued for processing.",
            video_id=video.id,
            filename=video.filename,
            original_filename=video.original_filename,
            file_path=video.file_path,
            file_size=video.file_size,
            status=video.status,
            progress=video.progress,
        )
    except Exception as ex:
        raise HTTPException(
            status_code=500, detail=f"Failed to download YouTube video: {str(ex)}"
        )
