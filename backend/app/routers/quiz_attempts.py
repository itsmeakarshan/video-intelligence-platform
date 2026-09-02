from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.course import Course
from app.models.quiz import QuizAttempt, QuizAttemptVideo, QuizAttemptQuestion
from app.models.user import User
from app.models.video import Video
from app.schemas.quiz import (
    QuizAttemptCreateDto,
    QuizAttemptResponseDto,
    VideoSimpleDto,
    RecommendationResponseDto,
)
from app.services import (
    knowledge_profile_service,
    learning_analytics_service,
    youtube_recommendation_service,
)
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/quiz-attempts", tags=["Quiz Attempts & Knowledge Profiles"])


@router.post("", response_model=QuizAttemptResponseDto, status_code=status.HTTP_201_CREATED)
def record_quiz_attempt(
    dto: QuizAttemptCreateDto,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    percentage = (
        round((dto.score / float(dto.total_questions)) * 100.0, 1)
        if dto.total_questions > 0
        else 0.0
    )

    primary_vid_id = (
        dto.video_ids[0]
        if (dto.video_ids and len(dto.video_ids) > 0)
        else dto.video_id
    )

    attempt = QuizAttempt(
        user_id=current_user.id,
        video_id=primary_vid_id,
        score=dto.score,
        total_questions=dto.total_questions,
        percentage=percentage,
        difficulty=(dto.difficulty or "Medium").title(),
        created_at=datetime.utcnow(),
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    # Associate multiple videos
    vid_ids = set()
    if dto.video_ids:
        vid_ids.update(dto.video_ids)
    if dto.video_id:
        vid_ids.add(dto.video_id)

    for v_id in vid_ids:
        link = QuizAttemptVideo(quiz_attempt_id=attempt.id, video_id=v_id)
        db.add(link)

    # Save detailed questions
    if dto.questions:
        for q in dto.questions:
            q_entity = QuizAttemptQuestion(
                quiz_attempt_id=attempt.id,
                question_index=q.question_index,
                question_text=q.question_text[:500],
                selected_answer=q.selected_answer,
                correct_answer=q.correct_answer,
                is_correct=q.is_correct,
                topic=q.topic[:200] if q.topic else "General Concept",
                explanation=q.explanation[:1000] if q.explanation else None,
            )
            db.add(q_entity)

    db.commit()

    # Count prior attempts for attempt number
    attempt_num = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == current_user.id, QuizAttempt.created_at <= attempt.created_at)
        .count()
    )

    # Resolve course
    course_id = None
    course_title = None
    if primary_vid_id:
        v = db.query(Video).filter(Video.id == primary_vid_id).first()
        if v and v.course_id:
            c = db.query(Course).filter(Course.id == v.course_id).first()
            if c:
                course_id = c.id
                course_title = c.title

    videos_simple = []
    if vid_ids:
        linked_vids = db.query(Video).filter(Video.id.in_(vid_ids)).all()
        videos_simple = [
            VideoSimpleDto(
                id=lv.id,
                filename=lv.filename,
                original_filename=lv.original_filename,
            )
            for lv in linked_vids
        ]

    return QuizAttemptResponseDto(
        id=attempt.id,
        user_id=attempt.user_id,
        attempt_number=attempt_num,
        score=attempt.score,
        total_questions=attempt.total_questions,
        percentage=attempt.percentage,
        difficulty=attempt.difficulty,
        created_at=attempt.created_at,
        video_id=attempt.video_id,
        course_id=course_id,
        course_title=course_title,
        videos=videos_simple,
    )


@router.get("", response_model=List[QuizAttemptResponseDto])
def list_quiz_attempts(
    course_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == current_user.id)
    )

    if course_id is not None:
        query = query.join(Video, QuizAttempt.video_id == Video.id).filter(Video.course_id == course_id)

    attempts = query.order_by(QuizAttempt.created_at.asc()).all()

    results = []
    for idx, att in enumerate(attempts, start=1):
        c_id = None
        c_title = None
        if att.video_id:
            v = db.query(Video).filter(Video.id == att.video_id).first()
            if v and v.course_id:
                c = db.query(Course).filter(Course.id == v.course_id).first()
                if c:
                    c_id = c.id
                    c_title = c.title

        linked_links = db.query(QuizAttemptVideo).filter(QuizAttemptVideo.quiz_attempt_id == att.id).all()
        linked_vid_ids = [l.video_id for l in linked_links]
        if att.video_id and att.video_id not in linked_vid_ids:
            linked_vid_ids.append(att.video_id)

        vids_simple = []
        if linked_vid_ids:
            v_objs = db.query(Video).filter(Video.id.in_(linked_vid_ids)).all()
            vids_simple = [
                VideoSimpleDto(
                    id=vo.id,
                    filename=vo.filename,
                    original_filename=vo.original_filename,
                )
                for vo in v_objs
            ]

        results.append(
            QuizAttemptResponseDto(
                id=att.id,
                user_id=att.user_id,
                attempt_number=idx,
                score=att.score,
                total_questions=att.total_questions,
                percentage=att.percentage,
                difficulty=att.difficulty,
                created_at=att.created_at,
                video_id=att.video_id,
                course_id=c_id,
                course_title=c_title,
                videos=vids_simple,
            )
        )

    results.reverse()
    return results


@router.get("/knowledge-profile")
def get_knowledge_profile(
    user_id: Optional[int] = None,
    course_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_id = user_id if (current_user.role == "admin" and user_id) else current_user.id
    return knowledge_profile_service.get_user_knowledge_profile(target_id, course_id, db)


@router.get("/learning-gain")
def get_learning_gain(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return learning_analytics_service.compute_learning_gain(current_user.id, db)


@router.get("/ab-experiment")
def get_ab_experiment(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return learning_analytics_service.get_ab_experiment_summary(db)


@router.get("/{attempt_id}/recommendations", response_model=RecommendationResponseDto)
async def get_recommendations(
    attempt_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await youtube_recommendation_service.get_quiz_attempt_recommendations_async(
        attempt_id, current_user.id, db
    )
