from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class CourseVideoDto(BaseModel):
    id: int
    course_id: Optional[int] = None
    order_index: int = 1
    title: str = ""
    filename: str = ""
    original_filename: str = ""
    status: str = "uploaded"
    progress: float = 0.0
    current_step: str = ""
    file_size: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CourseListDto(BaseModel):
    id: int
    title: str
    description: str = ""
    thumbnail_url: Optional[str] = None
    price: float = 0.0
    is_enrolled: bool = False
    user_id: Optional[int] = None
    user_name: Optional[str] = "Instructor"
    video_count: int = 0
    completed_video_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CourseDetailDto(BaseModel):
    id: int
    title: str
    description: str = ""
    thumbnail_url: Optional[str] = None
    price: float = 0.0
    is_enrolled: bool = False
    user_id: Optional[int] = None
    user_name: Optional[str] = "Instructor"
    created_at: datetime
    updated_at: datetime
    videos: List[CourseVideoDto] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class CourseCreateDto(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field("", max_length=2000)
    thumbnail_url: Optional[str] = None
    price: float = Field(0.0, ge=0.0)


class CourseUpdateDto(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    price: Optional[float] = None


class VideoOrderDto(BaseModel):
    video_id: int
    order_index: int


class ReorderVideosDto(BaseModel):
    video_orders: List[VideoOrderDto] = Field(default_factory=list)


class CourseVideoUpdateDto(BaseModel):
    title: Optional[str] = None
    order_index: Optional[int] = None
