from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.video import VideoResponse
from app.services.video_service import (
    save_video,
    get_all_videos,
    delete_video
)

router = APIRouter(
    prefix="/videos",
    tags=["Videos"]
)


@router.post(
    "/upload",
    response_model=VideoResponse
)
def upload_video(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    return save_video(
        file,
        db
    )


@router.get(
    "/",
    response_model=list[VideoResponse]
)
def list_videos(
    db: Session = Depends(get_db)
):
    return get_all_videos(db)


@router.delete(
    "/{video_id}"
)
def remove_video(
    video_id: int,
    db: Session = Depends(get_db)
):
    return delete_video(
        video_id,
        db
    )