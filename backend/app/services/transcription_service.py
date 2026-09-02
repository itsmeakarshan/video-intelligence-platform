import os
import re
import json
import logging
import asyncio
import subprocess
from pathlib import Path
from typing import Callable, List, Optional
from dataclasses import dataclass
from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class SegmentItem:
    segment_index: int
    start: float
    end: float
    text: str


@dataclass
class TranscriptionResult:
    language: str
    full_text: str
    segments: List[SegmentItem]


def extract_audio_ffmpeg(video_path: str, output_wav_path: str) -> bool:
    os.makedirs(os.path.dirname(output_wav_path), exist_ok=True)
    cmd = [
        "ffmpeg",
        "-y",
        "-i", video_path,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        output_wav_path,
    ]
    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return os.path.isfile(output_wav_path) and os.path.getsize(output_wav_path) > 0
    except Exception as ex:
        logger.error(f"FFmpeg audio extraction failed: {ex}")
        return False


def run_local_whisper_transcription(
    audio_path: str,
    progress_callback: Optional[Callable[[int, str], None]] = None,
    model_name: str = "base",
) -> TranscriptionResult:
    if progress_callback:
        progress_callback(15, "Loading speech recognition model...")

    from faster_whisper import WhisperModel

    model = WhisperModel(model_name, device="cpu", compute_type="int8")

    if progress_callback:
        progress_callback(20, "Transcribing spoken audio...")

    segments_gen, info = model.transcribe(
        audio_path,
        beam_size=5,
        word_timestamps=True,
        condition_on_previous_text=True,
    )

    segments: List[SegmentItem] = []
    full_text_parts: List[str] = []

    for idx, s in enumerate(segments_gen, start=1):
        t = s.text.strip()
        if not t:
            continue
        full_text_parts.append(t)
        segments.append(
            SegmentItem(
                segment_index=idx,
                start=round(float(s.start), 2),
                end=round(float(s.end), 2),
                text=t,
            )
        )
        if progress_callback and idx % 10 == 0:
            pct = min(38, 20 + int(idx * 0.5))
            progress_callback(pct, f"Transcribing audio (segment {idx})...")

    full_text = " ".join(full_text_parts).strip()
    return TranscriptionResult(
        language=info.language or "en",
        full_text=full_text,
        segments=segments,
    )


async def transcribe_video_async(
    video_path: str,
    progress_callback: Optional[Callable[[int, str], None]] = None,
) -> TranscriptionResult:
    if progress_callback:
        progress_callback(8, "Extracting audio track...")

    temp_audio_dir = Path(settings.TEMP_AUDIO_FOLDER)
    temp_audio_dir.mkdir(parents=True, exist_ok=True)
    temp_wav = str(temp_audio_dir / f"audio_{os.getpid()}_{Path(video_path).stem}.wav")

    extracted = await asyncio.to_thread(extract_audio_ffmpeg, video_path, temp_wav)
    if not extracted:
        raise RuntimeError(f"Failed to extract audio from video: {video_path}")

    try:
        result = await asyncio.to_thread(
            run_local_whisper_transcription,
            temp_wav,
            progress_callback,
            settings.WHISPER_MODEL,
        )
        return result
    finally:
        if os.path.exists(temp_wav):
            try:
                os.remove(temp_wav)
            except Exception:
                pass
