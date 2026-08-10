import time

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
    question
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

def ask_video(
    question: str,
    video_ids: list | None = None
):

    print("=" * 80)
    print("VIDEO QUESTION")
    print("=" * 80)

    print(
        f"Question: {question}"
    )

    print("=" * 80)

    # --------------------------------------------------------
    # SANITIZE VIDEO IDS
    # --------------------------------------------------------
    clean_vids = _clean_video_ids(video_ids)

    # --------------------------------------------------------
    # STEP 1 — CHROMA SEARCH
    # --------------------------------------------------------

    start = time.perf_counter()

    results = search_chunks(
        question,
        clean_vids
    )

    matches = results.get(
        "matches",
        []
    )
    
    # FALLBACK: If specific video search fails, try searching across all videos
    if not matches and clean_vids is not None:
        print("NO MATCHES WITH EXACT VIDEO_ID. FALLING BACK TO GLOBAL SEARCH.")
        results = search_chunks(question, None)
        matches = results.get("matches", [])

    print(
        f"Semantic Search took "
        f"{time.perf_counter() - start:.2f} sec"
    )

    print("=" * 80)
    print(
        f"CHROMA MATCHES: {len(matches)}"
    )
    print("=" * 80)

    if not matches:

        print(
            "NO CHROMA MATCHES FOUND"
        )

        answer = ask_gemini(
            question=question,
            context="NO_RELEVANT_VIDEO_CONTEXT"
        )

        return {
            "answer": answer,
            "sources": []
        }

    # --------------------------------------------------------
    # PRINT ALL MATCHES
    # --------------------------------------------------------

    for index, match in enumerate(
        matches,
        start=1
    ):

        print(
            f"[{index}] "
            f'{match.get("start_time"):.2f} - '
            f'{match.get("end_time"):.2f}'
        )

        print(
            match.get(
                "text",
                ""
            )
        )

        print("-" * 60)

    # --------------------------------------------------------
    # STEP 2 — SELECT USEFUL MATCHES
    # --------------------------------------------------------

    selected_matches = _select_context_matches(
        matches
    )

    print("=" * 80)
    print(
        f"SELECTED MATCHES: "
        f"{len(selected_matches)}"
    )
    print("=" * 80)

    # --------------------------------------------------------
    # STEP 3 — REFINE TIMESTAMPS
    # --------------------------------------------------------

    refined_matches = _refine_timestamps(
        selected_matches,
        question
    )

    print("=" * 80)
    print("REFINED MATCHES")
    print("=" * 80)

    for index, match in enumerate(
        refined_matches,
        start=1
    ):

        print(
            f"[{index}] "
            f'{match.get("start_time"):.2f} - '
            f'{match.get("end_time"):.2f}'
        )

        print(
            match.get(
                "text",
                ""
            )
        )

        print("-" * 60)

    # --------------------------------------------------------
    # STEP 4 — BUILD CONTEXT
    # --------------------------------------------------------

    context, sources = build_context(
        refined_matches
    )

    # --------------------------------------------------------
    # SAFETY CHECK
    # --------------------------------------------------------

    if (
        not context
        or context.strip() == ""
        or context == "NO_RELEVANT_VIDEO_CONTEXT"
    ):

        print("=" * 80)
        print("ERROR: CONTEXT IS EMPTY")
        print("=" * 80)

        return {
            "answer": (
                "I couldn't find enough relevant "
                "information in the uploaded video to answer your question."
            ),
            "sources": []
        }

    # --------------------------------------------------------
    # STEP 5 — GEMINI
    # --------------------------------------------------------

    print("=" * 80)
    print("CALLING GEMINI")
    print("=" * 80)

    answer = ask_gemini(
        question=question,
        context=context
    )

    return {
        "answer": answer,
        "sources": sources
    }


# ============================================================
# STREAMING
# ============================================================

def ask_video_stream(
    question: str,
    video_ids: list | None = None
):

    clean_vids = _clean_video_ids(video_ids)

    results = search_chunks(
        question,
        clean_vids
    )

    matches = results.get(
        "matches",
        []
    )
    
    if not matches and clean_vids is not None:
        results = search_chunks(question, None)
        matches = results.get("matches", [])

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
        question
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
    video_ids: list | None = None
):

    clean_vids = _clean_video_ids(video_ids)

    results = search_chunks(
        "Summarize the uploaded videos.",
        clean_vids
    )

    matches = results.get(
        "matches",
        []
    )
    
    if not matches and clean_vids is not None:
        results = search_chunks("Summarize the uploaded videos.", None)
        matches = results.get("matches", [])

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
    video_ids: list | None = None
):

    clean_vids = _clean_video_ids(video_ids)

    results = search_chunks(
        "Create detailed study notes from the uploaded videos.",
        clean_vids
    )

    matches = results.get(
        "matches",
        []
    )
    
    if not matches and clean_vids is not None:
        results = search_chunks("Create detailed study notes from the uploaded videos.", None)
        matches = results.get("matches", [])

    selected_matches = _select_context_matches(
        matches
    )

    context, sources = build_context(
        selected_matches
    )

    answer = ask_notes(
        context
    )

    return {
        "answer": answer,
        "sources": sources
    }


# ============================================================
# QUIZ
# ============================================================

def generate_quiz(
    difficulty: str = "Medium",
    questions: int = 10,
    video_ids: list | None = None
):

    clean_vids = _clean_video_ids(video_ids)

    results = search_chunks(
        "Generate a quiz from the uploaded videos.",
        clean_vids
    )

    matches = results.get(
        "matches",
        []
    )
    
    if not matches and clean_vids is not None:
        results = search_chunks("Generate a quiz from the uploaded videos.", None)
        matches = results.get("matches", [])

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

    return {
        "answer": answer,
        "sources": sources
    }