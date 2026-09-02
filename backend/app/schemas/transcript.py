from datetime import datetime
from pydantic import BaseModel, ConfigDict


class TranscriptResponseDto(BaseModel):
    id: int
    video_id: int
    language: str = "en"
    transcript: str = ""
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TranscriptSegmentDto(BaseModel):
    id: int
    transcript_id: int
    segment_index: int
    start_time: float
    end_time: float
    text: str = ""
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
