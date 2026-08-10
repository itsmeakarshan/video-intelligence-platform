import time
import chromadb

from app.core.config import settings
from app.core.model_registry import get_embedding_model

from app.models.video import Video
from app.models.transcript import Transcript
from app.models.transcript_chunk import TranscriptChunk
from app.models.transcript_segment import TranscriptSegment


# ============================================================
# CHROMA CLIENT & COLLECTIONS
# ============================================================

client = chromadb.PersistentClient(
    path=settings.CHROMA_PATH
)

chunk_collection = client.get_or_create_collection(
    name="rag_chunks"
)

segment_collection = client.get_or_create_collection(
    name="rag_segments"
)


# ============================================================
# SEARCH SETTINGS
# ============================================================

SEARCH_RESULTS = 20


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def _clean_video_ids(video_ids: list | int | str | None) -> list[int] | None:
    """Safely converts video_ids input into a clean list of integers."""
    if video_ids is None:
        return None
    
    if isinstance(video_ids, (int, str)):
        video_ids = [video_ids]

    clean_ids = []
    for vid in video_ids:
        if vid is not None:
            try:
                clean_ids.append(int(vid))
            except (TypeError, ValueError):
                pass

    return clean_ids if clean_ids else None


# ============================================================
# INDEX VIDEO
# ============================================================

def index_video(
    video_id: int,
    db
):
    model = get_embedding_model()

    video = (
        db.query(Video)
        .filter(Video.id == video_id)
        .first()
    )

    if video is None:
        print(f"INDEX ERROR: Video with ID {video_id} not found.")
        return

    transcript = (
        db.query(Transcript)
        .filter(Transcript.video_id == video_id)
        .first()
    )

    if transcript is None:
        print(f"INDEX ERROR: Transcript for video ID {video_id} not found.")
        return

    chunks = (
        db.query(TranscriptChunk)
        .filter(TranscriptChunk.transcript_id == transcript.id)
        .order_by(TranscriptChunk.chunk_index)
        .all()
    )

    segments = (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.transcript_id == transcript.id)
        .order_by(TranscriptSegment.segment_index)
        .all()
    )

    if not chunks:
        print("=" * 60)
        print("NO CHUNKS FOUND FOR INDEXING")
        print("=" * 60)
        return

    if not segments:
        print("=" * 60)
        print("NO SEGMENTS FOUND FOR INDEXING")
        print("=" * 60)
        return

    print("=" * 60)
    print("GENERATING EMBEDDINGS")
    print("=" * 60)
    print(f"Chunks   : {len(chunks)}")
    print(f"Segments : {len(segments)}")
    print("=" * 60)

    chunk_ids = []
    chunk_documents = []
    chunk_embeddings = []
    chunk_metadatas = []

    segment_ids = []
    segment_documents = []
    segment_embeddings = []
    segment_metadatas = []

    batch_size = 32

    # Safe title fallback
    video_title = str(
        video.original_filename 
        or getattr(video, 'title', None) 
        or f"Video_{video.id}"
    )
    filename = str(video.filename or "")

    # ========================================================
    # CHUNK EMBEDDINGS
    # ========================================================

    for start in range(0, len(chunks), batch_size):
        batch = chunks[start:start + batch_size]
        texts = [chunk.text for chunk in batch]

        batch_embeddings = model.encode(
            texts,
            convert_to_numpy=True,
            normalize_embeddings=True
        ).tolist()

        for chunk, embedding in zip(batch, batch_embeddings):
            chunk_ids.append(str(chunk.id))
            chunk_documents.append(chunk.text)
            chunk_embeddings.append(embedding)

            chunk_metadatas.append(
                {
                    "video_id": int(video.id),
                    "video_title": video_title,
                    "filename": filename,
                    "transcript_id": int(transcript.id),
                    "chunk_id": int(chunk.id),
                    "chunk_index": int(chunk.chunk_index),
                    "start_time": float(chunk.start_time or 0.0),
                    "end_time": float(chunk.end_time or 0.0)
                }
            )

            chunk.embedding_created = True

    # ========================================================
    # SEGMENT EMBEDDINGS
    # ========================================================

    for start in range(0, len(segments), batch_size):
        batch = segments[start:start + batch_size]
        texts = [segment.text for segment in batch]

        batch_embeddings = model.encode(
            texts,
            convert_to_numpy=True,
            normalize_embeddings=True
        ).tolist()

        for segment, embedding in zip(batch, batch_embeddings):
            segment_ids.append(f"{transcript.id}_{segment.segment_index}")
            segment_documents.append(segment.text)
            segment_embeddings.append(embedding)

            segment_metadatas.append(
                {
                    "video_id": int(video.id),
                    "video_title": video_title,
                    "filename": filename,
                    "transcript_id": int(transcript.id),
                    "segment_index": int(segment.segment_index),
                    "start_time": float(segment.start_time or 0.0),
                    "end_time": float(segment.end_time or 0.0)
                }
            )

    # ========================================================
    # SAVE DATABASE CHANGES
    # ========================================================

    db.commit()

    # ========================================================
    # SAVE CHUNKS & SEGMENTS TO CHROMA
    # ========================================================

    chunk_collection.upsert(
        ids=chunk_ids,
        documents=chunk_documents,
        embeddings=chunk_embeddings,
        metadatas=chunk_metadatas
    )

    segment_collection.upsert(
        ids=segment_ids,
        documents=segment_documents,
        embeddings=segment_embeddings,
        metadatas=segment_metadatas
    )

    print("=" * 60)
    print("INDEX COMPLETE SUCCESSFULLY")
    print("=" * 60)


