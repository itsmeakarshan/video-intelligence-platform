from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class CourseSkillDto(BaseModel):
    id: int
    course_id: int
    name: str
    description: str = ""
    category: str = "Core Concepts"
    order_index: int = 1
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CourseSkillCreateDto(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = ""
    category: Optional[str] = "Core Concepts"
    order_index: Optional[int] = None


class CourseSkillUpdateDto(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    order_index: Optional[int] = None


class CourseSkillMasteryDto(BaseModel):
    skill_id: int
    skill_name: str
    category: str
    description: str = ""
    questions_attempted: int = 0
    questions_correct: int = 0
    mastery_percentage: float = 0.0
    status: str = "Unassessed"  # "Mastered", "Needs Practice", "Unassessed"


class CourseMasteryProfileDto(BaseModel):
    course_id: int
    course_title: str
    user_id: int
    user_name: str
    overall_mastery_percentage: float
    total_skills: int
    mastered_count: int
    needs_practice_count: int
    unassessed_count: int
    skills: List[CourseSkillMasteryDto] = Field(default_factory=list)


class CourseAdminSkillStatDto(BaseModel):
    skill_id: int
    skill_name: str
    category: str
    average_mastery: float
    students_mastered_count: int
    students_needing_practice_count: int
    total_tested_students: int


class CourseAdminStudentMasteryRowDto(BaseModel):
    user_id: int
    student_name: str
    student_email: str
    quizzes_taken: int
    mastered_skills_count: int
    total_skills_count: int
    overall_percentage: float
    last_quiz_at: Optional[datetime] = None


class CourseAdminMasterySummaryDto(BaseModel):
    course_id: int
    course_title: str
    total_students_enrolled: int
    total_quizzes_attempted: int
    average_score: float
    skill_summaries: List[CourseAdminSkillStatDto] = Field(default_factory=list)
    student_masteries: List[CourseAdminStudentMasteryRowDto] = Field(default_factory=list)
