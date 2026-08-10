import time

from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.video import Video
from app.models.transcript import Transcript
from app.models.transcript_segment import TranscriptSegment

from app.services.whisper_service import transcribe_video
from app.services.chunk_service import create_chunks
from app.services.embedding_service import index_video


def process_video(video: Video, db: Session):

    try:

        print("=" * 60)
        print(f"Processing Video {video.id}")
        print("=" * 60)

        db.refresh(video)

        video.status = "processing"
        video.progress = 5
        video.current_step = "Preparing video..."
        db.commit()

        def update_progress(percent: int, step: str):
            db.refresh(video)
            video.progress = percent
            video.current_step = step
            db.commit()

        # ----------------------------------------
        # Whisper Transcription
        # ----------------------------------------

        result = transcribe_video(
            video.file_path,
            progress_callback=update_progress
        )

        db.refresh(video)
        video.progress = 40
        video.current_step = "Saving transcript..."
        db.commit()

        transcript = Transcript(
            video_id=video.id,
            language=result["language"],
            transcript=result["full_text"]
        )

        db.add(transcript)
        db.commit()
        db.refresh(transcript)

        db.refresh(video)
        video.progress = 55
        video.current_step = "Saving transcript segments..."
        db.commit()

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

        db.commit()

        db.refresh(video)
        video.progress = 70
        video.current_step = "Creating semantic chunks..."
        db.commit()

        create_chunks(
            transcript.id,
            db
        )

        db.refresh(video)
        video.progress = 85
        video.current_step = "Generating embeddings..."
        db.commit()

        index_video(
            video.id,
            db
        )

        db.refresh(video)
        video.progress = 100
        video.current_step = "Completed"
        video.status = "completed"
        db.commit()

        print("=" * 60)
        print(f"Finished Video {video.id}")
        print("=" * 60)

    except Exception as e:

        print("=" * 60)
        print("PROCESSING FAILED")
        print(e)
        print("=" * 60)

        db.rollback()

        try:
            db.refresh(video)
            video.status = "failed"
            video.current_step = str(e)
            db.commit()
        except Exception:
            pass


def queue_worker():

    print("=" * 60)
    print("QUEUE WORKER STARTED")
    print("=" * 60)

    while True:

        db = SessionLocal()

        try:

            video = (
                db.query(Video)
                .filter(Video.status == "queued")
                .order_by(Video.id.asc())
                .first()
            )

            if video is not None:
                process_video(video, db)

        except Exception as e:
            print(e)

        finally:
            db.close()

        time.sleep(1)