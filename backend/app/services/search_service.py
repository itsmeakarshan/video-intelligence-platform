import re
import math
from typing import List, Optional, Tuple, Set
from dataclasses import dataclass, field
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.transcript import Transcript, TranscriptSegment, TranscriptChunk
from app.models.video import Video
from app.schemas.chat import SourceDto


@dataclass
class MentionOccurrence:
    video_id: Optional[int]
    video_title: str
    start_time: float
    end_time: float
    timestamp_str: str
    text: str


@dataclass
class SearchResult:
    context: str
    sources: List[SourceDto] = field(default_factory=list)
    is_mention_question: bool = False
    mention_occurrences: List[MentionOccurrence] = field(default_factory=list)


def format_timestamp(seconds: float) -> str:
    secs = int(math.floor(seconds))
    hrs = secs // 3600
    mins = (secs % 3600) // 60
    rem_secs = secs % 60
    if hrs > 0:
        return f"{hrs}:{mins:02d}:{rem_secs:02d}"
    return f"{mins}:{rem_secs:02d}"


def is_mention_query(question: str) -> bool:
    if not question:
        return False
    q = question.lower().strip()
    patterns = [
        r'\b(where|when|at what time|what time|what timestamp|what point|how many times|which part|which video)\b.*\b(mention\w*|talk\w*|discuss\w*|say\w*|said|state\w*|show\w*|appear\w*|bring\w* up|brought\w* up|cover\w*|refer\w*|occur\w*|happen\w*|explain\w*|defined|introduce\w*)\b',
        r'\bwhere (is|are|was|were|can i find)\b',
        r'\bwhen (is|are|was|were|does|did)\b',
        r'\b(find all|list all|every time|all times|all occurrences|timestamps? for|timestamps? of|where in the video)\b',
    ]
    return any(re.search(p, q) for p in patterns)


STOPWORDS: Set[str] = {
    "what", "is", "the", "a", "an", "in", "of", "to", "and", "or", "for", "how", "why",
    "where", "when", "does", "do", "did", "done", "can", "could", "would", "should", "tell",
    "me", "about", "explain", "explains", "explained", "explaining",
    "video", "videos", "lesson", "lessons", "course", "courses", "lecture", "lectures",
    "clip", "clips", "part", "parts", "section", "sections", "timestamp", "timestamps",
    "mentioned", "mention", "mentions", "mentioning",
    "talked", "talk", "talks", "talking",
    "discussed", "discuss", "discusses", "discussing",
    "say", "says", "said", "saying",
    "state", "states", "stated", "stating",
    "show", "shows", "showed", "shown", "showing",
    "appear", "appears", "appeared", "appearing",
    "occur", "occurs", "occurred", "occurring",
    "many", "times", "time", "point", "points", "moment", "moments", "place", "places",
    "this", "that", "these", "those", "it", "its", "they", "them", "their", "theirs",
    "he", "she", "him", "her", "his", "hers", "we", "us", "our", "ours", "you", "your", "yours",
    "be", "been", "being", "are", "was", "were", "am",
    "have", "has", "had", "having",
    "with", "at", "by", "from", "on", "off", "into", "onto", "over", "under", "above", "below",
    "as", "so", "than", "too", "very", "just", "now", "then", "there", "here",
    "which", "who", "whom", "whose", "find", "all", "any", "some", "every", "each",
    "both", "either", "neither", "also", "only", "other", "another", "such",
}


def extract_keywords(query: str) -> List[str]:
    clean = re.sub(r'[^a-zA-Z0-9\s]', ' ', query.lower())
    tokens = clean.split()
    return [t for t in tokens if len(t) > 2 and t not in STOPWORDS]


