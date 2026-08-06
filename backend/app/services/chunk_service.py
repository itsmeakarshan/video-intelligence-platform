from typing import List


def build_chunks(
    segments: List[dict],
    max_words: int = 700
):

    chunks = []

    current_text = ""
    current_start = None
    current_end = None
    current_words = 0
    chunk_index = 1

    for segment in segments:

        words = len(segment["text"].split())

        if current_start is None:
            current_start = segment["start"]

        current_end = segment["end"]

        current_text += segment["text"] + " "

        current_words += words

        if current_words >= max_words:

            chunks.append(
                {
                    "chunk_index": chunk_index,
                    "start_time": current_start,
                    "end_time": current_end,
                    "text": current_text.strip()
                }
            )

            chunk_index += 1

            current_text = ""
            current_start = None
            current_end = None
            current_words = 0

    if current_text:

        chunks.append(
            {
                "chunk_index": chunk_index,
                "start_time": current_start,
                "end_time": current_end,
                "text": current_text.strip()
            }
        )

    return chunks
