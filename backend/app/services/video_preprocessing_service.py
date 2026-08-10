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
        f"{uuid.uuid4()}.mp3"
    )

    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            video_path,
            audio_path
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=True
    )

    return audio_path