import os

from app.core.config import settings
from app.core.model_registry import get_whisper_model
from app.services.video_preprocessing_service import preprocess_video


def clean_repeated_words(
    text: str,
    max_repeats: int = 8
) -> str:

    words = text.split()

    if not words:
        return text

    cleaned = []

    previous = None
    repeat_count = 0

    for word in words:

        if word == previous:
            repeat_count += 1
        else:
            repeat_count = 0

        if repeat_count < max_repeats:
            cleaned.append(word)

        previous = word

    return " ".join(cleaned)


def transcribe_video(
    video_path: str,
    progress_callback=None
):

    print("=" * 60)
    print("TRANSCRIBING WITH OPENAI WHISPER")
    print("=" * 60)
    print(f"Model : {settings.WHISPER_MODEL}")
    print("=" * 60)

    if progress_callback:
        progress_callback(10, "Loading Whisper model...")

    model = get_whisper_model(
        settings.WHISPER_MODEL
    )

    audio_path = preprocess_video(
        video_path
    )

    if progress_callback:
        progress_callback(15, "Running speech recognition...")

    try:
        import tqdm
        original_tqdm = tqdm.tqdm

        class CustomTqdm:
            def __init__(self, iterable=None, total=None, *args, **kwargs):
                self.total = total or (len(iterable) if iterable is not None else 1)
                self.n = 0
                self.iterable = iterable
            def __iter__(self):
                if self.iterable is not None:
                    for item in self.iterable:
                        self.update(1)
                        yield item
            def update(self, n=1):
                self.n += n
                frac = min(1.0, max(0.0, self.n / (self.total or 1)))
                pct = int(15 + frac * 23)
                if progress_callback:
                    progress_callback(pct, f"Transcribing audio ({pct}%)...")
            def close(self):
                pass
            def __enter__(self):
                return self
            def __exit__(self, *args):
                pass

        tqdm.tqdm = CustomTqdm
        try:
            result = model.transcribe(
                audio_path,
                fp16=False,
                verbose=True,
                word_timestamps=True
            )
        finally:
            tqdm.tqdm = original_tqdm

        print("=" * 60)
        print("SEGMENTS RETURNED BY WHISPER")
        print("=" * 60)

        for segment in result["segments"]:
            print(
                f'{segment["start"]:.2f} - {segment["end"]:.2f} : {segment["text"]}'
            )

        print("=" * 60)
        print(f'Total Segments : {len(result["segments"])}')
        print("=" * 60)

        if progress_callback:
            progress_callback(38, "Speech recognition completed.")

        segments = []
        full_text = ""

        for index, segment in enumerate(
            result["segments"],
            start=1
        ):

            text = segment["text"].strip()

            if not text:
                continue

            text = clean_repeated_words(text)

            if not text:
                continue

            full_text += text + " "

            segments.append(
                {
                    "segment_index": index,
                    "start": float(segment["start"]),
                    "end": float(segment["end"]),
                    "text": text,
                    "words": [
                        {
                            "word": word["word"].strip(),
                            "start": float(word["start"]),
                            "end": float(word["end"])
                        }
                        for word in segment.get("words", [])
                    ]
                }
            )

        print("=" * 60)
        print(f"Detected language : {result['language']}")
        print(f"Segments          : {len(segments)}")
        print("=" * 60)

        return {
            "language": result["language"],
            "full_text": full_text.strip(),
            "segments": segments
        }

    finally:

        if os.path.exists(audio_path):
            os.remove(audio_path)