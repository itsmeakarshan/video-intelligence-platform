import re
import urllib.parse
import logging
from typing import List, Dict, Any, Optional, Set
import httpx
from sqlalchemy.orm import Session
import yt_dlp
from app.config import settings
from app.models.quiz import QuizAttempt, QuizAttemptVideo, QuizAttemptQuestion
from app.models.video import Video
from app.schemas.quiz import (
    RecommendationResponseDto,
    WeakTopicDto,
    YouTubeRecommendationDto,
)
from app.services import knowledge_profile_service

logger = logging.getLogger(__name__)

MIN_RELEVANCE_THRESHOLD = 5.0

EDUCATIONAL_KEYWORDS = {
    "tutorial", "explained", "guide", "how to", "basics", "course", "learn", "introduction", "mastery", "overview"
}

OFF_DOMAIN_RULES = [
    {
        "source_indicators": ["mac os x", "macos", "windows", "computer basics", "touch screen", "scrolling", "desktop", "operating system"],
        "bad_keywords": ["scratch", "unity", "unreal", "game maker", "godot", "game dev", "game background", "sprite", "game engine", "code tutorial", "css scrolling"],
        "penalty": -25.0,
    },
    {
        "source_indicators": ["web browser", "browser", "internet", "visiting websites", "check email", "google chrome", "safari", "firefox"],
        "bad_keywords": ["browser engine", "chromium source code", "browser architecture", "v8 engine", "building a browser", "c++ browser", "browser security research"],
        "penalty": -25.0,
    },
    {
        "source_indicators": ["desktop computer", "setup", "connecting", "peripherals", "monitor", "keyboard", "cables", "pc setup"],
        "bad_keywords": ["liquid nitrogen", "extreme overclocking", "bios flashing", "custom loop water cooling", "delidding", "overclocking record"],
        "penalty": -25.0,
    },
    {
        "source_indicators": ["applications", "apps", "create documents", "word processing", "spreadsheet", "office apps"],
        "bad_keywords": ["flutter", "react native", "swiftui", "android studio", "xcode", "ios app development", "android app development", "mobile app dev"],
        "penalty": -25.0,
    },
    {
        "source_indicators": ["computer", "pc", "graphics", "gpu", "hardware", "desktop", "case", "motherboard", "display"],
        "bad_keywords": ["led wall", "video wall", "vdwall", "led display processor", "stage led", "billboard", "hdp-601", "lvp605", "novastar", "colorlight", "video wall processor"],
        "penalty": -25.0,
    },
    {
        "source_indicators": ["computer", "pc", "ram", "hardware", "bytes", "storage", "system memory"],
        "bad_keywords": ["psychology", "brain memory", "human memory", "cognitive", "dementia", "memorization", "neuroscience"],
        "penalty": -25.0,
    },
    {
        "source_indicators": ["computer", "pc", "hard drive", "storage", "disk", "ssd", "hdd"],
        "bad_keywords": ["driving test", "car drive", "golf drive", "test drive", "driveway", "road test"],
        "penalty": -25.0,
    },
    {
        "source_indicators": ["computer", "pc", "tower", "hardware", "chassis"],
        "bad_keywords": ["court case", "legal case", "lawyer", "iphone case", "phone case", "leather case", "briefcase"],
        "penalty": -25.0,
    },
]


def clean_source_video_title(title: Optional[str]) -> str:
    if not title:
        return ""
    cleaned = re.sub(r'\.(mp4|mkv|avi|mov|webm)$', '', title, flags=re.IGNORECASE)
    cleaned = re.sub(r'[\-_]', ' ', cleaned)
    cleaned = re.sub(r'\b(720p|1080p|hd|4k|video|official|synthetic|user|\d+)\b', ' ', cleaned, flags=re.IGNORECASE)
    return re.sub(r'\s+', ' ', cleaned).strip()


