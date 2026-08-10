from collections import Counter
import math

from sqlalchemy.orm import Session

from app.models.transcript_chunk import TranscriptChunk


def tokenize(text: str):

    return [
        word.lower()
        for word in text.split()
    ]


def keyword_search(
    query: str,
    video_ids: list[int] | None,
    db: Session,
    top_k: int = 20
):

    query_words = tokenize(query)

    if not query_words:
        return []

    chunks = db.query(
        TranscriptChunk
    ).all()

    results = []

    for chunk in chunks:

        words = tokenize(
            chunk.text
        )

        counts = Counter(words)

        score = 0.0

        for word in query_words:

            tf = counts[word]

            if tf > 0:
                score += (
                    1 + math.log(tf)
                )

        if score == 0:
            continue

        results.append(
            {
                "text": chunk.text,
                "video_id": chunk.video_id,
                "transcript_id": chunk.transcript_id,
                "chunk_id": chunk.id,
                "chunk_index": chunk.chunk_index,
                "start_time": chunk.start_time,
                "end_time": chunk.end_time,
                "keyword_score": score
            }
        )

    results.sort(
        key=lambda x: x["keyword_score"],
        reverse=True
    )

    return results[:top_k]