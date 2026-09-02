from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class VideoSimpleDto(BaseModel):
    id: int
    filename: str
    original_filename: str

    model_config = ConfigDict(from_attributes=True)


class QuestionResultCreateDto(BaseModel):
    question_index: int = 0
    question_text: str = Field(..., min_length=1, max_length=500)
    selected_answer: int = 0
    correct_answer: int = 0
    is_correct: bool = False
    topic: str = "General Concept"
    explanation: Optional[str] = None


class QuizAttemptCreateDto(BaseModel):
    video_ids: Optional[List[int]] = None
    video_id: Optional[int] = None
    score: int = Field(0, ge=0)
    total_questions: int = Field(1, ge=1)
    difficulty: str = "Medium"
    questions: Optional[List[QuestionResultCreateDto]] = None


class QuizAttemptResponseDto(BaseModel):
    id: int
    user_id: int
    attempt_number: int = 1
    score: int
    total_questions: int
    percentage: float
    difficulty: str = "Medium"
    created_at: datetime
    video_id: Optional[int] = None
    course_id: Optional[int] = None
    course_title: Optional[str] = None
    videos: List[VideoSimpleDto] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class WeakTopicDto(BaseModel):
    topic: str
    incorrect_count: int


class YouTubeRecommendationDto(BaseModel):
    topic: str = ""
    title: str
    youtube_video_id: str
    thumbnail_url: str = ""
    channel_name: str = ""
    description: str = ""
    url: str


class RecommendationResponseDto(BaseModel):
    attempt_id: int
    weak_topics: List[WeakTopicDto] = Field(default_factory=list)
    recommendations: List[YouTubeRecommendationDto] = Field(default_factory=list)
    message: Optional[str] = None
