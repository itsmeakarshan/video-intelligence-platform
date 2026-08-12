from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.video import Video
from app.services.auth_service import decode_access_token
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return save_video(
        file,
        db, current_user.id
    )


@router.get(
    "",
    response_model=list[VideoResponse]
)
@router.get(
    "/",
    response_model=list[VideoResponse]
)
def list_videos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_all_videos(db, current_user.id)


@router.get("/{video_id}/file")
def get_video_file(video_id: int, access_token: str | None = Query(default=None), db: Session = Depends(get_db)):
    # Native video elements cannot set Authorization headers. A short-lived JWT
    # can therefore be supplied in the query string for this media-only endpoint.
    user_id = decode_access_token(access_token) if access_token else None
    current_user = db.get(User, user_id) if user_id is not None else None
    if current_user is None:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    video = db.query(Video).filter(Video.id == video_id, Video.user_id == current_user.id).first()
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found.")
    return FileResponse(video.file_path, filename=video.original_filename)


@router.delete(
    "/{video_id}"
)
def remove_video(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return delete_video(
        video_id,
        db, current_user.id
    )
