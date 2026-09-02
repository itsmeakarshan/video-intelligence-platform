import os
import re
import uuid
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple
from sqlalchemy.orm import Session
import yt_dlp
from app.config import settings
from app.models.video import Video
from app.services.video_service import sanitize_filename

logger = logging.getLogger(__name__)


def download_youtube_video(
    url: str,
    db: Session,
    quality: str = "720",
    course_id: Optional[int] = None,
    user_id: Optional[int] = None,
) -> Video:
    uploads_dir = Path(settings.UPLOAD_FOLDER)
    uploads_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    out_tmpl = str(uploads_dir / f"{timestamp}_%(id)s_%(title).50s.%(ext)s")

    ydl_opts = {
        "format": f"bestvideo[height<={quality}][ext=mp4]+bestaudio[ext=m4a]/best[height<={quality}][ext=mp4]/best",
        "outtmpl": out_tmpl,
        "quiet": True,
        "no_warnings": True,
        "merge_output_format": "mp4",
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        raw_filename = ydl.prepare_filename(info)

        # In case merging produced .mp4
        if not os.path.exists(raw_filename):
            base_no_ext = os.path.splitext(raw_filename)[0]
            if os.path.exists(f"{base_no_ext}.mp4"):
                raw_filename = f"{base_no_ext}.mp4"

        file_path = raw_filename
        file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
        original_title = info.get("title", "YouTube Video")
        filename = os.path.basename(file_path)

    clean_title = re.sub(r'[\-_]', ' ', original_title).strip()
    clean_title = re.sub(r'\s+', ' ', clean_title)

    order_index = 1
    if course_id:
        last_vid = (
            db.query(Video)
            .filter(Video.course_id == course_id)
            .order_by(Video.order_index.desc())
            .first()
        )
        if last_vid:
            order_index = (last_vid.order_index or 0) + 1

    video = Video(
        user_id=user_id,
        course_id=course_id,
        order_index=order_index,
        title=clean_title,
        filename=filename,
        original_filename=f"{original_title}.mp4",
        file_path=file_path,
        file_size=file_size,
        status="queued",
        progress=0.0,
        current_step="Downloaded and queued for processing",
        created_at=datetime.utcnow(),
    )
    db.add(video)
    db.commit()
    db.refresh(video)
    return video
