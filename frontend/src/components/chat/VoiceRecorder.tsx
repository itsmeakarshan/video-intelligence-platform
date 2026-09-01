import { useState, useRef, useEffect } from "react";
import { Mic, Trash2, Send, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface VoiceRecorderProps {
  onSendVoice: (audioFile: File, durationSec: number) => Promise<void>;
  onCancel: () => void;
}

export default function VoiceRecorder({ onSendVoice, onCancel }: VoiceRecorderProps) {
  const [seconds, setSeconds] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [volumeLevels, setVolumeLevels] = useState<number[]>([15, 25, 40, 20, 30]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      cleanupResources();
    };
  }, []);

  function cleanupResources() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      mediaRecorderRef.current = null;
    }
  }

  function getBestSupportedMimeType(): string {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/aac",
      "audio/ogg;codecs=opus",
      "audio/ogg",
      "audio/wav"
    ];

    if (typeof MediaRecorder !== "undefined" && typeof MediaRecorder.isTypeSupported === "function") {
      for (const mime of candidates) {
        if (MediaRecorder.isTypeSupported(mime)) {
          return mime;
        }
      }
    }
    return "";
  }

  async function startRecording() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Audio recording is not supported in this browser.");
        onCancel();
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;
      audioChunksRef.current = [];

      // Setup Web Audio API volume visualizer
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioCtxRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 32;
          source.connect(analyser);

          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          const updateVolume = () => {
            if (!analyser) return;
            analyser.getByteFrequencyData(dataArray);
            
            // Sample 5 frequency bins for animated visualizer
            const levels = [
              Math.max(15, (dataArray[1] || 0) / 2.5),
              Math.max(20, (dataArray[3] || 0) / 2.2),
              Math.max(25, (dataArray[5] || 0) / 2),
              Math.max(20, (dataArray[7] || 0) / 2.2),
              Math.max(15, (dataArray[9] || 0) / 2.5)
            ];
            setVolumeLevels(levels);
            animFrameRef.current = requestAnimationFrame(updateVolume);
          };
          updateVolume();
        }
      } catch (audioCtxErr) {
        console.warn("Audio analyser setup skipped:", audioCtxErr);
      }

      // Determine MIME type
      const mimeType = getBestSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = options ? new MediaRecorder(stream, options) : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(250); // Slice data every 250ms

      // Start elapsed timer
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error("Microphone access error:", err);
      toast.error("Could not access microphone. Please grant permission.");
      onCancel();
    }
  }

  async function handleSend() {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    setUploading(true);

    recorder.onstop = async () => {
      try {
        if (audioChunksRef.current.length === 0) {
          toast.error("No audio data recorded.");
          setUploading(false);
          onCancel();
          return;
        }

        const rawMime = recorder.mimeType || "audio/webm";
        const cleanMime = rawMime.split(";")[0].trim() || "audio/webm";
        
        let ext = "webm";
        if (cleanMime.includes("mp4") || cleanMime.includes("aac") || cleanMime.includes("m4a")) {
          ext = "mp4";
        } else if (cleanMime.includes("ogg")) {
          ext = "ogg";
        } else if (cleanMime.includes("wav")) {
          ext = "wav";
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: cleanMime });
        const audioFile = new File([audioBlob], `voice_${Date.now()}.${ext}`, {
          type: cleanMime
        });

        // Stop all media tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        const recordedDuration = Math.max(1, seconds);
        await onSendVoice(audioFile, recordedDuration);
      } catch (error) {
        console.error("Failed to send voice note:", error);
        toast.error("Failed to send voice note.");
      } finally {
        setUploading(false);
      }
    };

    try {
      recorder.stop();
    } catch (e) {
      console.error("Recorder stop error:", e);
      setUploading(false);
    }
  }

  function handleCancel() {
    cleanupResources();
    onCancel();
  }

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? "0" : ""}${remainder}`;
  };

  return (
    <div className="flex items-center justify-between w-full bg-[#1A1C23] border border-[#E5F842]/40 rounded-2xl px-4 py-2.5 shadow-xl animate-in fade-in duration-150">
      {/* Left indicator with live animated waveform */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 relative shrink-0">
          <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping absolute" />
          <Mic className="w-4 h-4 text-rose-500 relative z-10" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white">Recording Voice Note</span>
            <span className="text-xs font-mono font-extrabold text-[#E5F842]">{formatTime(seconds)}</span>
          </div>

          {/* Live Audio Visualizer Bars */}
          <div className="flex items-center gap-1 mt-1 h-3">
            {volumeLevels.map((lvl, idx) => (
              <span
                key={idx}
                className="w-1 bg-[#E5F842] rounded-full transition-all duration-75"
                style={{ height: `${Math.min(100, Math.max(20, lvl))}%` }}
              />
            ))}
            <span className="text-[10px] text-slate-400 ml-1.5 font-medium">Listening...</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCancel}
          disabled={uploading}
          className="p-2 rounded-xl bg-[#25272F] text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
          title="Cancel Recording"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleSend}
          disabled={uploading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E5F842] hover:bg-[#D6EA35] text-[#121316] font-extrabold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Send Voice</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
