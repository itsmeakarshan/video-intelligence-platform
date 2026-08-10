import os
import re
import uuid

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.models.video import Video
from app.models.transcript import Transcript
from app.models.transcript_segment import TranscriptSegment
from app.models.transcript_chunk import TranscriptChunk

from app.services.embedding_service import (
    chunk_collection,
    segment_collection,
)

UPLOAD_FOLDER = "uploads"

os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True
)


def sanitize_filename(filename: str) -> str:
    """
    Make a filename safe for URLs and filesystems.

    Removes characters such as #, ?, /, \,
    and other characters that can cause URL
    or filesystem problems.
    """

    # Get filename without path information
    filename = os.path.basename(filename)

    # Separate extension
    name, extension = os.path.splitext(filename)

    # Remove problematic characters
    name = re.sub(
        r'[<>:"/\\|?*#%]',
        "",
        name
    )

    # Replace repeated whitespace with a single space
    name = re.sub(
        r"\s+",
        " ",
        name
    ).strip()

    # Prevent an empty filename
    if not name:
        name = "video"

    return f"{name}{extension}"


def save_video(
    file: UploadFile,
    db: Session,
    user_id: int,
):
    """
    Save a normal uploaded video.
    """

    extension = file.filename.split(".")[-1]

    filename = f"{uuid.uuid4()}.{extension}"

    filepath = os.path.join(
        UPLOAD_FOLDER,
        filename
    )

    with open(filepath, "wb") as buffer:

        buffer.write(
            file.file.read()
        )

    size = os.path.getsize(
        filepath
    )

    video = Video(
        user_id=user_id,
        filename=filename,
        original_filename=file.filename,
        file_path=filepath,
        file_size=size,
        status="queued",
        progress=0
    )

    db.add(video)

    db.commit()

    db.refresh(video)

    return video


def save_downloaded_video(
    filepath: str,
    original_filename: str,
    db: Session,
    user_id: int,
):
    """
    Create a Video database record for a video
    that has already been downloaded by another
    service such as yt-dlp.
    """

    if not os.path.exists(filepath):

        raise HTTPException(
            status_code=404,
            detail="Downloaded video file was not found."
        )

    # ----------------------------------------
    # Create safe filename
    # ----------------------------------------

    safe_filename = sanitize_filename(
        os.path.basename(filepath)
    )

    safe_filepath = os.path.join(
        UPLOAD_FOLDER,
        safe_filename
    )

    # ----------------------------------------
    # Rename downloaded file
    # ----------------------------------------

    if filepath != safe_filepath:

        os.rename(
            filepath,
            safe_filepath
        )

    filename = os.path.basename(
        safe_filepath
    )

    size = os.path.getsize(
        safe_filepath
    )

    video = Video(
        user_id=user_id,
        filename=filename,
        original_filename=original_filename,
        file_path=safe_filepath,
        file_size=size,
        status="uploaded",
        progress=0
    )

    db.add(video)

    db.commit()

    db.refresh(video)

    return video


def get_all_videos(
    db: Session,
    user_id: int,
):

    return (
        db.query(Video)
        .filter(Video.user_id == user_id)
        .order_by(
            Video.id.desc()
        )
        .all()
    )


def delete_video(
    video_id: int,
    db: Session,
    user_id: int,
):

    video = (
        db.query(Video)
        .filter(Video.id == video_id, Video.user_id == user_id)
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

        chunks = (
            db.query(TranscriptChunk)
            .filter(
                TranscriptChunk.transcript_id
                == transcript.id
            )
            .all()
        )

        if chunks:

            chunk_ids = [
                str(chunk.id)
                for chunk in chunks
            ]

            try:

                chunk_collection.delete(
                    ids=chunk_ids
                )

            except Exception:

                pass

        try:

            segment_collection.delete(
                where={
                    "transcript_id":
                    transcript.id
                }
            )

        except Exception:

            pass

        (
            db.query(TranscriptSegment)
            .filter(
                TranscriptSegment.transcript_id
                == transcript.id
            )
            .delete(
                synchronize_session=False
            )
        )

        (
            db.query(TranscriptChunk)
            .filter(
                TranscriptChunk.transcript_id
                == transcript.id
            )
            .delete(
                synchronize_session=False
            )
        )

        db.delete(
            transcript
        )

    if os.path.exists(
        video.file_path
    ):

        os.remove(
            video.file_path
        )

    db.delete(
        video
    )

    db.commit()

    return {
        "message": "Video deleted successfully."
    }
