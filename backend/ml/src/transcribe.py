import sys
import os
import argparse
import json
import warnings

warnings.filterwarnings("ignore")
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

def transcribe(audio_path, model_name="base"):
    try:
        from faster_whisper import WhisperModel
        model = WhisperModel(model_name, device="cpu", compute_type="int8")
        segments_gen, info = model.transcribe(audio_path, beam_size=5, word_timestamps=True)
        
        segments = []
        full_text = ""
        for idx, s in enumerate(segments_gen, start=1):
            t = s.text.strip()
            if not t:
                continue
            full_text += t + " "
            segments.append({
                "segment_index": idx,
                "start": round(s.start, 2),
                "end": round(s.end, 2),
                "text": t
            })
            
        result = {
            "language": info.language,
            "full_text": full_text.strip(),
            "segments": segments
        }
        print(json.dumps(result))
    except Exception as e:
        sys.stderr.write(f"Whisper transcription failed: {str(e)}\n")
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True)
    parser.add_argument("--model", default="base")
    args = parser.parse_args()
    transcribe(args.audio, args.model)
