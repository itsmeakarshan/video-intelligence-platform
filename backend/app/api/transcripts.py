from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.api.deps import get_current_user
from app.models.user import User

from app.models.video import Video
from app.models.transcript import Transcript
from app.models.transcript_segment import TranscriptSegment

router = APIRouter(
    prefix="/transcripts",
    tags=["Transcripts"]
)


@router.post("/{video_id}")
def create_transcript(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    video = (
        db.query(Video)
        .filter(Video.id == video_id, Video.user_id == current_user.id)
        .first()
    )

    if video is None:
        raise HTTPException(
            status_code=404,
            detail="Video not found."
        )

    existing = (
        db.query(Transcript)
        .filter(
            Transcript.video_id == video.id
        )
        .first()
    )

    if existing:
        return {
            "message": "Transcript already exists.",
            "status": "completed"
        }

    # Already waiting or processing
    if video.status == "queued":
        return {
            "message": "Video is already in queue.",
            "status": "queued"
        }

    if video.status == "processing":
        return {
            "message": "Video is already processing.",
            "status": "processing"
        }

    if video.status == "completed":
        return {
            "message": "Video already processed.",
            "status": "completed"
        }

    # Queue the video
    video.status = "queued"
    video.progress = 0
    video.current_step = "Waiting in queue..."

    db.commit()

    return {
        "message": "Video added to processing queue.",
        "status": "queued"
    }


@router.get("/{video_id}")
def get_transcript(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    video = db.query(Video).filter(Video.id == video_id, Video.user_id == current_user.id).first()
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found.")
    transcript = (
        db.query(Transcript)
        .filter(
            Transcript.video_id == video_id
        )
        .first()
    )

    if transcript is None:
        raise HTTPException(
            status_code=404,
            detail="Transcript not found."
        )

    return transcript


@router.get("/{video_id}/segments")
def get_segments(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    video = db.query(Video).filter(Video.id == video_id, Video.user_id == current_user.id).first()
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found.")
    transcript = (
        db.query(Transcript)
        .filter(
            Transcript.video_id == video_id
        )
        .first()
    )

    if transcript is None:
        raise HTTPException(
            status_code=404,
            detail="Transcript not found."
        )

    return (
        db.query(TranscriptSegment)
        .filter(
            TranscriptSegment.transcript_id == transcript.id
        )
        .order_by(
            TranscriptSegment.segment_index
        )
        .all()
    )
