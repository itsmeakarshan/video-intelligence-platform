import json
import time
from fastapi import HTTPException

from app.services.embedding_service import (
    search_chunks,
    search_segments,
)

from app.services.gemini_service import (
    ask_gemini,
    ask_gemini_stream,
    ask_summary,
    ask_notes,
    ask_quiz,
)


# ============================================================
# SETTINGS
# ============================================================

MAX_CONTEXT_MATCHES = 12
MAX_SEGMENT_SEARCHES = 12

OVERLAP_THRESHOLD = 0.70


# ============================================================
# UTILS
# ============================================================

def _clean_video_ids(video_ids: list | None) -> list[int] | None:
    """Ensures video IDs are properly cast to integers to prevent DB search failures."""
    if not video_ids:
        return None
    
    clean_ids = []
    for vid in video_ids:
        if vid is not None:
            try:
                clean_ids.append(int(vid))
            except (TypeError, ValueError):
                pass
    return clean_ids if clean_ids else None


# ============================================================
# OVERLAP
# ============================================================

def _overlap_ratio(match_a, match_b):

    a_start = match_a.get("start_time")
    a_end = match_a.get("end_time")

    b_start = match_b.get("start_time")
    b_end = match_b.get("end_time")

    if (
        a_start is None
        or a_end is None
        or b_start is None
        or b_end is None
    ):
        return 0.0

    try:

        a_start = float(a_start)
        a_end = float(a_end)

        b_start = float(b_start)
        b_end = float(b_end)

    except (TypeError, ValueError):

        return 0.0

    overlap_start = max(
        a_start,
        b_start
    )

    overlap_end = min(
        a_end,
        b_end
    )

    overlap = max(
        0.0,
        overlap_end - overlap_start
    )

    duration_a = max(
        0.001,
        a_end - a_start
    )

    duration_b = max(
        0.001,
        b_end - b_start
    )

    smaller_duration = min(
        duration_a,
        duration_b
    )

    return overlap / smaller_duration


# ============================================================
# SELECT MATCHES
# ============================================================

def _select_context_matches(matches):

    if not matches:
        return []

    selected = []
    seen_chunk_ids = set()

    for match in matches:

        chunk_id = match.get(
            "chunk_id"
        )

        if chunk_id in seen_chunk_ids:
            continue

        seen_chunk_ids.add(
            chunk_id
        )

        too_similar = False

        for existing in selected:

            if (
                match.get("video_id")
                != existing.get("video_id")
            ):
                continue

            overlap = _overlap_ratio(
                match,
                existing
            )

            if overlap >= OVERLAP_THRESHOLD:

                too_similar = True
                break

        if too_similar:
            continue

        selected.append(
            match
        )

        if len(selected) >= MAX_CONTEXT_MATCHES:
            break

    return selected


# ============================================================
# BUILD CONTEXT
# ============================================================

def build_context(matches):

    if not matches:

        print("=" * 60)
        print("BUILD CONTEXT: NO MATCHES")
        print("=" * 60)

        return (
            "NO_RELEVANT_VIDEO_CONTEXT",
            []
        )

    context_parts = []
    sources = []

    for index, match in enumerate(
        matches,
        start=1
    ):

        text = match.get(
            "text",
            ""
        ).strip()

        if not text:
            continue

        video_id = match.get(
            "video_id"
        )

        video_title = match.get(
            "video_title",
            "Unknown Video"
        )

        start_time = match.get(
            "start_time"
        )

        end_time = match.get(
            "end_time"
        )

        chunk_id = match.get(
            "chunk_id"
        )

        try:

            start_time = float(
                start_time
            )

            end_time = float(
                end_time
            )

        except (
            TypeError,
            ValueError
        ):

            start_time = 0.0
            end_time = 0.0

        # ----------------------------------------------------
        # THIS is the actual text Gemini receives.
        # ----------------------------------------------------

        context_block = f"""
SOURCE {index}

VIDEO TITLE:
{video_title}

VIDEO ID:
{video_id}

SOURCE TIMESTAMP:
{start_time:.2f} - {end_time:.2f}

TRANSCRIPT:
{text}
""".strip()

        context_parts.append(
            context_block
        )

        sources.append(
            {
                "video_id": video_id,
                "video_title": video_title,
                "chunk_id": chunk_id,
                "start_time": start_time,
                "end_time": end_time
            }
        )

    if not context_parts:

        print("=" * 60)
        print("BUILD CONTEXT: TEXT WAS EMPTY")
        print("=" * 60)

        return (
            "NO_RELEVANT_VIDEO_CONTEXT",
            []
        )

    context = (
        "\n\n"
        + "\n\n".join(context_parts)
        + "\n"
    )

    # --------------------------------------------------------
    # DEBUG — VERY IMPORTANT
    # --------------------------------------------------------

    print("=" * 80)
    print("FINAL CONTEXT SENT TO GEMINI")
    print("=" * 80)

    print(context)

    print("=" * 80)

    print(
        f"Context sources: {len(context_parts)}"
    )

    print(
        f"Context characters: {len(context)}"
    )

    print("=" * 80)

    return (
        context,
        sources
    )


