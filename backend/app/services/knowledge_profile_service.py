import re
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.user import User
from app.models.quiz import QuizAttempt, QuizAttemptVideo, QuizAttemptQuestion
from app.models.video import Video


def normalize_topic_name(raw_topic: Optional[str]) -> str:
    if not raw_topic or not raw_topic.strip():
        return "General Computer Concepts"

    cleaned = raw_topic.strip()
    if re.match(r'^topic\s+[a-z0-9]$', cleaned, re.IGNORECASE):
        return "General Computer Concepts"

    lower = cleaned.lower()
    if "optical mouse" in lower or "mouse sensor" in lower:
        return "Optical Mouse Sensors"
    if "storage sense" in lower:
        return "Windows Storage Sense"
    if "touch screen" in lower or "touchscreen" in lower:
        return "Touch Screen Navigation"
    if "processor" in lower or "cpu" in lower:
        return "Processor Architecture"
    if "memory" in lower or "ram" in lower:
        return "System Memory"
    if "cleaning" in lower or "maintenance" in lower:
        return "Computer Maintenance"
    if "button" in lower or "port" in lower:
        return "Computer Buttons & Ports"
    if "application" in lower or "app" in lower:
        return "Software Applications"
    if "slogan" in lower or "gcf" in lower:
        return "Digital Literacy Basics"

    if cleaned.lower().endswith("s") and not cleaned.lower().endswith("ss") and len(cleaned) > 4:
        cleaned = cleaned[:-1]

    return cleaned.title()