# ============================================================
# SEARCH CHUNKS
# ============================================================

def search_chunks(
    query: str,
    video_ids: list | int | str | None = None
):

    total_start = time.perf_counter()

    if chunk_collection.count() == 0:
        print("SEARCH CHUNKS: Chunk collection is empty.")
        return {
            "query": query,
            "matches": []
        }

    model = get_embedding_model()

    embedding = model.encode(
        query,
        normalize_embeddings=True
    ).tolist()

    kwargs = {
        "query_embeddings": [embedding],
        "n_results": SEARCH_RESULTS
    }

    # ========================================================
    # OPTIONAL VIDEO FILTER
    # ========================================================

    clean_vids = _clean_video_ids(video_ids)

    if clean_vids:
        if len(clean_vids) == 1:
            kwargs["where"] = {"video_id": clean_vids[0]}
        else:
            kwargs["where"] = {"video_id": {"$in": clean_vids}}

    result = chunk_collection.query(**kwargs)

    print("=" * 60)
    print(f"Chunk Search Time: {time.perf_counter() - total_start:.2f}s")
    print("=" * 60)

    formatted = []

    documents = result.get("documents", [[]])[0] or []
    metadatas = result.get("metadatas", [[]])[0] or []
    distances = result.get("distances", [[]])[0] or []

    seen = set()

    for document, metadata, distance in zip(documents, metadatas, distances):
        if metadata is None:
            continue

        chunk_id = metadata.get("chunk_id")
        if chunk_id in seen:
            continue

        seen.add(chunk_id)

        title = metadata.get("video_title") or "Unknown Video"

        formatted.append(
            {
                "text": document or "",
                "video_id": metadata.get("video_id"),
                "video_title": title,
                "filename": metadata.get("filename") or "",
                "transcript_id": metadata.get("transcript_id"),
                "chunk_id": chunk_id,
                "chunk_index": metadata.get("chunk_index"),
                "start_time": float(metadata.get("start_time", 0.0)),
                "end_time": float(metadata.get("end_time", 0.0)),
                "distance": float(distance)
            }
        )

    return {
        "query": query,
        "matches": formatted
    }


# ============================================================
# SEARCH SEGMENTS
# ============================================================

def search_segments(
    query: str,
    video_id: int,
    chunk_start: float,
    chunk_end: float
):

    if segment_collection.count() == 0:
        return []

    model = get_embedding_model()

    embedding = model.encode(
        query,
        normalize_embeddings=True
    ).tolist()

    try:
        clean_video_id = int(video_id)
        chunk_start = float(chunk_start)
        chunk_end = float(chunk_end)
    except (TypeError, ValueError):
        return []

    # Fetch top 100 semantically matching segments for this video
    result = segment_collection.query(
        query_embeddings=[embedding],
        n_results=100,
        where={"video_id": clean_video_id}
    )

    documents = result.get("documents", [[]])[0] or []
    metadatas = result.get("metadatas", [[]])[0] or []
    distances = result.get("distances", [[]])[0] or []

    formatted = []

    # Filter segments that fall within / overlap the chunk window (with 2.0s safety buffer)
    buffer = 2.0

    for document, metadata, distance in zip(documents, metadatas, distances):
        if metadata is None:
            continue

        start_time = metadata.get("start_time")
        end_time = metadata.get("end_time")

        if start_time is None or end_time is None:
            continue

        try:
            start_time = float(start_time)
            end_time = float(end_time)
        except (TypeError, ValueError):
            continue

        # Keep segments that overlap with the chunk
        if end_time < (chunk_start - buffer):
            continue

        if start_time > (chunk_end + buffer):
            continue

        formatted.append(
            {
                "text": document or "",
                "segment_index": metadata.get("segment_index"),
                "start_time": start_time,
                "end_time": end_time,
                "distance": float(distance)
            }
        )

    # Sort by semantic relevance (smallest distance first)
    formatted.sort(key=lambda item: item["distance"])

    # Keep top 10 best overlapping segments
    formatted = formatted[:10]

    print("=" * 60)
    print("SEGMENT SEARCH")
    print("=" * 60)
    print(f"Video ID    : {clean_video_id}")
    print(f"Chunk range : {chunk_start:.2f} - {chunk_end:.2f}")
    print(f"Matches     : {len(formatted)}")
    print("=" * 60)

    for match in formatted:
        print(
            f'Segment {match.get("segment_index")} | '
            f'{match["start_time"]:.2f} - {match["end_time"]:.2f} | '
            f'Distance: {match["distance"]:.4f}'
        )
        print(match["text"])
        print("-" * 60)

    print("=" * 60)

    return formatted