# ============================================================
# REFINE TIMESTAMPS
# ============================================================

def _refine_timestamps(
    matches,
    question,
    user_id: int,
):

    refined = []

    searches = 0

    for match in matches:

        original_match = dict(
            match
        )

        video_id = match.get(
            "video_id"
        )

        chunk_start = match.get(
            "start_time"
        )

        chunk_end = match.get(
            "end_time"
        )

        if (
            video_id is None
            or chunk_start is None
            or chunk_end is None
        ):

            refined.append(
                original_match
            )

            continue

        if searches >= MAX_SEGMENT_SEARCHES:

            refined.append(
                original_match
            )

            continue

        try:

            segments = search_segments(
                question,
                user_id,
                int(video_id),
                float(chunk_start),
                float(chunk_end)
            )

            searches += 1

        except Exception as exc:

            print("=" * 60)
            print("TIMESTAMP REFINEMENT ERROR")
            print(exc)
            print("=" * 60)

            refined.append(
                original_match
            )

            continue

        if not segments:

            refined.append(
                original_match
            )

            continue

        best_segment = segments[0]

        # ----------------------------------------------------
        # IMPORTANT:
        #
        # We ONLY change timestamp metadata.
        #
        # We DO NOT replace match["text"].
        # ----------------------------------------------------

        original_match["start_time"] = (
            best_segment.get(
                "start_time"
            )
        )

        original_match["end_time"] = (
            best_segment.get(
                "end_time"
            )
        )

        print("=" * 60)
        print("TIMESTAMP REFINED")
        print("=" * 60)

        print(
            f'Video: {match.get("video_title")}'
        )

        print(
            f'Chunk: '
            f'{chunk_start:.2f} - '
            f'{chunk_end:.2f}'
        )

        print(
            f'Segment: '
            f'{best_segment.get("start_time"):.2f} - '
            f'{best_segment.get("end_time"):.2f}'
        )

        print(
            f'Segment text: '
            f'{best_segment.get("text", "")}'
        )

        print("=" * 60)

        refined.append(
            original_match
        )

    return refined


# ============================================================
# ASK VIDEO
# ============================================================

import re
from app.services.prompt_service import build_mention_prompt

def format_seconds_to_timestamp(seconds: float) -> str:
    total_sec = int(round(seconds))
    hrs = total_sec // 3600
    mins = (total_sec % 3600) // 60
    secs = total_sec % 60
    if hrs > 0:
        return f"{hrs}:{mins:02d}:{secs:02d}"
    else:
        return f"{mins}:{secs:02d}"

def is_mention_question(question: str) -> bool:
    q = question.lower().strip()
    patterns = [
        r"\bwhere\b", r"\bwhen\b", r"\bhow many times\b", r"\bwhere do\b", r"\bwhere does\b",
        r"\bis .* mentioned\b", r"\btalk about\b", r"\bdiscussed\b", r"\bappear\b", r"\boccur\b"
    ]
    return any(re.search(p, q) for p in patterns)

