from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db

from app.models.video import Video
from app.models.transcript import Transcript
from app.models.transcript_segment import TranscriptSegment
from app.models.transcript_chunk import TranscriptChunk

from app.schemas.whisper import WhisperModel

from app.services.whisper_service import transcribe_video
from app.services.chunk_service import build_chunks
from app.services.embedding_service import index_video

router = APIRouter(
    prefix="/transcripts",
    tags=["Transcripts"]
)


@router.post("/{video_id}")
def create_transcript(

    video_id: int,

    whisper_model: WhisperModel = Query(
        WhisperModel.base,
        description="Select Whisper model"
    ),

    db: Session = Depends(get_db)

):

    video = db.query(Video).filter(
        Video.id == video_id
    ).first()

    if video is None:
        raise HTTPException(
            status_code=404,
            detail="Video not found."
        )

    existing = db.query(Transcript).filter(
        Transcript.video_id == video.id
    ).first()

    if existing:
        return {
            "message": "Transcript already exists.",
            "transcript_id": existing.id
        }

    try:

        video.status = "processing"
        db.commit()

        result = transcribe_video(
            video.file_path,
            whisper_model.value
        )

        transcript = Transcript(
            video_id=video.id,
            language=result["language"],
            transcript=result["full_text"]
        )

        db.add(transcript)
        db.commit()
        db.refresh(transcript)

        for segment in result["segments"]:

            db.add(

                TranscriptSegment(

                    transcript_id=transcript.id,

                    segment_index=segment["segment_index"],

                    start_time=segment["start"],

                    end_time=segment["end"],

                    text=segment["text"]

                )

            )

        chunks = build_chunks(
            result["segments"]
        )

        for chunk in chunks:

            db.add(

                TranscriptChunk(

                    transcript_id=transcript.id,

                    chunk_index=chunk["chunk_index"],

                    start_time=chunk["start_time"],

                    end_time=chunk["end_time"],

                    text=chunk["text"]

                )

            )

        db.commit()

        index_video(
            video.id,
            db
        )

        video.status = "completed"
        db.commit()

        return {

            "transcript_id": transcript.id,

            "language": transcript.language,

            "segments": len(result["segments"]),

            "chunks": len(chunks),

            "whisper_model": whisper_model.value

        }

    except Exception:

        video.status = "failed"
        db.commit()

        raise


@router.get("/{video_id}")
def get_transcript(
    video_id: int,
    db: Session = Depends(get_db)
):

    transcript = db.query(
        Transcript
    ).filter(
        Transcript.video_id == video_id
    ).first()

    if transcript is None:
        raise HTTPException(
            status_code=404,
            detail="Transcript not found."
        )

    return transcript


@router.get("/{video_id}/segments")
def get_segments(
    video_id: int,
    db: Session = Depends(get_db)
):

    transcript = db.query(
        Transcript
    ).filter(
        Transcript.video_id == video_id
    ).first()

    if transcript is None:
        raise HTTPException(
            status_code=404,
            detail="Transcript not found."
        )

    return db.query(
        TranscriptSegment
    ).filter(
        TranscriptSegment.transcript_id == transcript.id
    ).order_by(
        TranscriptSegment.segment_index
    ).all()


@router.get("/{video_id}/chunks")
def get_chunks(
    video_id: int,
    db: Session = Depends(get_db)
):

    transcript = db.query(
        Transcript
    ).filter(
        Transcript.video_id == video_id
    ).first()

    if transcript is None:
        raise HTTPException(
            status_code=404,
            detail="Transcript not found."
        )

    return db.query(
        TranscriptChunk
    ).filter(
        TranscriptChunk.transcript_id == transcript.id
    ).order_by(
        TranscriptChunk.chunk_index
    ).all()