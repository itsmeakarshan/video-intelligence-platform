import time

import chromadb

from app.core.config import settings
from app.core.model_registry import get_embedding_model

from app.models.transcript import Transcript
from app.models.transcript_chunk import TranscriptChunk


client = chromadb.PersistentClient(
    path=settings.CHROMA_PATH
)

collection = client.get_or_create_collection(
    name=settings.CHROMA_COLLECTION
)


def index_video(video_id, db):

    model = get_embedding_model()

    chunks = (

        db.query(TranscriptChunk)

        .join(
            Transcript,
            TranscriptChunk.transcript_id == Transcript.id
        )

        .filter(
            Transcript.video_id == video_id
        )

        .all()

    )

    for chunk in chunks:

        embedding = model.encode(
            chunk.text
        ).tolist()

        collection.upsert(

            ids=[
                str(chunk.id)
            ],

            documents=[
                chunk.text
            ],

            embeddings=[
                embedding
            ],

            metadatas=[

                {

                    "video_id": video_id,

                    "chunk_id": chunk.id,

                    "start_time": chunk.start_time,

                    "end_time": chunk.end_time

                }

            ]

        )

        chunk.embedding_created = True

    db.commit()


def search(

    query: str,

    video_ids: list[int] | None = None

):

    total_start = time.perf_counter()

    model_start = time.perf_counter()

    model = get_embedding_model()

    model_end = time.perf_counter()

    embedding_start = time.perf_counter()

    embedding = model.encode(query).tolist()

    embedding_end = time.perf_counter()

    chroma_start = time.perf_counter()

    query_kwargs = {

        "query_embeddings": [
            embedding
        ],

        "n_results": 10

    }

    if video_ids:

        query_kwargs["where"] = {

            "video_id": {

                "$in": video_ids

            }

        }

    result = collection.query(

        **query_kwargs

    )

    chroma_end = time.perf_counter()

    print("=" * 60)
    print(f"Model fetch : {(model_end-model_start):.2f} sec")
    print(f"Embedding   : {(embedding_end-embedding_start):.2f} sec")
    print(f"Chroma      : {(chroma_end-chroma_start):.2f} sec")
    print(f"TOTAL       : {(time.perf_counter()-total_start):.2f} sec")
    print("=" * 60)

    formatted_results = []

    documents = result.get("documents", [[]])[0]
    metadatas = result.get("metadatas", [[]])[0]
    distances = result.get("distances", [[]])[0]

    for document, metadata, distance in zip(

        documents,

        metadatas,

        distances

    ):

        formatted_results.append(

            {

                "text": document,

                "video_id": metadata["video_id"],

                "chunk_id": metadata["chunk_id"],

                "start_time": metadata["start_time"],

                "end_time": metadata["end_time"],

                "distance": distance

            }

        )

    return {

        "query": query,

        "matches": formatted_results

    }