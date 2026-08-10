from datetime import datetime

from pydantic import BaseModel


class VideoResponse(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_path: str
    file_size: int

    status: str
    progress: float
    current_step: str

    created_at: datetime

    model_config = {
        "from_attributes": True
    }