def get_user_knowledge_profile(
    user_id: int,
    course_id: Optional[int],
    db: Session,
) -> Dict[str, Any]:
    target_user = db.query(User).filter(User.id == user_id).first()

    # Query attempts
    attempts_q = db.query(QuizAttempt).filter(QuizAttempt.user_id == user_id)

    if course_id is not None:
        video_ids_in_course = [row[0] for row in db.query(Video.id).filter(Video.course_id == course_id).all()]
        linked_attempt_ids = [
            row[0] for row in db.query(QuizAttemptVideo.quiz_attempt_id).filter(QuizAttemptVideo.video_id.in_(video_ids_in_course)).all()
        ]
        attempts_q = attempts_q.filter(
            or_(
                QuizAttempt.video_id.in_(video_ids_in_course),
                QuizAttempt.id.in_(linked_attempt_ids),
            )
        )

    attempts = attempts_q.order_by(QuizAttempt.created_at.asc()).all()
    total_attempts = len(attempts)

    avg_score = round(sum(a.percentage for a in attempts) / total_attempts, 1) if total_attempts > 0 else 0.0
    max_score = round(max((a.percentage for a in attempts), default=0.0), 1)

    attempt_history = [
        {
            "attempt_id": str(att.id),
            "quiz_id": str(att.video_id or att.id),
            "timestamp": att.created_at.isoformat(),
            "score_percentage": round(att.percentage, 1),
            "passed": att.percentage >= 60.0,
            "difficulty": (att.difficulty or "Medium").title(),
            "topic": (att.difficulty or "General").title(),
        }
        for att in attempts
    ]

    # Difficulty performance
    diff_map = {}
    for att in attempts:
        diff_key = (att.difficulty or "Medium").title()
        if diff_key not in diff_map:
            diff_map[diff_key] = []
        diff_map[diff_key].append(att.percentage)

    difficulty_performance = []
    for diff in ["Easy", "Medium", "Hard"]:
        if diff in diff_map:
            scores = diff_map[diff]
            difficulty_performance.append({
                "difficulty": diff,
                "attempts_count": len(scores),
                "avg_percentage": round(sum(scores) / len(scores), 1),
                "has_data": True,
            })
        else:
            difficulty_performance.append({
                "difficulty": diff,
                "attempts_count": 0,
                "avg_percentage": None,
                "has_data": False,
            })

    # Questions Query
    questions_q = (
        db.query(QuizAttemptQuestion)
        .join(QuizAttempt, QuizAttemptQuestion.quiz_attempt_id == QuizAttempt.id)
        .filter(QuizAttempt.user_id == user_id)
    )

    if course_id is not None:
        video_ids_in_course = [row[0] for row in db.query(Video.id).filter(Video.course_id == course_id).all()]
        linked_attempt_ids = [
            row[0] for row in db.query(QuizAttemptVideo.quiz_attempt_id).filter(QuizAttemptVideo.video_id.in_(video_ids_in_course)).all()
        ]
        questions_q = questions_q.filter(
            or_(
                QuizAttempt.video_id.in_(video_ids_in_course),
                QuizAttempt.id.in_(linked_attempt_ids),
            )
        )

    questions = questions_q.all()

    if not questions:
        return {
            "has_data": total_attempts > 0,
            "total_quiz_attempts": total_attempts,
            "total_questions_answered": 0,
            "overall_average_percentage": avg_score,
            "average_quiz_score_percentage": avg_score,
            "highest_score_percentage": max_score,
            "highest_quiz_score_percentage": max_score,
            "overall_mastery_percentage": avg_score,
            "attempt_history": attempt_history,
            "topics_breakdown": [],
            "strong_areas": [],
            "improving_areas": [],
            "weak_areas": [],
            "strong_concepts": [],
            "weak_concepts": [],
            "concept_mastery": [],
            "difficulty_performance": difficulty_performance,
            "summary": {
                "strong_count": 0,
                "improving_count": 0,
                "needs_review_count": 0,
            },
            "message": "Complete at least 1 quiz to build your personalized Knowledge Profile.",
        }

    topic_stats: Dict[str, Dict[str, int]] = {}
    for q in questions:
        norm_topic = normalize_topic_name(q.topic)
        if norm_topic not in topic_stats:
            topic_stats[norm_topic] = {"correct": 0, "total": 0}
        topic_stats[norm_topic]["total"] += 1
        if q.is_correct:
            topic_stats[norm_topic]["correct"] += 1

    topics_breakdown = []
    strong_areas = []
    improving_areas = []
    weak_areas = []
    strong_concepts = []
    weak_concepts = []
    total_mastery_sum = 0.0

    for topic_name, stat in topic_stats.items():
        mastery_pct = round((stat["correct"] / stat["total"]) * 100.0, 1)
        total_mastery_sum += mastery_pct

        if stat["total"] < 3:
            confidence = "Low (Limited Data)"
        elif stat["total"] < 7:
            confidence = "Moderate"
        else:
            confidence = "High"

        if mastery_pct >= 75.0:
            level = "Strong"
            strong_concepts.append(topic_name)
        elif mastery_pct >= 60.0:
            level = "Improving"
        else:
            level = "Needs Review"
            weak_concepts.append(topic_name)

        item = {
            "topic": topic_name,
            "concept": topic_name,
            "mastery_percentage": mastery_pct,
            "correct_count": stat["correct"],
            "total_count": stat["total"],
            "attempts_count": stat["total"],
            "confidence": confidence,
            "level": level,
        }

        topics_breakdown.append(item)
        if mastery_pct >= 75.0:
            strong_areas.append(item)
        elif mastery_pct >= 60.0:
            improving_areas.append(item)
        else:
            weak_areas.append(item)

    topics_breakdown.sort(key=lambda x: x["mastery_percentage"], reverse=True)
    overall_mastery = round(total_mastery_sum / len(topic_stats), 1) if topic_stats else 0.0

    return {
        "has_data": True,
        "user_id": str(user_id),
        "user_name": target_user.name if target_user else None,
        "user_email": target_user.email if target_user else None,
        "user_role": target_user.role if target_user else None,
        "total_quiz_attempts": total_attempts,
        "total_questions_answered": len(questions),
        "overall_average_percentage": avg_score,
        "average_quiz_score_percentage": avg_score,
        "highest_score_percentage": max_score,
        "highest_quiz_score_percentage": max_score,
        "overall_mastery_percentage": overall_mastery,
        "attempt_history": attempt_history,
        "topics_breakdown": topics_breakdown,
        "strong_areas": strong_areas,
        "improving_areas": improving_areas,
        "weak_areas": weak_areas,
        "strong_concepts": strong_concepts,
        "weak_concepts": weak_concepts,
        "concept_mastery": topics_breakdown,
        "difficulty_performance": difficulty_performance,
        "summary": {
            "strong_count": len(strong_areas),
            "improving_count": len(improving_areas),
            "needs_review_count": len(weak_areas),
        },
        "message": None,
    }
