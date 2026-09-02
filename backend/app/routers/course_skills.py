from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.course import Course
from app.models.course_enrollment import CourseEnrollment
from app.models.course_skill import CourseSkill
from app.models.quiz import QuizAttempt, QuizAttemptQuestion
from app.models.user import User
from app.models.video import Video
from app.schemas.skill import (
    CourseSkillDto,
    CourseSkillCreateDto,
    CourseSkillUpdateDto,
    CourseMasteryProfileDto,
    CourseSkillMasteryDto,
    CourseAdminMasterySummaryDto,
    CourseAdminSkillStatDto,
    CourseAdminStudentMasteryRowDto,
)
from app.services import ai_service, knowledge_profile_service
from app.services.auth_service import get_current_user, require_admin

router = APIRouter(tags=["Course Skills & Mastery"])


@router.post("/courses/{course_id}/skills/generate", response_model=List[CourseSkillDto])
async def generate_skills(
    course_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        skills = await ai_service.extract_course_skills_async(course_id, db)
        return skills
    except ValueError as ex:
        raise HTTPException(status_code=400, detail=str(ex))
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Failed to generate course skills: {ex}")


@router.get("/courses/{course_id}/skills", response_model=List[CourseSkillDto])
def list_skills(course_id: int, db: Session = Depends(get_db)):
    skills = (
        db.query(CourseSkill)
        .filter(CourseSkill.course_id == course_id)
        .order_by(CourseSkill.order_index.asc(), CourseSkill.id.asc())
        .all()
    )
    return [
        CourseSkillDto(
            id=s.id,
            course_id=s.course_id,
            name=s.name,
            description=s.description or "",
            category=s.category or "Core Concepts",
            order_index=s.order_index,
            created_at=s.created_at,
        )
        for s in skills
    ]


@router.post("/courses/{course_id}/skills", response_model=CourseSkillDto, status_code=status.HTTP_201_CREATED)
def create_skill(
    course_id: int,
    dto: CourseSkillCreateDto,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    order = dto.order_index
    if order is None:
        last = (
            db.query(CourseSkill)
            .filter(CourseSkill.course_id == course_id)
            .order_by(CourseSkill.order_index.desc())
            .first()
        )
        order = (last.order_index + 1) if last else 1

    skill = CourseSkill(
        course_id=course_id,
        name=dto.name.strip(),
        description=dto.description.strip() if dto.description else "",
        category=dto.category.strip() if dto.category else "Core Concepts",
        order_index=order,
        created_at=datetime.utcnow(),
    )
    db.add(skill)
    db.commit()
    db.refresh(skill)

    return CourseSkillDto(
        id=skill.id,
        course_id=skill.course_id,
        name=skill.name,
        description=skill.description,
        category=skill.category,
        order_index=skill.order_index,
        created_at=skill.created_at,
    )


@router.put("/courses/{course_id}/skills/{skill_id}", response_model=CourseSkillDto)
def update_skill(
    course_id: int,
    skill_id: int,
    dto: CourseSkillUpdateDto,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    skill = (
        db.query(CourseSkill)
        .filter(CourseSkill.id == skill_id, CourseSkill.course_id == course_id)
        .first()
    )
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found.")

    if dto.name is not None:
        skill.name = dto.name.strip()
    if dto.description is not None:
        skill.description = dto.description.strip()
    if dto.category is not None:
        skill.category = dto.category.strip()
    if dto.order_index is not None:
        skill.order_index = dto.order_index

    db.commit()
    db.refresh(skill)

    return CourseSkillDto(
        id=skill.id,
        course_id=skill.course_id,
        name=skill.name,
        description=skill.description,
        category=skill.category,
        order_index=skill.order_index,
        created_at=skill.created_at,
    )


@router.delete("/courses/{course_id}/skills/{skill_id}")
def delete_skill(
    course_id: int,
    skill_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    skill = (
        db.query(CourseSkill)
        .filter(CourseSkill.id == skill_id, CourseSkill.course_id == course_id)
        .first()
    )
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found.")

    db.delete(skill)
    db.commit()
    return {"message": "Skill deleted successfully."}


@router.get("/courses/{course_id}/mastery", response_model=CourseMasteryProfileDto)
def get_student_course_mastery(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _compute_course_mastery(course_id, current_user.id, db)


@router.get("/admin/users/{user_id}/course-mastery/{course_id}", response_model=CourseMasteryProfileDto)
def get_user_course_mastery_admin(
    user_id: int,
    course_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return _compute_course_mastery(course_id, user_id, db)


def _compute_course_mastery(course_id: int, user_id: int, db: Session) -> CourseMasteryProfileDto:
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    skills = (
        db.query(CourseSkill)
        .filter(CourseSkill.course_id == course_id)
        .order_by(CourseSkill.order_index.asc())
        .all()
    )

    questions = (
        db.query(QuizAttemptQuestion)
        .join(QuizAttempt, QuizAttemptQuestion.quiz_attempt_id == QuizAttempt.id)
        .join(Video, QuizAttempt.video_id == Video.id)
        .filter(QuizAttempt.user_id == user_id, Video.course_id == course_id)
        .all()
    )

    skill_masteries: List[CourseSkillMasteryDto] = []
    mastered_count = 0
    needs_practice_count = 0
    unassessed_count = 0
    total_percentage_sum = 0.0
    assessed_skills_count = 0

    for s in skills:
        s_name_lower = s.name.lower()
        matched_qs = [
            q for q in questions
            if s_name_lower in q.topic.lower()
            or q.topic.lower() in s_name_lower
            or knowledge_profile_service.normalize_topic_name(q.topic).lower() == s_name_lower
        ]

        attempted = len(matched_qs)
        correct = sum(1 for q in matched_qs if q.is_correct)

        if attempted == 0:
            status_str = "Unassessed"
            pct = 0.0
            unassessed_count += 1
        else:
            pct = round((correct / attempted) * 100.0, 1)
            total_percentage_sum += pct
            assessed_skills_count += 1
            if pct >= 70.0:
                status_str = "Mastered"
                mastered_count += 1
            else:
                status_str = "Needs Practice"
                needs_practice_count += 1

        skill_masteries.append(
            CourseSkillMasteryDto(
                skill_id=s.id,
                skill_name=s.name,
                category=s.category or "Core Concepts",
                description=s.description or "",
                questions_attempted=attempted,
                questions_correct=correct,
                mastery_percentage=pct,
                status=status_str,
            )
        )

    overall_pct = (
        round(total_percentage_sum / assessed_skills_count, 1)
        if assessed_skills_count > 0
        else 0.0
    )

    return CourseMasteryProfileDto(
        course_id=course.id,
        course_title=course.title,
        user_id=user.id,
        user_name=user.name,
        overall_mastery_percentage=overall_pct,
        total_skills=len(skills),
        mastered_count=mastered_count,
        needs_practice_count=needs_practice_count,
        unassessed_count=unassessed_count,
        skills=skill_masteries,
    )


@router.get("/courses/{course_id}/admin/mastery-summary", response_model=CourseAdminMasterySummaryDto)
def get_course_mastery_summary_admin(
    course_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    skills = (
        db.query(CourseSkill)
        .filter(CourseSkill.course_id == course_id)
        .order_by(CourseSkill.order_index.asc())
        .all()
    )

    enrollments = db.query(CourseEnrollment).filter(CourseEnrollment.course_id == course_id).all()
    student_ids = {e.user_id for e in enrollments}

    attempts = (
        db.query(QuizAttempt)
        .join(Video, QuizAttempt.video_id == Video.id)
        .filter(Video.course_id == course_id)
        .all()
    )

    total_attempts = len(attempts)
    avg_score = (
        round(sum(a.percentage for a in attempts) / total_attempts, 1)
        if total_attempts > 0
        else 0.0
    )

    # Student masteries
    student_rows: List[CourseAdminStudentMasteryRowDto] = []
    for s_id in student_ids:
        st_user = db.query(User).filter(User.id == s_id).first()
        if not st_user:
            continue

        st_profile = _compute_course_mastery(course_id, s_id, db)
        st_attempts = [a for a in attempts if a.user_id == s_id]
        last_quiz_at = max((a.created_at for a in st_attempts), default=None)

        student_rows.append(
            CourseAdminStudentMasteryRowDto(
                user_id=st_user.id,
                student_name=st_user.name,
                student_email=st_user.email,
                quizzes_taken=len(st_attempts),
                mastered_skills_count=st_profile.mastered_count,
                total_skills_count=len(skills),
                overall_percentage=st_profile.overall_mastery_percentage,
                last_quiz_at=last_quiz_at,
            )
        )

    # Skill summaries
    skill_summaries: List[CourseAdminSkillStatDto] = []
    questions = (
        db.query(QuizAttemptQuestion)
        .join(QuizAttempt, QuizAttemptQuestion.quiz_attempt_id == QuizAttempt.id)
        .join(Video, QuizAttempt.video_id == Video.id)
        .filter(Video.course_id == course_id)
        .all()
    )

    for s in skills:
        s_name_lower = s.name.lower()
        matched_qs = [
            q for q in questions
            if s_name_lower in q.topic.lower()
            or q.topic.lower() in s_name_lower
            or knowledge_profile_service.normalize_topic_name(q.topic).lower() == s_name_lower
        ]

        # Group by student
        user_scores = {}
        for q in matched_qs:
            att = db.query(QuizAttempt).filter(QuizAttempt.id == q.quiz_attempt_id).first()
            if att:
                if att.user_id not in user_scores:
                    user_scores[att.user_id] = {"correct": 0, "total": 0}
                user_scores[att.user_id]["total"] += 1
                if q.is_correct:
                    user_scores[att.user_id]["correct"] += 1

        mastered_students = 0
        practice_students = 0
        pct_sum = 0.0

        for u_id, sc in user_scores.items():
            u_pct = (sc["correct"] / sc["total"]) * 100.0
            pct_sum += u_pct
            if u_pct >= 70.0:
                mastered_students += 1
            else:
                practice_students += 1

        total_tested = len(user_scores)
        avg_skill_pct = round(pct_sum / total_tested, 1) if total_tested > 0 else 0.0

        skill_summaries.append(
            CourseAdminSkillStatDto(
                skill_id=s.id,
                skill_name=s.name,
                category=s.category or "Core Concepts",
                average_mastery=avg_skill_pct,
                students_mastered_count=mastered_students,
                students_needing_practice_count=practice_students,
                total_tested_students=total_tested,
            )
        )

    return CourseAdminMasterySummaryDto(
        course_id=course.id,
        course_title=course.title,
        total_students_enrolled=len(student_ids),
        total_quizzes_attempted=total_attempts,
        average_score=avg_score,
        skill_summaries=skill_summaries,
        student_masteries=student_rows,
    )


@router.get("/admin/mastery-summary")
def get_platform_mastery_summary(
    course_id: Optional[int] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if course_id is not None and course_id > 0:
        return get_course_mastery_summary_admin(course_id, admin_user, db)

    first_course = db.query(Course).first()
    if first_course:
        return get_course_mastery_summary_admin(first_course.id, admin_user, db)

    return {
        "course_id": 0,
        "course_title": "All Courses",
        "total_students_enrolled": 0,
        "total_quizzes_attempted": 0,
        "average_score": 0.0,
        "skill_summaries": [],
        "student_masteries": [],
    }
