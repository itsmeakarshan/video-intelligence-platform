import asyncio
import logging
from datetime import datetime
from app.database import SessionLocal
from app.models.transcript import Transcript, TranscriptSegment, TranscriptChunk
from app.models.video import Video
from app.services import chunking_service, transcription_service

logger = logging.getLogger(__name__)

_worker_task: asyncio.Task = None
_is_running: bool = False


async def start_queue_worker():
    global _worker_task, _is_running
    if _is_running:
        return
    _is_running = True
    _worker_task = asyncio.create_task(_queue_worker_loop())
    logger.info("Background Queue Worker started.")


async def stop_queue_worker():
    global _worker_task, _is_running
    _is_running = False
    if _worker_task:
        _worker_task.cancel()
        try:
            await _worker_task
        except asyncio.CancelledError:
            pass
    logger.info("Background Queue Worker stopped.")


async def _queue_worker_loop():
    while _is_running:
        try:
            db = SessionLocal()
            video_id_to_process = None
            try:
                queued_video = (
                    db.query(Video)
                    .filter(Video.status == "queued")
                    .order_by(Video.id.asc())
                    .first()
                )
                if queued_video:
                    video_id_to_process = queued_video.id
            finally:
                db.close()

            if video_id_to_process:
                await process_video_async(video_id_to_process)

        except asyncio.CancelledError:
            break
        except Exception as ex:
            logger.error(f"Error in queue worker iteration: {ex}")

        await asyncio.sleep(3.0)


async def process_video_async(video_id: int):
    db = SessionLocal()
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        db.close()
        return

    try:
        logger.info(f"Processing video {video.id} ({video.original_filename})")

        video.status = "processing"
        video.progress = 5.0
        video.current_step = "Preparing video..."
        db.commit()

        def update_progress(percent: int, step: str):
            try:
                sub_db = SessionLocal()
                v = sub_db.query(Video).filter(Video.id == video_id).first()
                if v:
                    v.progress = float(percent)
                    v.current_step = step
                    sub_db.commit()
                sub_db.close()
            except Exception:
                pass

        # 1. Transcribe
        transcription_result = await transcription_service.transcribe_video_async(
            video.file_path, update_progress
        )

        video.progress = 40.0
        video.current_step = "Saving transcript..."
        db.commit()

        # Delete any prior transcript for this video
        db.query(Transcript).filter(Transcript.video_id == video.id).delete()
        db.commit()

        transcript = Transcript(
            video_id=video.id,
            language=transcription_result.language,
            transcript=transcription_result.full_text,
        )
        db.add(transcript)
        db.commit()
        db.refresh(transcript)

        # 2. Save Segments
        video.progress = 45.0
        video.current_step = "Saving transcript segments..."
        db.commit()

        segments_to_add = []
        total_segs = len(transcription_result.segments)
        for i, s in enumerate(transcription_result.segments):
            seg = TranscriptSegment(
                transcript_id=transcript.id,
                segment_index=s.segment_index,
                start_time=s.start,
                end_time=s.end,
                text=s.text,
                created_at=datetime.utcnow(),
            )
            segments_to_add.append(seg)

        db.bulk_save_objects(segments_to_add)
        db.commit()

        # 3. Create Chunks
        video.progress = 55.0
        video.current_step = "Creating semantic chunks..."
        db.commit()

        chunking_service.create_chunks(transcript.id, db, update_progress)

        # 4. Finalize
        video.progress = 100.0
        video.current_step = "Completed"
        video.status = "completed"
        db.commit()

        logger.info(f"Successfully finished processing video {video.id}")

    except Exception as ex:
        logger.error(f"Failed to process video {video_id}: {ex}")
        try:
            video.status = "failed"
            video.current_step = str(ex)
            db.commit()
        except Exception:
            pass
    finally:
        db.close()
