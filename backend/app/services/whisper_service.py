from faster_whisper import WhisperModel

print("Loading Faster Whisper model...")

model = WhisperModel(
    "base",
    device="cpu",
    compute_type="int8"
)


def transcribe_video(video_path: str):

    segments, info = model.transcribe(video_path)

    transcript = ""

    for segment in segments:
        transcript += segment.text + " "

    return {
        "language": info.language,
        "transcript": transcript.strip()
    }
