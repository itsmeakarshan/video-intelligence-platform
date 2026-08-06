import time

from app.services.embedding_service import search
from app.services.gemini_service import ask_gemini


MIN_RELEVANCE = 1.30


def ask_video(question: str):

    print("=" * 60)
    print("Semantic Search...")
    print("=" * 60)

    search_start = time.perf_counter()

    results = search(question)

    print(
        f"Semantic search took {time.perf_counter()-search_start:.2f} sec"
    )

    matches = results["matches"]

    relevant_matches = [

        match

        for match in matches

        if match["distance"] <= MIN_RELEVANCE

    ]

    if relevant_matches:

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

    else:

        context = "NO_RELEVANT_VIDEO_CONTEXT"

    print("=" * 60)
    print(f"Relevant Chunks : {len(relevant_matches)}")
    print(f"Context Size    : {len(context)}")
    print("=" * 60)

    answer = ask_gemini(

        question,

        context

    )

    response = {

        "answer": answer,

        "sources": []

    }

    if relevant_matches:

        response["sources"] = [

            {

                "video_id": match["video_id"],

                "chunk_id": match["chunk_id"],

                "start_time": match["start_time"],

                "end_time": match["end_time"]

            }

            for match in relevant_matches

        ]

    return response