def build_contextual_query(
    topic: str,
    video_context: str = "",
    sample_question: str = "",
    correct_answer: str = "",
    explanation: str = "",
    is_fallback: bool = False,
) -> str:
    topic_clean = topic.strip()
    topic_lower = topic_clean.lower()
    combined_text = f"{video_context} {sample_question} {correct_answer} {explanation}".lower()

    domain_prefix = ""
    if "mac os" in combined_text or "macos" in combined_text or "mac" in combined_text:
        domain_prefix = "mac os x"
    elif "windows" in combined_text:
        domain_prefix = "windows"
    elif "web browser" in combined_text or "browser" in combined_text:
        domain_prefix = "web browser"
    elif "computer" in combined_text or "pc" in combined_text or "hardware" in combined_text:
        domain_prefix = "computer"
    elif video_context.strip():
        words = [w for w in re.sub(r'[^a-zA-Z0-9\s]', '', video_context).split() if len(w) > 2][:2]
        if words:
            domain_prefix = " ".join(words)

    extra_refinement = ""
    if "scrolling" in topic_lower or "scroll" in topic_lower:
        extra_refinement = "gestures page navigation"
    elif "browser" in topic_lower or "web browser" in topic_lower:
        extra_refinement = "using internet navigation"
    elif "desktop" in topic_lower or "setup" in topic_lower:
        extra_refinement = "pc hardware connection setup"
    elif "application" in topic_lower or "apps" in topic_lower:
        extra_refinement = "creating documents office software"
    elif topic_lower == "video processor":
        extra_refinement = "graphics display"
    elif topic_lower == "memory":
        extra_refinement = "ram hardware"

    parts = []
    if domain_prefix and domain_prefix not in topic_lower:
        parts.append(domain_prefix)

    parts.append(topic_clean)

    if not is_fallback and extra_refinement and extra_refinement not in topic_lower:
        parts.append(extra_refinement)

    parts.append("explained tutorial")
    return " ".join(parts)


async def search_youtube_async(query: str, max_results: int = 6) -> List[YouTubeRecommendationDto]:
    api_key = settings.YOUTUBE_API_KEY
    if api_key and api_key.strip():
        try:
            encoded_query = urllib.parse.quote(query)
            url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults={max_results}&q={encoded_query}&key={api_key}"
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                if resp.is_success:
                    data = resp.json()
                    results = []
                    for item in data.get("items", []):
                        v_id = item.get("id", {}).get("videoId")
                        snippet = item.get("snippet", {})
                        if v_id:
                            results.append(
                                YouTubeRecommendationDto(
                                    youtube_video_id=v_id,
                                    title=snippet.get("title", ""),
                                    channel_name=snippet.get("channelTitle", "YouTube"),
                                    description=snippet.get("description", ""),
                                    thumbnail_url=f"https://i.ytimg.com/vi/{v_id}/mqdefault.jpg",
                                    url=f"https://www.youtube.com/watch?v={v_id}",
                                )
                            )
                    if results:
                        return results
        except Exception as ex:
            logger.warning(f"YouTube Data API failed for '{query}': {ex}")

    # Fallback to yt-dlp search
    try:
        def _search_yt_dlp():
            ydl_opts = {
                "quiet": True,
                "no_warnings": True,
                "extract_flat": "in_playlist",
                "skip_download": True,
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f"ytsearch{max_results}:{query}", download=False)
                entries = info.get("entries", [])
                out = []
                for e in entries:
                    v_id = e.get("id")
                    if v_id:
                        out.append(
                            YouTubeRecommendationDto(
                                youtube_video_id=v_id,
                                title=e.get("title", ""),
                                channel_name=e.get("uploader", "YouTube"),
                                description=f"Learn more about {e.get('title', '')}.",
                                thumbnail_url=f"https://i.ytimg.com/vi/{v_id}/mqdefault.jpg",
                                url=f"https://www.youtube.com/watch?v={v_id}",
                            )
                        )
                return out

        import asyncio
        return await asyncio.to_thread(_search_yt_dlp)
    except Exception as ex:
        logger.warning(f"yt-dlp search fallback failed: {ex}")
        return []


def calculate_relevance_score(
    video: YouTubeRecommendationDto,
    topic: str,
    video_context: str,
    sample_question: str,
    correct_answer: str,
    explanation: str,
) -> float:
    score = 0.0
    title_lower = video.title.lower()
    desc_lower = video.description.lower()
    combined_vid_text = f"{title_lower} {desc_lower}"

    topic_lower = topic.lower()
    topic_words = set(topic_lower.split())

    # 1. Topic word matching in title
    matched_title_words = sum(1 for w in topic_words if w in title_lower)
    score += (matched_title_words / max(len(topic_words), 1)) * 3.0

    # 2. Educational keyword matching
    for kw in EDUCATIONAL_KEYWORDS:
        if kw in title_lower:
            score += 1.5
            break

    # 3. Topic word in description
    for w in topic_words:
        if w in desc_lower:
            score += 0.5

    # 4. Learning Concept Alignment
    combined_concept_text = f"{video_context} {sample_question} {correct_answer} {explanation}".lower()
    stopwords = {"in", "the", "video", "how", "is", "of", "and", "on", "a", "page", "described", "what", "does", "to", "for", "it", "with", "this", "or", "an", "be", "are"}
    concept_words = {
        w for w in re.sub(r'[^a-zA-Z0-9\s]', '', combined_concept_text).split()
        if len(w) > 3 and w not in stopwords
    }

    matched_concept = sum(1 for cw in concept_words if cw in title_lower)
    score += matched_concept * 2.5

    # 5. Source Domain Match Boost
    domain_terms = ["mac", "macos", "macbook", "windows", "computer", "pc", "graphics", "gpu", "hardware", "storage", "browser", "internet", "desktop"]
    matched_domain = sum(1 for dt in domain_terms if dt in combined_concept_text and dt in title_lower)
    score += matched_domain * 3.0

    # 6. Off-domain cross-disambiguation penalties
    for rule in OFF_DOMAIN_RULES:
        is_source_in_domain = any(ind in combined_concept_text for ind in rule["source_indicators"])
        if is_source_in_domain:
            for bad_kw in rule["bad_keywords"]:
                if bad_kw in combined_vid_text:
                    score += rule["penalty"]
                    break

    return score


