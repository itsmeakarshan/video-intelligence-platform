import os
import uuid

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.models.video import Video


UPLOAD_FOLDER = "uploads"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def save_video(file: UploadFile, db: Session):

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
