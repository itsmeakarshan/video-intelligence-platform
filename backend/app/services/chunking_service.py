from typing import Callable, Optional
from sqlalchemy.orm import Session
from app.models.transcript import TranscriptSegment, TranscriptChunk


def create_chunks(
    transcript_id: int,
    db: Session,
    progress_callback: Optional[Callable[[int, str], None]] = None,
    chunk_size: int = 3,
    overlap: int = 1,
) -> int:
    # Remove existing chunks for this transcript
    db.query(TranscriptChunk).filter(TranscriptChunk.transcript_id == transcript_id).delete()
    db.commit()

    segments = (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.transcript_id == transcript_id)
        .order_by(TranscriptSegment.segment_index.asc())
        .all()
    )

    if not segments:
        return 0

    step = max(1, chunk_size - overlap)
    chunks_to_add = []
    chunk_index = 1
    total_segs = len(segments)

    for i in range(0, total_segs, step):
        window = segments[i : i + chunk_size]
        if not window:
            break

        start_time = window[0].start_time
        end_time = window[-1].end_time
        merged_text = " ".join([seg.text.strip() for seg in window if seg.text]).strip()

        if not merged_text:
            continue

        chunk = TranscriptChunk(
            transcript_id=transcript_id,
            chunk_index=chunk_index,
            start_time=start_time,
            end_time=end_time,
            text=merged_text,
            embedding_created=True,
        )
        chunks_to_add.append(chunk)
        chunk_index += 1

        if progress_callback and (chunk_index % 10 == 0 or i + step >= total_segs):
            pct = min(74, 55 + int((i / total_segs) * 19))
            progress_callback(pct, f"Created semantic chunk {chunk_index}...")

    db.bulk_save_objects(chunks_to_add)
    db.commit()
    return len(chunks_to_add)
