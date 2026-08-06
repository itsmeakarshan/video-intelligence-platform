import os
import subprocess
import uuid


TEMP_AUDIO_DIR = "temp_audio"

os.makedirs(
    TEMP_AUDIO_DIR,
    exist_ok=True
)


def preprocess_video(video_path: str) -> str:

    audio_path = os.path.join(
        TEMP_AUDIO_DIR,
        f"{uuid.uuid4()}.wav"
    )

    command = [

        "ffmpeg",

        "-y",

        "-i",
        video_path,

        "-vn",

        "-ac",
        "1",

        "-ar",
        "16000",

        "-c:a",
        "pcm_s16le",

        "-af",
        "loudnorm",

        audio_path

    ]

    subprocess.run(
        command,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=True
    )

    return audio_path
