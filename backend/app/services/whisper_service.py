import os

from app.core.config import settings
from app.core.model_registry import get_whisper_model
from app.services.video_preprocessing_service import preprocess_video


def transcribe_video(

    video_path: str,

    whisper_model: str

):

    model = get_whisper_model(
        whisper_model
    )

    audio_path = preprocess_video(video_path)

    segments_generator, info = model.transcribe(

        audio_path,

        beam_size=settings.WHISPER_BEAM_SIZE,

        best_of=settings.WHISPER_BEST_OF,

        patience=settings.WHISPER_PATIENCE,

        vad_filter=settings.WHISPER_VAD,

        word_timestamps=settings.WHISPER_WORD_TIMESTAMPS,

        condition_on_previous_text=settings.WHISPER_CONDITION_ON_PREVIOUS_TEXT,

        language=None if settings.WHISPER_LANGUAGE == "auto" else settings.WHISPER_LANGUAGE,

        temperature=0

    )

    segments = []

    full_text = ""

    for index, segment in enumerate(
        segments_generator,
        start=1
    ):

        text = segment.text.strip()

        if not text:
            continue

        full_text += text + " "

        segments.append(

            {

                "segment_index": index,

                "start": segment.start,

                "end": segment.end,

                "text": text

            }

        )

    if os.path.exists(audio_path):
        os.remove(audio_path)

    return {

        "language": info.language,

        "full_text": full_text.strip(),

        "segments": segments

    }
