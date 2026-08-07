import time

from app.services.embedding_service import search

from app.services.gemini_service import (
    ask_gemini,
    ask_gemini_stream,
)


MIN_RELEVANCE = 1.30


def build_context(matches):

    relevant_matches = [

        match

        for match in matches

        if match["distance"] <= MIN_RELEVANCE

    ]

    if not relevant_matches:

        return "NO_RELEVANT_VIDEO_CONTEXT", []

    context = "\n\n".join(

        f"""
Timestamp:
{match['start_time']:.2f} - {match['end_time']:.2f}

Video ID:
{match['video_id']}

Transcript:
{match['text']}
"""

        for match in relevant_matches

    )

    sources = [

        {

            "video_id": match["video_id"],

            "chunk_id": match["chunk_id"],

            "start_time": match["start_time"],

            "end_time": match["end_time"]

        }

        for match in relevant_matches

    ]

    return context, sources


def ask_video(

    question: str,

    video_ids: list[int] | None = None

):

    print("=" * 60)
    print("Semantic Search...")
    print("=" * 60)

    start = time.perf_counter()

    results = search(

        question,

        video_ids

    )

    print(

        f"Semantic search took {time.perf_counter()-start:.2f} sec"

    )

    context, sources = build_context(

        results["matches"]

    )

    print("=" * 60)
    print(f"Relevant Chunks : {len(sources)}")
    print(f"Context Size    : {len(context)}")
    print("=" * 60)

    answer = ask_gemini(

        question=question,

        context=context

    )

    return {

        "answer": answer,

        "sources": sources

    }


def ask_video_stream(

    question: str,

    video_ids: list[int] | None = None

):

    print("=" * 60)
    print("Semantic Search...")
    print("=" * 60)

    start = time.perf_counter()

    results = search(

        question,

        video_ids

    )

    print(

        f"Semantic search took {time.perf_counter()-start:.2f} sec"

    )

    context, _ = build_context(

        results["matches"]

    )

    return ask_gemini_stream(

        question=question,

        context=context

    )