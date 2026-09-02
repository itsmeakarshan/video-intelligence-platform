from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.course import Course
from app.models.course_enrollment import CourseEnrollment
from app.models.quiz import QuizAttempt
from app.models.user import User
from app.models.video import Video
from app.schemas.auth import (
    AdminCreateUserDto,
    AdminUserListItemDto,
    AdminPlatformStatsDto,
    CourseRevenueStatDto,
    UserResponseDto,
)
from app.services.auth_service import hash_password, require_admin

router = APIRouter(prefix="/admin", tags=["Admin Management"])


@router.get("/users", response_model=List[AdminUserListItemDto])
def list_admin_users(
    include_admins: bool = False,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if not include_admins:
        query = query.filter(User.role != "admin")

    users = query.order_by(User.created_at.desc()).all()
    results = []

    for u in users:
        enrollments = (
            db.query(CourseEnrollment, Course)
            .join(Course, CourseEnrollment.course_id == Course.id)
            .filter(CourseEnrollment.user_id == u.id)
            .all()
        )

        enrolled_titles = [c.title for _, c in enrollments]
        total_spent = sum(float(e.amount_paid or 0.0) for e, _ in enrollments)

        attempts = (
            db.query(QuizAttempt)
            .filter(QuizAttempt.user_id == u.id)
            .order_by(QuizAttempt.created_at.asc())
            .all()
        )

        attempt_count = len(attempts)
        last_score = round(attempts[-1].percentage, 1) if attempts else None
        avg_score = (
            round(sum(a.percentage for a in attempts) / attempt_count, 1)
            if attempt_count > 0
            else None
        )

        results.append(
            AdminUserListItemDto(
                id=u.id,
                name=u.name,
                email=u.email,
                role=u.role,
                created_at=u.created_at,
                enrolled_courses_count=len(enrollments),
                total_spent=round(total_spent, 2),
                enrolled_courses=enrolled_titles,
                quiz_attempt_count=attempt_count,
                last_score_percentage=last_score,
                average_score_percentage=avg_score,
            )
        )

    return results


@router.post("/users", response_model=UserResponseDto, status_code=status.HTTP_201_CREATED)
def create_admin_user(
    dto: AdminCreateUserDto,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    email_clean = dto.email.strip().lower()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email address already exists.",
        )

    user = User(
        name=dto.name.strip(),
        email=email_clean,
        password_hash=hash_password(dto.password),
        role=dto.role or "student",
        created_at=datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return UserResponseDto(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
    )


@router.delete("/users/{id}")
def delete_admin_user(
    id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if id == admin_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own administrative account.")

    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully."}


@router.get("/stats", response_model=AdminPlatformStatsDto)
def get_admin_stats(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    total_students = db.query(User).filter(User.role != "admin").count()
    total_admins = db.query(User).filter(User.role == "admin").count()
    total_videos = db.query(Video).count()
    completed_videos = db.query(Video).filter(Video.status == "completed").count()
    total_courses = db.query(Course).count()
    total_enrollments = db.query(CourseEnrollment).count()

    all_enrollments = db.query(CourseEnrollment).all()
    total_earnings = round(sum(float(e.amount_paid or 0.0) for e in all_enrollments), 2)

    # Course revenue stats
    courses = db.query(Course).all()
    revenue_stats: List[CourseRevenueStatDto] = []

    for c in courses:
        c_enrollments = [e for e in all_enrollments if e.course_id == c.id]
        c_earnings = sum(float(e.amount_paid or 0.0) for e in c_enrollments)
        pct_earnings = round((c_earnings / total_earnings * 100.0), 1) if total_earnings > 0 else 0.0
        pct_students = round((len(c_enrollments) / total_enrollments * 100.0), 1) if total_enrollments > 0 else 0.0

        revenue_stats.append(
            CourseRevenueStatDto(
                course_id=c.id,
                course_title=c.title,
                price=float(c.price or 0.0),
                enrolled_students_count=len(c_enrollments),
                total_earnings=round(c_earnings, 2),
                percentage_of_earnings=pct_earnings,
                percentage_of_students=pct_students,
            )
        )

    all_attempts = db.query(QuizAttempt).all()
    total_quiz_attempts = len(all_attempts)
    platform_avg_score = (
        round(sum(a.percentage for a in all_attempts) / total_quiz_attempts, 1)
        if total_quiz_attempts > 0
        else 0.0
    )

    return AdminPlatformStatsDto(
        total_students=total_students,
        total_admins=total_admins,
        total_videos=total_videos,
        completed_videos=completed_videos,
        total_courses=total_courses,
        total_enrollments=total_enrollments,
        total_earnings=total_earnings,
        course_revenue_stats=revenue_stats,
        total_quiz_attempts=total_quiz_attempts,
        platform_average_score=platform_avg_score,
    )
