import { useEffect, useMemo, useState } from "react";
import { useVideo } from "../../context/VideoContext";
import { getSegments } from "../../api/api";
import {
  FileText,
  Search,
  Copy,
  Check,
  Play
} from "lucide-react";
import toast from "react-hot-toast";

export interface Segment {
  segment_index: number;
  start_time: number;
  end_time: number;
  text: string;
}

interface Props {
  segments?: Segment[];
  onSeek?: (time: number) => void;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export default function Transcript({ segments: propSegments, onSeek: propOnSeek }: Props) {
  const { selectedVideo, seekTo } = useVideo();
  const [loadedSegments, setLoadedSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    if (propSegments) {
      setLoadedSegments(propSegments);
      return;
    }

    if (selectedVideo && selectedVideo.status === "completed") {
      setLoading(true);
      getSegments(selectedVideo.id)
        .then((data) => {
          setLoadedSegments(data || []);
        })
        .catch((err) => {
          console.error("Failed to load transcript segments:", err);
          setLoadedSegments([]);
        })
        .finally(() => setLoading(false));
    } else {
      setLoadedSegments([]);
    }
  }, [selectedVideo, propSegments]);

  const activeSegments = propSegments || loadedSegments;

  const filteredSegments = useMemo(() => {
    if (!search.trim()) return activeSegments;
    return activeSegments.filter((s) =>
      s.text.toLowerCase().includes(search.toLowerCase())
    );
  }, [activeSegments, search]);

  function handleSeek(time: number, idx: number) {
    setActiveIndex(idx);
    if (propOnSeek) {
      propOnSeek(time);
    } else if (seekTo) {
      seekTo(time);
    }
  }

  async function copyTranscript() {
    try {
      const fullText = filteredSegments.map((s) => `[${formatTime(s.start_time)}] ${s.text}`).join("\n");
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      toast.success("Transcript copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy transcript.");
    }
  }

  if (!selectedVideo && !propSegments) {
    return null;
  }

  return (
    <div className="bg-[#25272F] rounded-3xl p-6 border border-[#333642] shadow-xs text-white">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#333642]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#18191E] border border-[#333642] text-[#E5F842] flex items-center justify-center font-bold">
            <FileText className="w-5 h-5 text-[#E5F842]" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white">
              Interactive Transcript
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Click any timestamp or sentence to jump video playback directly.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-[#18191E] text-slate-300 border border-[#333642] text-xs font-bold">
            {activeSegments.length} Segments
          </span>
          <button
            onClick={copyTranscript}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#333642] hover:border-[#E5F842]/40 text-xs font-bold text-slate-300 hover:bg-[#2E313B] hover:text-white transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#E5F842]" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mt-4">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search transcript by keyword..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-xs bg-[#18191E] text-white placeholder-slate-500 rounded-xl border border-[#333642] focus:outline-hidden focus:border-[#E5F842] transition-colors"
        />
      </div>

      {/* Segments List */}
      <div className="mt-4 max-h-80 overflow-y-auto space-y-2 pr-1">
        {loading ? (
          <div className="text-center py-8 text-xs text-slate-500">
            Loading transcript segments...
          </div>
        ) : filteredSegments.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            {search ? "No matching sentences found." : "No transcript available for this video."}
          </div>
        ) : (
          filteredSegments.map((segment) => {
            const isActive = activeIndex === segment.segment_index;
            return (
              <div
                key={segment.segment_index}
                onClick={() => handleSeek(segment.start_time, segment.segment_index)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 text-xs leading-relaxed ${
                  isActive
                    ? "bg-[#E5F842]/15 border-[#E5F842] shadow-2xs font-semibold text-white"
                    : "bg-[#18191E] hover:bg-[#2E313B] border-[#333642] text-slate-200"
                }`}
              >
                <button
                  type="button"
                  className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#25272F] border border-[#333642] text-[#E5F842] font-bold text-[11px] shadow-2xs hover:border-[#E5F842]"
                >
                  <Play className="w-2.5 h-2.5 fill-[#E5F842] text-[#E5F842]" />
                  {formatTime(segment.start_time)}
                </button>

                <p className="flex-1 pt-0.5">
                  {segment.text}
                </p>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
