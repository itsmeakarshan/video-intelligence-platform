from sqlalchemy.orm import Session

from app.models.transcript_segment import TranscriptSegment
from app.models.transcript_chunk import TranscriptChunk

WINDOW_SIZE = 3


def create_chunks(
    transcript_id: int,
    db: Session,
    progress_callback=None
):

    (
        db.query(TranscriptChunk)
        .filter(
            TranscriptChunk.transcript_id == transcript_id
        )
        .delete(
            synchronize_session=False
        )
    )

    segments = (
        db.query(TranscriptSegment)
        .filter(
            TranscriptSegment.transcript_id == transcript_id
        )
        .order_by(
            TranscriptSegment.segment_index
        )
        .all()
    )

    if not segments:
        return

    chunk_index = 1

    # Sliding window:
    # S1+S2+S3
    # S2+S3+S4
    # S3+S4+S5
    # ...

    total_chunks_to_make = max(1, len(segments) - WINDOW_SIZE + 1)
    for i in range(len(segments) - WINDOW_SIZE + 1):

        window = segments[i:i + WINDOW_SIZE]

        db.add(

            TranscriptChunk(

                transcript_id=transcript_id,

                chunk_index=chunk_index,

                start_time=window[0].start_time,

                end_time=window[-1].end_time,

                text=" ".join(
                    segment.text.strip()
                    for segment in window
                ),

                embedding_created=False

            )

        )

        chunk_index += 1

        if progress_callback and (i % 5 == 0 or i == total_chunks_to_make - 1):
            pct = int(70 + (i / total_chunks_to_make) * 10)
            progress_callback(pct, f"Creating semantic chunk {chunk_index-1}/{total_chunks_to_make}...")

    db.commit()

    print("=" * 60)
    print("Whisper Sliding Window Chunk Creation Complete")
    print("=" * 60)
    print(f"Segments : {len(segments)}")
    print(f"Chunks   : {chunk_index - 1}")
    print("=" * 60)

    for chunk in (
        db.query(TranscriptChunk)
        .filter(
            TranscriptChunk.transcript_id == transcript_id
        )
        .order_by(
            TranscriptChunk.chunk_index
        )
    ):

        print(
            f"Chunk {chunk.chunk_index} | "
            f"{chunk.start_time:.2f}-{chunk.end_time:.2f} | "
            f"{len(chunk.text)} chars"
        )

    print("=" * 60)