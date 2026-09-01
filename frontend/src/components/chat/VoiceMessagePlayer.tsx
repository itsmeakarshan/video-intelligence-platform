import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, AlertCircle, RotateCcw } from "lucide-react";

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration?: number;
}

export default function VoiceMessagePlayer({ audioUrl, duration }: VoiceMessagePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(audio.duration);
      }
      setHasError(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = (e: any) => {
      console.error("Audio playback error:", e);
      setIsPlaying(false);
      setIsLoading(false);
      setHasError(true);
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handlePlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("pause", handlePause);
    };
  }, [audioUrl]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      setHasError(false);
      setIsLoading(true);
      try {
        await audio.play();
      } catch (err) {
        console.error("Audio play failed:", err);
        setIsLoading(false);
        setIsPlaying(false);
        setHasError(true);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audio) {
      audio.currentTime = newTime;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs) || secs < 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-[#141519] border border-[#333642] min-w-[240px] sm:min-w-[280px]">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
      />

      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-[#E5F842] text-[#121316] flex items-center justify-center shadow-md hover:bg-[#D6EA35] hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-50"
          title={isPlaying ? "Pause" : "Play Voice Note"}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-[#121316] border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-4 h-4 fill-[#121316]" />
          ) : (
            <Play className="w-4 h-4 fill-[#121316] ml-0.5" />
          )}
        </button>

        {/* Progress & Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center justify-between gap-1 mb-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Volume2 className="w-3.5 h-3.5 text-[#E5F842]" />
              <span>Voice Note</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {formatTime(currentTime)} / {formatTime(totalDuration)}
            </span>
          </div>

          {/* Interactive Seek Bar */}
          <div className="relative flex items-center w-full group">
            <input
              type="range"
              min="0"
              max={totalDuration || 100}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              disabled={!totalDuration || hasError}
              className="w-full h-1.5 rounded-lg appearance-none bg-[#25272F] cursor-pointer accent-[#E5F842] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {hasError && (
        <div className="flex items-center justify-between text-[11px] text-rose-400 pt-1 border-t border-rose-500/20">
          <div className="flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Could not load audio.</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.load();
                togglePlay();
              }
            }}
            className="flex items-center gap-1 text-[#E5F842] hover:underline font-semibold cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
