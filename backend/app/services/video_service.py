import os
import uuid
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session
from app.models.video import Video
from app.models.transcript import Transcript
from app.models.transcript_segment import TranscriptSegment
from app.models.transcript_chunk import TranscriptChunk


UPLOAD_FOLDER = "uploads"

os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True
)


def save_video(
    file: UploadFile,
    db: Session
):

    extension = file.filename.split(".")[-1]

    filename = f"{uuid.uuid4()}.{extension}"

    filepath = os.path.join(
        UPLOAD_FOLDER,
        filename
    )

    with open(filepath, "wb") as buffer:

        buffer.write(file.file.read())

    size = os.path.getsize(filepath)

    video = Video(
        filename=filename,
        original_filename=file.filename,
        file_path=filepath,
        file_size=size,
        status="uploaded"
    )

    db.add(video)
    db.commit()
    db.refresh(video)

    return video


def get_all_videos(
    db: Session
):

    return (
        db.query(Video)
        .order_by(Video.id.desc())
        .all()
    )


def delete_video(
    video_id: int,
    db: Session
):
    video = (
        db.query(Video)
        .filter(Video.id == video_id)
        .first()
    )

    if not video:
        raise HTTPException(
            status_code=404,
            detail="Video not found."
        )

    transcript = (
        db.query(Transcript)
        .filter(
            Transcript.video_id == video.id
        )
        .first()
    )

    if transcript:

        (
            db.query(TranscriptSegment)
            .filter(
                TranscriptSegment.transcript_id == transcript.id
            )
            .delete(synchronize_session=False)
        )

        (
            db.query(TranscriptChunk)
            .filter(
                TranscriptChunk.transcript_id == transcript.id
            )
            .delete(synchronize_session=False)
        )

        db.delete(transcript)

    if os.path.exists(video.file_path):
        os.remove(video.file_path)

    db.delete(video)

    db.commit()

    return {
        "message": "Video deleted successfully."
    }