async def get_quiz_attempt_recommendations_async(
    attempt_id: int,
    user_id: int,
    db: Session,
) -> RecommendationResponseDto:
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id).first()
    if not attempt:
        return RecommendationResponseDto(
            attempt_id=attempt_id,
            message="Quiz attempt not found.",
        )

    if attempt.user_id != user_id:
        return RecommendationResponseDto(
            attempt_id=attempt_id,
            message="Access denied.",
        )

    video_context = ""
    first_vid = (
        db.query(Video)
        .join(QuizAttemptVideo, Video.id == QuizAttemptVideo.video_id)
        .filter(QuizAttemptVideo.quiz_attempt_id == attempt_id)
        .first()
    ) or attempt.video
    if first_vid:
        video_context = clean_source_video_title(first_vid.original_filename or first_vid.filename)

    questions = (
        db.query(QuizAttemptQuestion)
        .filter(QuizAttemptQuestion.quiz_attempt_id == attempt_id)
        .order_by(QuizAttemptQuestion.question_index.asc())
        .all()
    )

    if not questions:
        return RecommendationResponseDto(
            attempt_id=attempt_id,
            message="No question data found for this attempt.",
        )

    incorrect_questions = [q for q in questions if not q.is_correct]
    if not incorrect_questions:
        return RecommendationResponseDto(
            attempt_id=attempt_id,
            message="Great work! You didn't have any clear weak areas in this quiz.",
        )

    topic_data: Dict[str, Dict[str, Any]] = {}
    for q in incorrect_questions:
        topic_clean = knowledge_profile_service.normalize_topic_name(q.topic)
        if topic_clean not in topic_data:
            topic_data[topic_clean] = {
                "count": 0,
                "sample_question": q.question_text,
                "correct_answer": str(q.correct_answer),
                "explanation": q.explanation or "",
            }
        topic_data[topic_clean]["count"] += 1

    sorted_weak_topics = sorted(
        [{"topic": k, **v} for k, v in topic_data.items()],
        key=lambda x: x["count"],
        reverse=True,
    )

    top_weak_topics = sorted_weak_topics[:3]
    seen_video_ids: Set[str] = set()
    final_recs: List[YouTubeRecommendationDto] = []

    for t_info in top_weak_topics:
        query = build_contextual_query(
            t_info["topic"],
            video_context,
            t_info["sample_question"],
            t_info["correct_answer"],
            t_info["explanation"],
            is_fallback=False,
        )
        candidates = await search_youtube_async(query, max_results=6)

        if len(candidates) < 2:
            fallback_q = build_contextual_query(
                t_info["topic"],
                video_context,
                t_info["sample_question"],
                t_info["correct_answer"],
                t_info["explanation"],
                is_fallback=True,
            )
            if fallback_q != query:
                fb_candidates = await search_youtube_async(fallback_q, max_results=6)
                for fc in fb_candidates:
                    if not any(c.youtube_video_id == fc.youtube_video_id for c in candidates):
                        candidates.append(fc)

        scored = []
        for cand in candidates:
            if cand.youtube_video_id in seen_video_ids:
                continue
            rel_score = calculate_relevance_score(
                cand,
                t_info["topic"],
                video_context,
                t_info["sample_question"],
                t_info["correct_answer"],
                t_info["explanation"],
            )
            if rel_score >= MIN_RELEVANCE_THRESHOLD:
                scored.append((rel_score, cand))

        scored.sort(key=lambda x: x[0], reverse=True)

        picked = 0
        for _, cand in scored:
            seen_video_ids.add(cand.youtube_video_id)
            cand.topic = t_info["topic"]
            final_recs.append(cand)
            picked += 1
            if len(final_recs) >= 6 or picked >= 2:
                break

        if len(final_recs) >= 6:
            break

    clean_weak_topics = [
        WeakTopicDto(topic=w["topic"], incorrect_count=w["count"])
        for w in sorted_weak_topics
    ]

    msg = "No highly relevant videos were found for this topic yet." if not final_recs else None

    return RecommendationResponseDto(
        attempt_id=attempt_id,
        weak_topics=clean_weak_topics,
        recommendations=final_recs,
        message=msg,
    )
