from datetime import datetime

from pydantic import BaseModel


class TranscriptResponse(BaseModel):

    id: int
    video_id: int
    language: str
    transcript: str
    created_at: datetime

    model_config = {
        "from_attributes": True
    }
