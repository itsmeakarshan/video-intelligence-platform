from pathlib import Path
import re
import shutil

import yt_dlp


UPLOAD_DIR = Path("uploads")


def _get_js_runtimes_config() -> dict:
    """
    Dynamically discover installed JavaScript runtimes (node, deno, bun, qjs)
    on the host machine and configure yt-dlp to use them for player JS evaluation.
    """
    runtimes = {}
    for rt in ["node", "deno", "bun", "qjs"]:
        binary_path = shutil.which(rt)
        if binary_path:
            runtimes[rt] = {"path": binary_path}
    return runtimes


def sanitize_filename(filename: str) -> str:
    """
    Remove characters that are unsafe for filenames.
    """
    filename = re.sub(r'[<>:"/\\|?*]', "", filename)
    filename = filename.strip()
    if not filename:
        filename = "youtube_video"
    return filename


def download_youtube_video(
    url: str,
    quality: str = "720"
) -> str:
    """
    Download a YouTube video into the existing uploads directory.
    Returns the final MP4 path.
    """
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    quality_map = {
        "360": 360,
        "480": 480,
        "720": 720,
        "1080": 1080
    }
    height = quality_map.get(str(quality), 720)

    js_runtimes = _get_js_runtimes_config()

    base_ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "js_runtimes": js_runtimes,
        "extractor_args": {
            "youtube": {
                "player_client": ["android", "web"]
            }
        }
    }

    try:
        with yt_dlp.YoutubeDL(base_ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except yt_dlp.utils.DownloadError as error:
        err_msg = str(error)
        if "HTTP Error 403" in err_msg or "Forbidden" in err_msg:
            raise RuntimeError("YouTube blocked the metadata request (HTTP 403). Please try again or try another video.") from error
        if "Private video" in err_msg or "is unavailable" in err_msg or "Video unavailable" in err_msg:
            raise RuntimeError("This YouTube video is private, removed, or unavailable.") from error
        if "Sign in to confirm your age" in err_msg:
            raise RuntimeError("This YouTube video is age-restricted and requires sign-in.") from error
        raise RuntimeError(f"Unable to read YouTube video metadata: {err_msg}") from error

    if not info:
        raise RuntimeError("Could not retrieve information for this YouTube video.")

    raw_title = info.get("title") or "youtube_video"
    title = sanitize_filename(raw_title)[:180].strip()
    output_path = UPLOAD_DIR / f"{title}.%(ext)s"

    download_ydl_opts = {
        "quiet": False,
        "no_warnings": False,
        "noplaylist": True,
        "js_runtimes": js_runtimes,
        "extractor_args": {
            "youtube": {
                "player_client": ["android", "web"]
            }
        },
        "format": (
            f"bestvideo[height<={height}][ext=mp4]+bestaudio[ext=m4a]/"
            f"bestvideo[height<={height}]+bestaudio/"
            f"best[height<={height}]/"
            f"best"
        ),
        "format_sort": ["res", "ext:mp4:m4a", "vcodec:h264", "acodec:aac"],
        "outtmpl": str(output_path),
        "merge_output_format": "mp4"
    }

    try:
        with yt_dlp.YoutubeDL(download_ydl_opts) as ydl:
            ydl.download([url])
    except yt_dlp.utils.DownloadError as error:
        err_msg = str(error)
        if "HTTP Error 403" in err_msg or "Forbidden" in err_msg:
            raise RuntimeError("YouTube blocked the video download stream (HTTP 403). Please try again later.") from error
        raise RuntimeError(f"Unable to download YouTube video stream: {err_msg}") from error

    final_path = UPLOAD_DIR / f"{title}.mp4"
    if final_path.exists():
        return str(final_path)

    possible_files = list(UPLOAD_DIR.glob(f"{title}.*"))
    for file in possible_files:
        if file.is_file():
            return str(file)

    raise RuntimeError("The video was downloaded, but the final file could not be located on disk.")