import { useState } from "react";
import { Play, ExternalLink, X } from "lucide-react";

interface YouTubePreviewCardProps {
  url: string;
  title?: string;
}

export function YouTubeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/;
  const match = url.match(regExp);
  return match && match[1] ? match[1] : null;
}

export default function YouTubePreviewCard({ url, title }: YouTubePreviewCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const videoId = extractYouTubeId(url);

  if (!videoId) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-[#E5F842] hover:underline"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        {url}
      </a>
    );
  }

  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  return (
    <>
      <div className="rounded-2xl border border-[#333642] bg-[#18191E] overflow-hidden shadow-lg hover:border-[#E5F842]/50 transition-all max-w-sm mt-2 group">
        {/* Thumbnail with Play Overlay */}
        <div 
          onClick={() => setModalOpen(true)}
          className="relative aspect-video bg-black cursor-pointer overflow-hidden"
        >
          <img
            src={thumbnailUrl}
            alt={title || "YouTube Video"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/0.jpg`;
            }}
          />

          {/* YouTube Play Overlay Badge */}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
            <div className="w-12 h-12 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:bg-rose-600 transition-all">
              <Play className="w-5 h-5 fill-white ml-0.5" />
            </div>
          </div>

          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-[10px] font-extrabold text-white">
            <YouTubeIcon className="w-3.5 h-3.5 text-rose-500" />
            <span>YouTube</span>
          </div>
        </div>

        {/* Video Details & Actions */}
        <div className="p-3 bg-[#18191E]/95 flex items-center justify-between gap-2 border-t border-[#333642]/60">
          <div className="min-w-0 flex-1">
            <h5 className="text-xs font-bold text-white truncate">
              {title || "YouTube Lecture Resource"}
            </h5>
            <p className="text-[10px] text-slate-400 font-mono truncate">{url}</p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-[#E5F842] text-[#121316] font-bold text-[11px] hover:bg-[#D6EA35] transition-colors cursor-pointer"
            >
              Watch
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded-lg bg-[#25272F] text-slate-400 hover:text-white hover:bg-[#2E313B] transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Embedded Video Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-3xl bg-[#18191E] border border-[#333642] rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-[#333642] bg-[#22242B]">
              <div className="flex items-center gap-2">
                <YouTubeIcon className="w-5 h-5 text-rose-500" />
                <span className="text-sm font-extrabold text-white truncate">
                  {title || "YouTube Video"}
                </span>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl bg-[#2C2E37] text-slate-400 hover:text-white hover:bg-[#383B46] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="aspect-video w-full bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
