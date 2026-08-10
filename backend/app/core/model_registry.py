from functools import lru_cache

import whisper
from sentence_transformers import (
    CrossEncoder,
    SentenceTransformer,
)

from app.core.config import settings


@lru_cache(maxsize=None)
def get_whisper_model(
    model_name: str
):

    print("=" * 60)
    print("Loading Whisper Model")
    print("=" * 60)
    print(f"Model : {model_name}")
    print("=" * 60)

    return whisper.load_model(
        model_name
    )


@lru_cache(maxsize=1)
def get_embedding_model():

    print("=" * 60)
    print("Loading Embedding Model")
    print("=" * 60)
    print(
        f"Embedding Model : {settings.EMBEDDING_MODEL}"
    )
    print("=" * 60)

    return SentenceTransformer(
        settings.EMBEDDING_MODEL
    )


@lru_cache(maxsize=1)
def get_reranker():

    print("=" * 60)
    print("Loading Cross Encoder")
    print("=" * 60)
    print(
        "Model : cross-encoder/ms-marco-MiniLM-L-6-v2"
    )
    print("=" * 60)

    return CrossEncoder(
        "cross-encoder/ms-marco-MiniLM-L-6-v2"
    )