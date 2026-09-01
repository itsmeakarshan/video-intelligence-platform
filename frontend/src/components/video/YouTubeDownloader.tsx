import { useState } from "react";
import { downloadYouTubeVideo } from "../../api/api";
import {
  Video,
  Link as LinkIcon,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles
} from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  courseId?: number;
  onDownloaded?: () => void;
}

export default function YouTubeDownloader({ courseId, onDownloaded }: Props = {}) {
  const [url, setUrl] = useState("");
  const [quality, setQuality] = useState("720");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleDownload(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError("");
    setSuccess("");

    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setError("Please paste a YouTube video link.");
      return;
    }

    if (
      !trimmedUrl.includes("youtube.com/") &&
      !trimmedUrl.includes("youtu.be/")
    ) {
      setError("Please enter a valid YouTube URL (e.g. https://www.youtube.com/watch?v=...)");
      return;
    }

    setLoading(true);

    try {
      const result = await downloadYouTubeVideo(trimmedUrl, quality, courseId);
      const msg = result?.message || "YouTube video downloaded and indexed successfully.";
      setSuccess(msg);
      toast.success("YouTube video imported into course!");
      window.dispatchEvent(new Event("videosUpdated"));
      onDownloaded?.();
      setUrl("");
    } catch (err: any) {
      const msg = err?.message || "Unable to download the YouTube video. Please try another link.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full space-y-4 pt-2 text-white">
      {/* Subheader */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[#25272F] text-[#E5F842] flex items-center justify-center font-bold shrink-0 border border-[#333642]">
          <Video className="w-5 h-5 text-[#E5F842]" />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-white">
            Import from YouTube
          </h3>
          <p className="text-xs text-slate-400 font-medium">
            Paste any public YouTube URL to download, transcribe, and index into your platform.
          </p>
        </div>
      </div>

      {/* Form Container */}
      <form
        onSubmit={handleDownload}
        className="p-5 rounded-2xl bg-[#18191E] border border-[#333642] space-y-3.5"
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* URL Input */}
          <div className="relative flex-grow">
            <LinkIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={url}
              disabled={loading}
              onChange={(e) => {
                setUrl(e.target.value);
                setError("");
                setSuccess("");
              }}
              placeholder="Paste YouTube video link (e.g. https://youtu.be/...)"
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#25272F] rounded-xl border border-[#333642] focus:outline-hidden focus:border-[#E5F842] text-white placeholder:text-slate-500 transition-all font-medium"
            />
          </div>

          {/* Quality Select */}
          <div className="shrink-0 w-full sm:w-40">
            <select
              value={quality}
              disabled={loading}
              onChange={(e) => setQuality(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-[#25272F] rounded-xl border border-[#333642] focus:outline-hidden focus:border-[#E5F842] text-white font-semibold transition-all cursor-pointer"
            >
              <option value="360">360p Standard</option>
              <option value="480">480p Medium</option>
              <option value="720">720p HD (Fast)</option>
              <option value="1080">1080p Full HD</option>
            </select>
          </div>

          {/* Download Button */}
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#E5F842] hover:bg-[#D6EA35] text-[#121316] font-extrabold text-sm shadow-md shadow-black/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#121316]" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-[#121316]" />
                <span>Download</span>
              </>
            )}
          </button>
        </div>

        <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#E5F842] shrink-0" />
          <span>
            Whisper transcription and vector chunk embeddings will automatically generate upon download.
          </span>
        </p>

        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#E5F842]/15 border border-[#E5F842]/30 text-[#E5F842] text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-[#E5F842] shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}
      </form>
    </div>
  );
}