def score_text_relevance(query_terms: List[str], text: str, exact_phrases: List[str]) -> float:
    if not text:
        return 0.0
    text_lower = text.lower()
    score = 0.0

    for phrase in exact_phrases:
        if phrase and phrase in text_lower:
            score += 25.0

    words = re.sub(r'[^a-zA-Z0-9\s]', ' ', text_lower).split()
    word_freq = {}
    for w in words:
        word_freq[w] = word_freq.get(w, 0) + 1

    for term in query_terms:
        count = word_freq.get(term, 0)
        if count > 0:
            score += 5.0 + min(count, 5) * 2.0
        elif term in text_lower:
            score += 2.0
        elif any(w.startswith(term[:4]) for w in word_freq if len(term) >= 5):
            score += 1.0

    return score


def refine_start_time_to_segment(
    chunk: TranscriptChunk,
    keywords: List[str],
    exact_phrases: List[str],
    db: Session,
) -> float:
    if not keywords and not exact_phrases:
        return chunk.start_time
    try:
        segs = (
            db.query(TranscriptSegment)
            .filter(
                TranscriptSegment.transcript_id == chunk.transcript_id,
                TranscriptSegment.start_time >= chunk.start_time - 0.5,
                TranscriptSegment.end_time <= chunk.end_time + 0.5,
            )
            .order_by(TranscriptSegment.start_time.asc())
            .all()
        )
        for seg in segs:
            if score_text_relevance(keywords, seg.text, exact_phrases) > 0:
                return seg.start_time
    except Exception:
        pass
    return chunk.start_time