def cluster_mention_occurrences(matches: list) -> list:
    if not matches:
        return []
    sorted_matches = sorted(matches, key=lambda m: float(m.get("start_time", 0.0)))
    clusters = []
    for m in sorted_matches:
        st = float(m.get("start_time", 0.0))
        et = float(m.get("end_time", 0.0))
        v_title = m.get("video_title", "Video")
        v_id = m.get("video_id")
        text = m.get("text", "").strip()
        if not text:
            continue
        merged = False
        for c in clusters:
            if c["video_id"] == v_id and abs(st - c["start_time"]) <= 60.0:
                c["end_time"] = max(c["end_time"], et)
                c["text"] += " " + text
                merged = True
                break
        if not merged:
            clusters.append({
                "video_id": v_id,
                "video_title": v_title,
                "start_time": st,
                "end_time": et,
                "timestamp_str": format_seconds_to_timestamp(st),
                "text": text
            })
    return clusters

def ask_video(
    question: str,
    user_id: int,
    video_ids: list | None = None
):
    print("=" * 80)
    print("VIDEO QUESTION")
    print(f"Question: {question}")
    print("=" * 80)

    clean_vids = _clean_video_ids(video_ids)
    start = time.perf_counter()

    results = search_chunks(question, user_id, clean_vids)
    matches = results.get("matches", [])

    print(f"Semantic Search took {time.perf_counter() - start:.2f} sec")
    print(f"CHROMA MATCHES: {len(matches)}")

    if not matches:
        if is_mention_question(question):
            return {
                "answer": "I couldn't find a relevant mention of the requested topic in the available transcript.",
                "sources": []
            }
        answer = ask_gemini(question=question, context="NO_RELEVANT_VIDEO_CONTEXT")
        return {"answer": answer, "sources": []}

    selected_matches = _select_context_matches(matches)
    refined_matches = _refine_timestamps(selected_matches, question, user_id)

    # --------------------------------------------------------
    # SPECIAL HANDLING: MULTI-MENTION / LOCATION QUESTIONS
    # --------------------------------------------------------
    if is_mention_question(question):
        occurrences = cluster_mention_occurrences(refined_matches)
        if not occurrences:
            return {
                "answer": "I couldn't find a relevant mention of the requested topic in the available transcript.",
                "sources": []
            }

        occ_blocks = []
        sources = []
        for idx, occ in enumerate(occurrences, start=1):
            occ_blocks.append(
                f"OCCURRENCE {idx}\nTimestamp: {occ['timestamp_str']}\nStart Seconds: {occ['start_time']:.1f}\nVideo Title: {occ['video_title']}\nTranscript Text: {occ['text']}"
            )
            sources.append({
                "video_id": occ["video_id"],
                "video_title": occ["video_title"],
                "start_time": occ["start_time"],
                "end_time": occ["end_time"]
            })

        occ_summary = "\n\n".join(occ_blocks)
        prompt = build_mention_prompt(question, occ_summary, len(occurrences))

        print("=" * 80)
        print("CALLING GEMINI FOR MENTION QUESTION")
        print("=" * 80)

        answer = ask_gemini(question=prompt, context="")
        return {
            "answer": answer,
            "sources": sources
        }

    # Standard Q&A flow
    context, sources = build_context(refined_matches)

    if not context or context.strip() == "" or context == "NO_RELEVANT_VIDEO_CONTEXT":
        return {
            "answer": "I couldn't find enough relevant information in the uploaded video to answer your question.",
            "sources": []
        }

    answer = ask_gemini(question=question, context=context)
    return {
        "answer": answer,
        "sources": sources
    }


# ============================================================
# STREAMING
# ============================================================

def ask_video_stream(
    question: str,
    user_id: int,
    video_ids: list | None = None
):

    clean_vids = _clean_video_ids(video_ids)

    results = search_chunks(
        question,
        user_id,
        clean_vids
    )

    matches = results.get(
        "matches",
        []
    )
    

    if not matches:

        return ask_gemini_stream(
            question=question,
            context="NO_RELEVANT_VIDEO_CONTEXT"
        )

    selected_matches = _select_context_matches(
        matches
    )

    refined_matches = _refine_timestamps(
        selected_matches,
        question,
        user_id
    )

    context, _ = build_context(
        refined_matches
    )
    
    if not context or context.strip() == "" or context == "NO_RELEVANT_VIDEO_CONTEXT":
        context = "NO_RELEVANT_VIDEO_CONTEXT"

    return ask_gemini_stream(
        question=question,
        context=context
    )


