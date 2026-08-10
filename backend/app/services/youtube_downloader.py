from pathlib import Path
import re

import yt_dlp


UPLOAD_DIR = Path("uploads")


def sanitize_filename(filename: str) -> str:
    """
    Remove characters that are unsafe for filenames.
    """

    filename = re.sub(
        r'[<>:"/\\|?*]',
        "",
        filename
    )

    filename = filename.strip()

    if not filename:
        filename = "youtube_video"

    return filename


def download_youtube_video(
    url: str,
    quality: str = "720"
) -> str:

    """
    Download a YouTube video into the existing
    uploads directory.

    Returns the final MP4 path.
    """

    UPLOAD_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    quality_map = {
        "360": 360,
        "480": 480,
        "720": 720,
        "1080": 1080
    }

    height = quality_map.get(
        str(quality),
        720
    )

    # First get the video information so we can
    # create a safe filename ourselves.
    try:

        with yt_dlp.YoutubeDL({
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True
        }) as ydl:

            info = ydl.extract_info(
                url,
                download=False
            )

    except yt_dlp.utils.DownloadError as error:

        raise RuntimeError(
            f"Unable to read YouTube video: {error}"
        ) from error

    title = sanitize_filename(
        info.get(
            "title",
            "youtube_video"
        )
    )

    # Prevent extremely long filenames.
    title = title[:180].strip()

    output_path = UPLOAD_DIR / f"{title}.%(ext)s"

    ydl_opts = {

        "format": (
            f"bestvideo[height<={height}]"
            "+bestaudio/"
            f"best[height<={height}]"
        ),

        "outtmpl": str(output_path),

        "merge_output_format": "mp4",

        "noplaylist": True,

        "quiet": False,

        "no_warnings": False
    }

    try:

        with yt_dlp.YoutubeDL(
            ydl_opts
        ) as ydl:

            ydl.download([url])

    except yt_dlp.utils.DownloadError as error:

        raise RuntimeError(
            f"Unable to download YouTube video: {error}"
        ) from error


    final_path = UPLOAD_DIR / f"{title}.mp4"

    if final_path.exists():

        return str(final_path)


    possible_files = list(
        UPLOAD_DIR.glob(
            f"{title}.*"
        )
    )

    for file in possible_files:

        if file.is_file():

            return str(file)

    raise RuntimeError(
        "The video was downloaded, but the final file "
        "could not be located."
    )