def search(
    query: str,
    db: Session,
    user_id: Optional[int] = None,
    accessible_video_ids: Optional[List[int]] = None,
    course_id: Optional[int] = None,
    top_k: int = 6,
) -> SearchResult:
    keywords = extract_keywords(query)
    clean_q = re.sub(r'[^a-zA-Z0-9\s]', ' ', query.lower()).strip()
    clean_non_stop = " ".join([w for w in clean_q.split() if w not in STOPWORDS])
    exact_phrases = [clean_non_stop] if len(clean_non_stop.split()) >= 2 else []
    if len(clean_q.split()) >= 2 and clean_q != clean_non_stop:
        exact_phrases.append(clean_q)

    is_mention = is_mention_query(query)

    # 1. High-precision Segment search for mention / timestamp queries
    if is_mention:
        q_segs = (
            db.query(TranscriptSegment, Video)
            .join(Transcript, TranscriptSegment.transcript_id == Transcript.id)
            .join(Video, Transcript.video_id == Video.id)
        )
        if course_id is not None:
            q_segs = q_segs.filter(Video.course_id == course_id)
        if accessible_video_ids is not None:
            if accessible_video_ids:
                q_segs = q_segs.filter(Video.id.in_(accessible_video_ids))
            else:
                return SearchResult(context="", sources=[], is_mention_question=True, mention_occurrences=[])

        all_segs = q_segs.all()
        scored_segs: List[Tuple[float, TranscriptSegment, Video]] = []
        for seg, video in all_segs:
            s = score_text_relevance(keywords, seg.text, exact_phrases)
            if s > 0:
                scored_segs.append((s, seg, video))

        if not scored_segs:
            return SearchResult(
                context="",
                sources=[],
                is_mention_question=True,
                mention_occurrences=[],
            )

        # Cluster contiguous / nearby segments of same video into occurrences
        scored_segs.sort(key=lambda x: (x[2].id, x[1].start_time))
        occurrences: List[MentionOccurrence] = []
        current_cluster: List[Tuple[TranscriptSegment, Video]] = []

        for _, seg, video in scored_segs:
            if not current_cluster:
                current_cluster.append((seg, video))
            else:
                last_seg, last_vid = current_cluster[-1]
                if last_vid.id == video.id and (seg.start_time - last_seg.end_time) <= 6.0:
                    current_cluster.append((seg, video))
                else:
                    first_seg, vid = current_cluster[0]
                    last_s = current_cluster[-1][0]
                    merged_text = " ".join([s.text.strip() for s, _ in current_cluster])
                    title = vid.original_filename or vid.filename or f"Video #{vid.id}"
                    occurrences.append(
                        MentionOccurrence(
                            video_id=vid.id,
                            video_title=title,
                            start_time=first_seg.start_time,
                            end_time=last_s.end_time,
                            timestamp_str=format_timestamp(first_seg.start_time),
                            text=merged_text,
                        )
                    )
                    current_cluster = [(seg, video)]

        if current_cluster:
            first_seg, vid = current_cluster[0]
            last_s = current_cluster[-1][0]
            merged_text = " ".join([s.text.strip() for s, _ in current_cluster])
            title = vid.original_filename or vid.filename or f"Video #{vid.id}"
            occurrences.append(
                MentionOccurrence(
                    video_id=vid.id,
                    video_title=title,
                    start_time=first_seg.start_time,
                    end_time=last_s.end_time,
                    timestamp_str=format_timestamp(first_seg.start_time),
                    text=merged_text,
                )
            )

        sources = [
            SourceDto(
                video_id=occ.video_id,
                video_title=occ.video_title,
                start_time=occ.start_time,
                end_time=occ.end_time,
            )
            for occ in occurrences
        ]

        return SearchResult(
            context="MENTION_SEARCH",
            sources=sources,
            is_mention_question=True,
            mention_occurrences=occurrences,
        )

    # 2. Chunk-level search for conceptual & general questions
    q_chunks = (
        db.query(TranscriptChunk, Video)
        .join(Transcript, TranscriptChunk.transcript_id == Transcript.id)
        .join(Video, Transcript.video_id == Video.id)
    )

    if course_id is not None:
        q_chunks = q_chunks.filter(Video.course_id == course_id)

    if accessible_video_ids is not None:
        if accessible_video_ids:
            q_chunks = q_chunks.filter(Video.id.in_(accessible_video_ids))
        else:
            return SearchResult(context="NO_RELEVANT_VIDEO_CONTEXT")

    all_chunks_with_videos = q_chunks.all()
    if not all_chunks_with_videos:
        return SearchResult(context="NO_RELEVANT_VIDEO_CONTEXT")

    scored_items: List[Tuple[float, TranscriptChunk, Video]] = []
    for chunk, video in all_chunks_with_videos:
        s = score_text_relevance(keywords, chunk.text, exact_phrases)
        if s > 0:
            scored_items.append((s, chunk, video))

    scored_items.sort(key=lambda x: x[0], reverse=True)

    if not scored_items:
        if keywords:
            return SearchResult(context="NO_RELEVANT_VIDEO_CONTEXT")
        scored_items = [(0.0, chunk, video) for chunk, video in all_chunks_with_videos[:top_k]]

    # Normal Search: Pick top non-overlapping chunks
    selected_items: List[Tuple[TranscriptChunk, Video]] = []
    for _, chunk, video in scored_items:
        is_overlapping = any(
            sel_v.id == video.id and abs(sel_c.start_time - chunk.start_time) < 15.0
            for sel_c, sel_v in selected_items
        )
        if not is_overlapping:
            selected_items.append((chunk, video))
        if len(selected_items) >= top_k:
            break

    if not selected_items:
        selected_items = [(chunk, video) for _, chunk, video in scored_items[:top_k]]

    sources: List[SourceDto] = []
    context_blocks: List[str] = []

    for idx, (chunk, video) in enumerate(selected_items, start=1):
        title = video.original_filename or video.filename or f"Video #{video.id}"
        # Refine start_time to exact segment where keyword is spoken
        refined_start = refine_start_time_to_segment(chunk, keywords, exact_phrases, db)
        ts_start = format_timestamp(refined_start)
        ts_end = format_timestamp(chunk.end_time)

        block = f"""SOURCE {idx}:
VIDEO: {title} (ID: {video.id})
TIMESTAMPS: {ts_start} - {ts_end} (Seconds: {refined_start:.1f} to {chunk.end_time:.1f})
TRANSCRIPT:
{chunk.text.strip()}"""
        context_blocks.append(block)

        sources.append(
            SourceDto(
                video_id=video.id,
                video_title=title,
                chunk_id=chunk.id,
                start_time=refined_start,
                end_time=chunk.end_time,
            )
        )

    context_str = "\n\n---\n\n".join(context_blocks)
    return SearchResult(
        context=context_str,
        sources=sources,
        is_mention_question=False,
    )
