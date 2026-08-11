import logging
import os
import re
import urllib.parse
import urllib.request
import json
from sqlalchemy.orm import Session
import yt_dlp

from app.models.quiz_attempt import QuizAttempt
from app.models.quiz_attempt_question import QuizAttemptQuestion
from app.core.config import settings

logger = logging.getLogger(__name__)

EDUCATIONAL_KEYWORDS = {"tutorial", "explained", "guide", "how to", "basics", "course", "learn", "introduction", "mastery", "overview"}

# Hard Relevance Gate Threshold: Quality > Quantity (Relevance score must be >= 5.0)
MIN_RELEVANCE_THRESHOLD = 5.0

# Generic Off-Domain Cross-Disambiguation Penalty Rules
OFF_DOMAIN_RULES = [
    {
        # Non-game-dev OS / Computer Usage context vs Game Development & Code Engines
        "source_indicators": {"mac os x", "macos", "windows", "computer basics", "touch screen", "scrolling", "desktop", "operating system"},
        "bad_keywords": {"scratch", "unity", "unreal", "game maker", "godot", "game dev", "game background", "sprite", "game engine", "code tutorial", "css scrolling"},
        "penalty": -25.0
    },
    {
        # Everyday Web Browsing / Email context vs Browser Engine Programming & Architecture
        "source_indicators": {"web browser", "browser", "internet", "visiting websites", "check email", "google chrome", "safari", "firefox"},
        "bad_keywords": {"browser engine", "chromium source code", "browser architecture", "v8 engine", "building a browser", "c++ browser", "browser security research"},
        "penalty": -25.0
    },
    {
        # Desktop Computer Setup context vs Extreme Overclocking & Custom PC Modding
        "source_indicators": {"desktop computer", "setup", "connecting", "peripherals", "monitor", "keyboard", "cables", "pc setup"},
        "bad_keywords": {"liquid nitrogen", "extreme overclocking", "bios flashing", "custom loop water cooling", "delidding", "overclocking record"},
        "penalty": -25.0
    },
    {
        # End-user Office / Desktop Applications context vs Mobile App Software Development
        "source_indicators": {"applications", "apps", "create documents", "word processing", "spreadsheet", "office apps"},
        "bad_keywords": {"flutter", "react native", "swiftui", "android studio", "xcode", "ios app development", "android app development", "mobile app dev"},
        "penalty": -25.0
    },
    {
        # Computer hardware/graphics context vs Commercial LED Video Walls / Stage Controllers
        "source_indicators": {"computer", "pc", "graphics", "gpu", "hardware", "desktop", "case", "motherboard", "display"},
        "bad_keywords": {"led wall", "video wall", "vdwall", "led display processor", "stage led", "billboard", "hdp-601", "lvp605", "novastar", "colorlight", "video wall processor"},
        "penalty": -25.0
    },
    {
        # Computer Memory (RAM) vs Psychology / Brain Memory
        "source_indicators": {"computer", "pc", "ram", "hardware", "bytes", "storage", "system memory"},
        "bad_keywords": {"psychology", "brain memory", "human memory", "cognitive", "dementia", "memorization", "neuroscience"},
        "penalty": -25.0
    },
    {
        # Computer Drive (Hard Drive/SSD) vs Driving Automobiles / Golf
        "source_indicators": {"computer", "pc", "hard drive", "storage", "disk", "ssd", "hdd"},
        "bad_keywords": {"driving test", "car drive", "golf drive", "test drive", "driveway", "road test"},
        "penalty": -25.0
    },
    {
        # Computer Case vs Legal Cases / Phone Cases
        "source_indicators": {"computer", "pc", "tower", "hardware", "chassis"},
        "bad_keywords": {"court case", "legal case", "lawyer", "iphone case", "phone case", "leather case", "briefcase"},
        "penalty": -25.0
    }
]


def clean_source_video_title(title: str) -> str:
    """
    Cleans raw video filenames to extract clear domain titles.
    e.g., 'Mac OS X Basics.mp4' -> 'Mac OS X Basics'
    """
    if not title:
        return ""
    title = re.sub(r'\.(mp4|mkv|avi|mov|webm)$', '', title, flags=re.I)
    title = re.sub(r'[\-_]', ' ', title)
    title = re.sub(r'\b(720p|1080p|hd|4k|video|official|synthetic|user|\d+)\b', ' ', title, flags=re.I)
    return title.strip()


