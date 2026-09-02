from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRegisterDto(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    role: Optional[str] = "student"


class UserLoginDto(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class UserResponseDto(BaseModel):
    id: int
    name: str
    email: str
    role: str = "student"

    model_config = ConfigDict(from_attributes=True)


class TokenResponseDto(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponseDto


class AdminCreateUserDto(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    role: str = "student"


class AdminUserListItemDto(BaseModel):
    id: int
    name: str
    email: str
    role: str = "student"
    created_at: datetime
    enrolled_courses_count: int = 0
    total_spent: float = 0.0
    enrolled_courses: List[str] = Field(default_factory=list)
    quiz_attempt_count: int = 0
    last_score_percentage: Optional[float] = None
    average_score_percentage: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class CourseRevenueStatDto(BaseModel):
    course_id: int
    course_title: str
    price: float
    enrolled_students_count: int
    total_earnings: float
    percentage_of_earnings: float
    percentage_of_students: float


class AdminPlatformStatsDto(BaseModel):
    total_students: int
    total_admins: int
    total_videos: int
    completed_videos: int
    total_courses: int
    total_enrollments: int
    total_earnings: float
    course_revenue_stats: List[CourseRevenueStatDto] = Field(default_factory=list)
    total_quiz_attempts: int = 0
    platform_average_score: float = 0.0