# ============================================================
# SUMMARY
# ============================================================

def generate_summary(
    user_id: int,
    video_ids: list | None = None
):

    clean_vids = _clean_video_ids(video_ids)

    results = search_chunks(
        "Summarize the uploaded videos.",
        user_id,
        clean_vids
    )

    matches = results.get(
        "matches",
        []
    )
    

    selected_matches = _select_context_matches(
        matches
    )

    context, sources = build_context(
        selected_matches
    )

    answer = ask_summary(
        context
    )

    return {
        "answer": answer,
        "sources": sources
    }


# ============================================================
# NOTES
# ============================================================

def generate_notes(
    user_id: int,
    video_ids: list | None = None
):
    clean_vids = _clean_video_ids(video_ids)

    # Multi-video selection: generate study notes grouped video by video
    if clean_vids and len(clean_vids) > 1:
        all_notes = []
        all_sources = []
        
        for idx, vid_id in enumerate(clean_vids, 1):
            results = search_chunks(
                "Create detailed study notes from the uploaded video.",
                user_id,
                [vid_id]
            )
            matches = results.get("matches", [])
            if not matches:
                continue

            video_title = f"Video #{idx}"
            for m in matches:
                meta = m.get("metadata", {})
                v_name = meta.get("original_filename") or meta.get("title") or meta.get("filename")
                if v_name:
                    video_title = f"Video #{idx}: {v_name}"
                    break

            selected_matches = _select_context_matches(matches)
            context, sources = build_context(selected_matches)

            if context.strip():
                vid_answer = ask_notes(context)
                all_notes.append(f"# {video_title}\n\n{vid_answer}")
                all_sources.extend(sources)

        if all_notes:
            return {
                "answer": "\n\n---\n\n".join(all_notes),
                "sources": all_sources
            }

    # Single video or default fallback
    results = search_chunks(
        "Create detailed study notes from the uploaded videos.",
        user_id,
        clean_vids
    )

    matches = results.get("matches", [])
    selected_matches = _select_context_matches(matches)
    context, sources = build_context(selected_matches)
    answer = ask_notes(context)

    return {
        "answer": answer,
        "sources": sources
    }


# ============================================================
# QUIZ
# ============================================================

def _validate_quiz_response(answer: str) -> str:
    if not answer or not isinstance(answer, str):
        raise HTTPException(
            status_code=500,
            detail="The AI service failed to generate a response. Please try again."
        )

    cleaned = answer.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
        if cleaned.endswith("```"):
            cleaned = cleaned.rsplit("```", 1)[0]
        cleaned = cleaned.strip()

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        print("=" * 60)
        print("QUIZ GENERATION VALIDATION FAILED: Invalid JSON output")
        print(answer)
        print("=" * 60)
        if any(keyword in answer.lower() for keyword in ["quota", "unavailable", "error", "couldn't"]):
            raise HTTPException(status_code=503, detail=answer)
        raise HTTPException(
            status_code=500,
            detail="The AI generated an incomplete or invalid quiz response. Please try again."
        )

    if (
        not isinstance(data, dict)
        or "questions" not in data
        or not isinstance(data["questions"], list)
        or len(data["questions"]) == 0
    ):
        raise HTTPException(
            status_code=500,
            detail="The AI quiz response structure was invalid. Please try again."
        )

    return json.dumps(data)


def generate_quiz(
    user_id: int,
    difficulty: str = "Medium",
    questions: int = 10,
    video_ids: list | None = None
):

    clean_vids = _clean_video_ids(video_ids)

    results = search_chunks(
        "Generate a quiz from the uploaded videos.",
        user_id,
        clean_vids
    )

    matches = results.get(
        "matches",
        []
    )
    

    selected_matches = _select_context_matches(
        matches
    )

    context, sources = build_context(
        selected_matches
    )

    answer = ask_quiz(
        context=context,
        difficulty=difficulty,
        questions=questions
    )

    validated_quiz_json = _validate_quiz_response(answer)

    return {
        "answer": validated_quiz_json,
        "sources": sources
    }