def extract_weak_topics_from_attempt(attempt_id: int, db: Session) -> tuple[list[dict], bool, bool, str]:
    """
    Extracts rich weak topics with original question, correct answer, and explanation.
    Returns (weak_topics_list, has_question_data, is_perfect_score, video_context_title).
    """
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id).first()
    if not attempt:
        return [], False, False, ""

    video_context_title = ""
    if attempt.videos:
        video_context_title = clean_source_video_title(attempt.videos[0].original_filename or attempt.videos[0].filename)
    elif attempt.video:
        video_context_title = clean_source_video_title(attempt.video.original_filename or attempt.video.filename)

    questions = (
        db.query(QuizAttemptQuestion)
        .filter(QuizAttemptQuestion.quiz_attempt_id == attempt_id)
        .order_by(QuizAttemptQuestion.question_index.asc())
        .all()
    )

    if not questions:
        return [], False, False, video_context_title

    incorrect_questions = [q for q in questions if not q.is_correct]

    if not incorrect_questions:
        return [], True, True, video_context_title

    # Map weak topics with full concept details
    topic_data: dict[str, dict] = {}
    for q in incorrect_questions:
        topic_name = q.topic.strip() if q.topic else "General Concept"
        topic_clean = " ".join(word.capitalize() for word in topic_name.split())
        if topic_clean not in topic_data:
            topic_data[topic_clean] = {
                "count": 0,
                "sample_question": q.question_text,
                "correct_answer": q.correct_answer if hasattr(q, "correct_answer") else "",
                "explanation": q.explanation if q.explanation else ""
            }
        topic_data[topic_clean]["count"] += 1

    sorted_topics = sorted(topic_data.items(), key=lambda item: item[1]["count"], reverse=True)

    weak_topics = [
        {
            "topic": topic,
            "incorrect_count": info["count"],
            "sample_question": info["sample_question"],
            "correct_answer": info["correct_answer"],
            "explanation": info["explanation"]
        }
        for topic, info in sorted_topics
    ]

    return weak_topics, True, False, video_context_title


def build_contextual_query(
    topic: str,
    video_context: str = "",
    sample_question: str = "",
    correct_answer: str = "",
    explanation: str = "",
    is_fallback: bool = False
) -> str:
    """
    Constructs a context-rich, disambiguated YouTube search query grounded in the learning objective.
    Example:
    topic: 'Touch Screen Scrolling'
    video_context: 'Mac OS X Basics'
    sample_question: 'In the Mac OS X Basics video, how is the movement of pushing content up and down on a page described?'
    -> 'mac os x touch screen scrolling page navigation explained'
    """
    topic_clean = topic.strip()
    topic_lower = topic_clean.lower()
    combined_text = f"{video_context} {sample_question} {correct_answer} {explanation}".lower()

    # Domain prefix extraction
    domain_prefix = ""
    if "mac os" in combined_text or "macos" in combined_text or "mac" in combined_text:
        domain_prefix = "mac os x"
    elif "windows" in combined_text:
        domain_prefix = "windows"
    elif "web browser" in combined_text or "browser" in combined_text:
        domain_prefix = "web browser"
    elif "computer" in combined_text or "pc" in combined_text or "hardware" in combined_text:
        domain_prefix = "computer"
    elif video_context:
        words = [w.lower() for w in re.sub(r'[^a-zA-Z0-9\s]', '', video_context).split() if len(w) > 2]
        if words:
            domain_prefix = " ".join(words[:2])

    # Disambiguation & learning objective refinements
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

    query_parts = []
    if domain_prefix and domain_prefix not in topic_lower:
        query_parts.append(domain_prefix)

    query_parts.append(topic_clean)

    if not is_fallback and extra_refinement and extra_refinement not in topic_lower:
        query_parts.append(extra_refinement)

    query_parts.append("explained tutorial")

    return " ".join(query_parts)


