from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.video import Video
from app.models.transcript import Transcript
from app.services.whisper_service import transcribe_video

router = APIRouter(
    prefix="/transcripts",
    tags=["Transcripts"]
)


@router.post("/{video_id}")
def create_transcript(
    video_id: int,
    db: Session = Depends(get_db)
):

    video = db.query(Video).filter(
        Video.id == video_id
    ).first()

    if not video:
        raise HTTPException(
            status_code=404,
            detail="Video not found."
        )

    result = transcribe_video(
        video.file_path
    )

    transcript = Transcript(
        video_id=video.id,
        language=result["language"],
        transcript=result["transcript"]
    )

    db.add(transcript)
    db.commit()
    db.refresh(transcript)

    return {
        "video_id": video.id,
        "language": transcript.language,
        "transcript": transcript.transcript
    }
