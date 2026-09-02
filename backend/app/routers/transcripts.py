from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.transcript import Transcript, TranscriptSegment
from app.models.user import User
from app.models.video import Video
from app.schemas.transcript import TranscriptResponseDto, TranscriptSegmentDto
from app.services.auth_service import require_admin

router = APIRouter(prefix="/transcripts", tags=["Transcripts"])


@router.post("/{video_id}", status_code=status.HTTP_202_ACCEPTED)
def trigger_transcription(
    video_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found.")

    video.status = "queued"
    video.progress = 0.0
    video.current_step = "Queued for re-transcription"
    db.commit()

    return {"message": "Video queued for transcription.", "video_id": video.id}


@router.get("/{video_id}", response_model=TranscriptResponseDto)
def get_transcript(video_id: int, db: Session = Depends(get_db)):
    transcript = db.query(Transcript).filter(Transcript.video_id == video_id).first()
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found for this video.")

    return TranscriptResponseDto(
        id=transcript.id,
        video_id=transcript.video_id,
        language=transcript.language or "en",
        transcript=transcript.transcript or "",
        created_at=getattr(transcript, "created_at", None) or db.query(Video).filter(Video.id == video_id).first().created_at,
    )


@router.get("/{video_id}/segments", response_model=List[TranscriptSegmentDto])
def get_transcript_segments(video_id: int, db: Session = Depends(get_db)):
    transcript = db.query(Transcript).filter(Transcript.video_id == video_id).first()
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found for this video.")

    segments = (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.transcript_id == transcript.id)
        .order_by(TranscriptSegment.segment_index.asc())
        .all()
    )

    return [
        TranscriptSegmentDto(
            id=s.id,
            transcript_id=s.transcript_id,
            segment_index=s.segment_index,
            start_time=s.start_time,
            end_time=s.end_time,
            text=s.text or "",
            created_at=s.created_at,
        )
        for s in segments
    ]