def search_youtube_api(query: str, api_key: str, max_results: int = 6) -> list[dict]:
    """
    Searches YouTube using the official YouTube Data API v3.
    """
    try:
        encoded_query = urllib.parse.quote(query)
        url = (
            f"https://www.googleapis.com/youtube/v3/search"
            f"?part=snippet&type=video&maxResults={max_results}&q={encoded_query}&key={api_key}"
        )
        req = urllib.request.Request(url, headers={"User-Agent": "VideoIntelligencePlatform/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            items = data.get("items", [])
            results = []
            for item in items:
                v_id = item.get("id", {}).get("videoId")
                snippet = item.get("snippet", {})
                if v_id and snippet:
                    results.append({
                        "youtube_video_id": v_id,
                        "title": snippet.get("title", ""),
                        "channel_name": snippet.get("channelTitle", "YouTube Educational"),
                        "description": snippet.get("description", ""),
                        "thumbnail_url": f"https://i.ytimg.com/vi/{v_id}/mqdefault.jpg",
                        "url": f"https://www.youtube.com/watch?v={v_id}"
                    })
            return results
    except Exception as e:
        logger.warning(f"YouTube Data API search failed for query '{query}': {e}")
        return []


def search_youtube_ytdlp(query: str, max_results: int = 6) -> list[dict]:
    """
    Searches YouTube using yt_dlp as a fallback when no API key is set.
    """
    try:
        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": "in_playlist",
            "skip_download": True,
            "default_search": f"ytsearch{max_results}"
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            res = ydl.extract_info(query, download=False)
            entries = res.get("entries", []) if res else []
            results = []
            for entry in entries:
                v_id = entry.get("id")
                title = entry.get("title")
                if v_id and title:
                    results.append({
                        "youtube_video_id": v_id,
                        "title": title,
                        "channel_name": entry.get("uploader") or entry.get("channel") or "YouTube",
                        "description": entry.get("description") or f"Learn more about {query}.",
                        "thumbnail_url": f"https://i.ytimg.com/vi/{v_id}/mqdefault.jpg",
                        "url": f"https://www.youtube.com/watch?v={v_id}"
                    })
            return results
    except Exception as e:
        logger.warning(f"yt_dlp YouTube search failed for query '{query}': {e}")
        return []


def search_youtube_videos_contextual(
    topic: str,
    video_context: str = "",
    sample_question: str = "",
    correct_answer: str = "",
    explanation: str = "",
    max_results: int = 6
) -> list[dict]:
    """
    Searches YouTube using primary contextual query with a controlled domain-preserving fallback.
    """
    primary_query = build_contextual_query(
        topic,
        video_context=video_context,
        sample_question=sample_question,
        correct_answer=correct_answer,
        explanation=explanation,
        is_fallback=False
    )
    api_key = getattr(settings, "YOUTUBE_API_KEY", None) or os.getenv("YOUTUBE_API_KEY")

    results = []
    if api_key and api_key.strip():
        results = search_youtube_api(primary_query, api_key, max_results=max_results)

    if not results:
        results = search_youtube_ytdlp(primary_query, max_results=max_results)

    # Controlled fallback if primary query returns too few results
    if len(results) < 2:
        fallback_query = build_contextual_query(
            topic,
            video_context=video_context,
            sample_question=sample_question,
            correct_answer=correct_answer,
            explanation=explanation,
            is_fallback=True
        )
        if fallback_query != primary_query:
            fallback_results = []
            if api_key and api_key.strip():
                fallback_results = search_youtube_api(fallback_query, api_key, max_results=max_results)
            if not fallback_results:
                fallback_results = search_youtube_ytdlp(fallback_query, max_results=max_results)

            existing_ids = {r["youtube_video_id"] for r in results}
            for fr in fallback_results:
                if fr["youtube_video_id"] not in existing_ids:
                    results.append(fr)
                    existing_ids.add(fr["youtube_video_id"])

    return results


def calculate_relevance_score(
    video: dict,
    topic: str,
    video_context: str = "",
    sample_question: str = "",
    correct_answer: str = "",
    explanation: str = ""
) -> float:
    """
    Calculates strict multidimensional semantic relevance score for candidate videos.
    Prioritizes Concept Match & Source Domain Match over simple keyword overlap.
    Applies heavy off-domain cross-context penalties (-25.0).
    """
    score = 0.0
    title_lower = video.get("title", "").lower()
    desc_lower = video.get("description", "").lower()
    combined_video_text = f"{title_lower} {desc_lower}"

    topic_lower = topic.lower()
    topic_words = set(topic_lower.split())

    # 1. Topic word matching in title
    matched_title_words = [w for w in topic_words if w in title_lower]
    score += (len(matched_title_words) / max(len(topic_words), 1)) * 3.0

    # 2. Educational keyword matching
    for kw in EDUCATIONAL_KEYWORDS:
        if kw in title_lower:
            score += 1.5

    # 3. Topic word matching in description
    for w in topic_words:
        if w in desc_lower:
            score += 0.5

    # 4. Learning Concept Alignment (Matching question, answer, explanation keywords)
    combined_concept_text = f"{video_context} {sample_question} {correct_answer} {explanation}".lower()
    
    # Extract concept keywords from original question & explanation (ignoring common stopwords)
    stopwords = {"in", "the", "video", "how", "is", "of", "and", "on", "a", "page", "described", "what", "does", "to", "for", "it", "with", "this", "or", "an", "be", "are"}
    concept_words = set(re.sub(r'[^a-zA-Z0-9\s]', '', combined_concept_text).split()) - stopwords

    matched_concept = [cw for cw in concept_words if len(cw) > 3 and cw in title_lower]
    score += len(matched_concept) * 2.5

    # 5. Source Domain Match Boost
    domain_terms = {"mac", "macos", "macbook", "windows", "computer", "pc", "graphics", "gpu", "hardware", "storage", "browser", "internet", "desktop"}
    matched_domain = [dt for dt in domain_terms if dt in combined_concept_text and dt in title_lower]
    score += len(matched_domain) * 3.0

    # 6. Off-Domain Cross-Disambiguation Rules Application
    for rule in OFF_DOMAIN_RULES:
        # Check if source learning context aligns with the rule's domain
        is_source_in_domain = any(indicator in combined_concept_text for indicator in rule["source_indicators"])
        if is_source_in_domain:
            for bad_kw in rule["bad_keywords"]:
                if bad_kw in combined_video_text:
                    logger.info(f"Applying strict off-domain penalty ({rule['penalty']}) to '{video.get('title')}' for bad keyword '{bad_kw}'")
                    score += rule["penalty"]
                    break

    return score


def rank_and_filter_recommendations(
    weak_topics: list[dict],
    candidates_by_topic: dict[str, list[dict]],
    video_context: str = "",
    max_total: int = 6
) -> list[dict]:
    """
    Ranks candidates across weak topics, applies strict Hard Relevance Gate (>= 5.0), deduplicates videos, and returns top recommendations.
    Quality > Quantity: If fewer candidates pass >= 5.0, returns fewer recommendations.
    """
    seen_video_ids = set()
    final_recommendations = []

    for topic_info in weak_topics:
        topic_name = topic_info["topic"]
        sample_q = topic_info.get("sample_question", "")
        corr_ans = topic_info.get("correct_answer", "")
        expl = topic_info.get("explanation", "")

        candidates = candidates_by_topic.get(topic_name, [])

        scored = []
        for cand in candidates:
            v_id = cand["youtube_video_id"]
            if v_id in seen_video_ids:
                continue
            rel_score = calculate_relevance_score(
                cand,
                topic_name,
                video_context=video_context,
                sample_question=sample_q,
                correct_answer=corr_ans,
                explanation=expl
            )
            
            # HARD RELEVANCE GATE: Must meet or exceed MIN_RELEVANCE_THRESHOLD (5.0)
            if rel_score >= MIN_RELEVANCE_THRESHOLD:
                scored.append((rel_score, cand))
            else:
                logger.info(f"Rejected candidate '{cand.get('title')}' with score {rel_score:.2f} < threshold {MIN_RELEVANCE_THRESHOLD}")

        scored.sort(key=lambda x: x[0], reverse=True)

        # Pick top 2 candidates per weak topic if available and passing threshold
        picked_count = 0
        for _, cand in scored:
            v_id = cand["youtube_video_id"]
            seen_video_ids.add(v_id)
            rec_card = {**cand, "topic": topic_name}
            final_recommendations.append(rec_card)
            picked_count += 1
            if len(final_recommendations) >= max_total:
                break
            if picked_count >= 2:
                break

        if len(final_recommendations) >= max_total:
            break

    return final_recommendations[:max_total]


def get_quiz_attempt_recommendations(attempt_id: int, user_id: int, db: Session) -> dict:
    """
    Main entry point for generating strict personalized recommendations for a quiz attempt.
    """
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id).first()

    if not attempt:
        return {
            "attempt_id": attempt_id,
            "weak_topics": [],
            "recommendations": [],
            "message": "Quiz attempt not found."
        }

    if attempt.user_id != user_id:
        return {
            "attempt_id": attempt_id,
            "weak_topics": [],
            "recommendations": [],
            "message": "Access denied."
        }

    weak_topics, has_questions, is_perfect, video_context = extract_weak_topics_from_attempt(attempt_id, db)

    if is_perfect:
        return {
            "attempt_id": attempt_id,
            "weak_topics": [],
            "recommendations": [],
            "message": "Great work! You didn't have any clear weak areas in this quiz."
        }

    if not has_questions or not weak_topics:
        return {
            "attempt_id": attempt_id,
            "weak_topics": [],
            "recommendations": [],
            "message": "No specific topic weaknesses detected for this attempt."
        }

    # Fetch YouTube recommendations for top weak topics (max 3 weak topics)
    top_weak_topics = weak_topics[:3]
    candidates_by_topic = {}

    for t_info in top_weak_topics:
        topic_name = t_info["topic"]
        sample_q = t_info.get("sample_question", "")
        corr_ans = t_info.get("correct_answer", "")
        expl = t_info.get("explanation", "")

        candidates = search_youtube_videos_contextual(
            topic=topic_name,
            video_context=video_context,
            sample_question=sample_q,
            correct_answer=corr_ans,
            explanation=expl,
            max_results=6
        )
        candidates_by_topic[topic_name] = candidates

    recommendations = rank_and_filter_recommendations(
        weak_topics=top_weak_topics,
        candidates_by_topic=candidates_by_topic,
        video_context=video_context,
        max_total=6
    )

    clean_weak_topics = [{"topic": wt["topic"], "incorrect_count": wt["incorrect_count"]} for wt in weak_topics]

    message = None
    if not recommendations:
        message = "No highly relevant videos were found for this topic yet."

    return {
        "attempt_id": attempt_id,
        "weak_topics": clean_weak_topics,
        "recommendations": recommendations,
        "message": message
    }
