from functools import lru_cache

from faster_whisper import WhisperModel
from sentence_transformers import SentenceTransformer

from app.core.config import settings
from app.core.device import hardware


@lru_cache(maxsize=5)
def get_whisper_model(model_name: str):

    print("=" * 60)
    print("Loading Whisper Model")
    print("=" * 60)
    print(f"Model        : {model_name}")
    print(f"Device       : {hardware.device}")
    print(f"Compute Type : {hardware.compute_type}")
    print("=" * 60)

    try:

        return WhisperModel(

            model_name,

            device=hardware.device,

            compute_type=hardware.compute_type

        )

    except RuntimeError as e:

        raise RuntimeError(

            f"""

Unable to load Whisper model: {model_name}

This model requires more memory than your machine currently has.

Choose one of:

tiny
base
small
medium
large-v3

"""

        ) from e


@lru_cache(maxsize=1)
def get_embedding_model():

    print("=" * 60)
    print("Loading Embedding Model...")
    print("=" * 60)

    return SentenceTransformer(
        settings.EMBEDDING_MODEL
    )
