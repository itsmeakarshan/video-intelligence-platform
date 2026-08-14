from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.api.deps import get_current_user
from app.models.user import User

from app.services.youtube_downloader import download_youtube_video
from app.services.video_service import save_downloaded_video

router = APIRouter(prefix="/youtube", tags=["YouTube"])


class YouTubeDownloadRequest(BaseModel):
    url: str
    quality: str = "720"


@router.post("/download")
def download_video(
    request: YouTubeDownloadRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    url = request.url.strip()

    if not url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="YouTube URL is required."
        )

    if "youtube.com/" not in url and "youtu.be/" not in url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a valid YouTube URL."
        )

    allowed_qualities = {"360", "480", "720", "1080"}
    if request.quality not in allowed_qualities:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid video quality selected."
        )

    try:
        file_path = download_youtube_video(
            url=url,
            quality=request.quality
        )

        original_filename = Path(file_path).name

        video = save_downloaded_video(
            filepath=file_path,
            original_filename=original_filename,
            db=db,
            user_id=current_user.id,
        )

        return {
            "message": "YouTube video downloaded and added successfully.",
            "video_id": video.id,
            "filename": video.filename,
            "original_filename": video.original_filename,
            "file_path": video.file_path,
            "file_size": video.file_size,
            "status": video.status,
            "progress": video.progress
        }

    except HTTPException:
        raise

    except RuntimeError as error:
        db.rollback()
        err_msg = str(error)
        if "HTTP 403" in err_msg or "blocked" in err_msg:
            status_code = status.HTTP_502_BAD_GATEWAY
        elif "private" in err_msg or "unavailable" in err_msg or "age-restricted" in err_msg:
            status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        else:
            status_code = status.HTTP_400_BAD_REQUEST

        raise HTTPException(
            status_code=status_code,
            detail=err_msg
        ) from error

    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected failure while processing YouTube download: {error}"
        ) from error
