from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class VideoResponseDto(BaseModel):
    id: int
    course_id: Optional[int] = None
    order_index: int = 1
    title: str = ""
    filename: str = ""
    original_filename: str = ""
    file_path: str = ""
    file_size: int = 0
    status: str = "uploaded"
    progress: float = 0.0
    current_step: str = ""
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class YouTubeDownloadRequestDto(BaseModel):
    url: str = Field(..., min_length=1)
    quality: str = "720"
    course_id: Optional[int] = None


class YouTubeDownloadResponseDto(BaseModel):
    message: str
    video_id: int
    filename: str
    original_filename: str
    file_path: str
    file_size: int
    status: str
    progress: float
