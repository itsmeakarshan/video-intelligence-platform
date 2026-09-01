import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Video as VideoIcon,
  Play,
  CheckCircle2,
  Clock,
  Loader2,
  Trash2,
  BookOpen,
  GraduationCap,
  Search
} from "lucide-react";
import toast from "react-hot-toast";
import { deleteVideo, generateTranscript, getVideos } from "../../api/api";
import { API_URL } from "../../utils/constants";
import { useVideo } from "../../context/VideoContext";
import type { VideoItem } from "../../context/VideoContext";
import { useChat } from "../../context/ChatContext";
import { useAuth } from "../../context/AuthContext";
import ConfirmDialog from "../common/ConfirmDialog";

export default function VideoLibrary() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const {
    videos,
    setVideos,
    selectedVideo,
    setSelectedVideo,
    setVideoUrl,
    loadVideo,
    getVideoDisplayNumber
  } = useVideo();

  const { setSelectedVideos: setChatSelectedVideos } = useChat();
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingVideo, setDeletingVideo] = useState<{ id: number; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadVideos();
    const handleVideosUpdated = () => loadVideos();
    window.addEventListener("videosUpdated", handleVideosUpdated);
    return () => window.removeEventListener("videosUpdated", handleVideosUpdated);
  }, []);

  useEffect(() => {
    const hasActive = videos.some(
      (v) => v.status === "processing" || v.status === "queued"
    );
    if (!hasActive) return;

    const interval = setInterval(() => {
      loadVideos();
    }, 1200);

    return () => clearInterval(interval);
  }, [videos]);

  async function loadVideos() {
    try {
      const data = await getVideos();
      setVideos(data);
    } catch (err) {
      console.error("Failed to load videos", err);
    }
  }

  async function handleProcessVideo(e: React.MouseEvent, videoId: number) {
    e.stopPropagation();
    try {
      await generateTranscript(videoId);
      toast.success("Video added to processing queue.");
      loadVideos();
    } catch {
      toast.error("Unable to start video processing.");
    }
  }

  function handleDeleteVideo(e: React.MouseEvent, videoId: number, title: string) {
    e.stopPropagation();
    setDeletingVideo({ id: videoId, title });
  }

  async function confirmDeleteVideo() {
    if (!deletingVideo) return;
    setIsDeleting(true);
    try {
      await deleteVideo(deletingVideo.id);
      toast.success("Video and associated files completely deleted.");
      if (selectedVideo?.id === deletingVideo.id) {
        setSelectedVideo(null);
        setVideoUrl("");
      }
      setVideos(videos.filter((v) => v.id !== deletingVideo.id));
      setDeletingVideo(null);
      loadVideos();
    } catch {
      toast.error("Unable to delete video.");
    } finally {
      setIsDeleting(false);
    }
  }

  function handleSelectVideo(video: VideoItem) {
    loadVideo(video);
    setChatSelectedVideos([video.id]);
    window.scrollTo({ top: 120, behavior: "smooth" });
  }

  const filteredVideos = videos.filter((v) => {
    const matchesQuery = (v.original_filename || v.filename).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesQuery;
  });

  return (
    <div className="bg-[#25272F] rounded-3xl p-6 border border-[#333642] shadow-xs text-white">
      
      {/* Section Header matching Wise theme */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#333642]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#18191E] border border-[#333642] text-[#E5F842] flex items-center justify-center font-bold">
            <VideoIcon className="w-5 h-5 text-[#E5F842]" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-white">
              Video Library
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Select, view, and manage your processed learning video collection.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-[#18191E] text-white placeholder-slate-500 rounded-xl border border-[#333642] focus:outline-hidden focus:border-[#E5F842] transition-colors"
          />
        </div>
      </div>

      {/* Videos List / Grid */}
      <div className="mt-5 space-y-3">
        {filteredVideos.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">
            No videos found matching your search.
          </div>
        ) : (
          filteredVideos.map((video) => {
            const isSelected = selectedVideo?.id === video.id;
            const title = video.original_filename || video.filename || `Video #${video.id}`;
            const displayNum = getVideoDisplayNumber(video.id);
            const token = localStorage.getItem("access_token") || "";
            const thumbUrl = `${API_URL}/videos/${video.id}/thumbnail?access_token=${encodeURIComponent(token)}`;

            return (
              <div
                key={video.id}
                onClick={() => handleSelectVideo(video)}
                className={`group p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isSelected
                    ? "bg-[#E5F842]/10 border-[#E5F842]/60 shadow-xs"
                    : "bg-[#18191E] hover:bg-[#2E313B] border-[#333642] hover:border-[#E5F842]/40"
                }`}
              >
                {/* Left: Video Thumbnail & Info */}
                <div className="flex items-center gap-4 min-w-0">
                  
                  {/* Real Video Thumbnail Frame */}
                  <div className="relative w-36 sm:w-44 aspect-video rounded-xl overflow-hidden bg-[#0E0F12] border border-[#333642] shrink-0 group-hover:border-[#E5F842]/50 transition-all shadow-inner">
                    <img
                      src={thumbUrl}
                      alt={title}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Lesson Sequence Number Overlay Badge */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-xs text-[#E5F842] font-black text-xs border border-white/10 shadow-xs">
                      #{displayNum}
                    </div>

                    {/* Center Play Overlay Icon on Hover */}
                    <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                      isSelected ? "opacity-100 bg-[#E5F842]/20" : "opacity-0 group-hover:opacity-100 bg-black/40"
                    }`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${
                        isSelected ? "bg-[#E5F842] text-[#121316]" : "bg-black/80 text-white border border-white/20"
                      }`}>
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white truncate group-hover:text-[#E5F842] transition-colors">
                      {title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {video.status === "completed" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E5F842] bg-[#E5F842]/15 border border-[#E5F842]/30 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3 h-3" />
                          Processed & Ready
                        </span>
                      )}

                      {video.status === "processing" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Processing {video.progress || 0}%
                        </span>
                      )}

                      {video.status === "queued" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-300 bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 rounded-md">
                          <Clock className="w-3 h-3" />
                          Queued
                        </span>
                      )}

                      {video.status === "uploaded" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-[#25272F] border border-[#333642] px-2 py-0.5 rounded-md">
                          Uploaded
                        </span>
                      )}

                      <span className="text-[11px] text-slate-400 font-medium">
                        {(video.file_size / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {video.status === "uploaded" && isAdmin && (
                    <button
                      onClick={(e) => handleProcessVideo(e, video.id)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-[#E5F842] hover:bg-[#D6EA35] text-[#121316] shadow-xs transition-colors cursor-pointer"
                    >
                      Process Video
                    </button>
                  )}

                  {video.status === "completed" && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectVideo(video);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#E5F842] text-[#121316] font-extrabold"
                            : "bg-[#25272F] border border-[#333642] text-slate-300 hover:text-white hover:bg-[#2E313B]"
                        }`}
                      >
                        {isSelected ? "Watching" : "Watch"}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectVideo(video);
                          navigate("/quiz", { state: { courseId: video.course_id } });
                        }}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-[#E5F842] hover:bg-[#25272F] transition-colors cursor-pointer"
                        title="Take Quiz on this Video"
                      >
                        <GraduationCap className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectVideo(video);
                          navigate("/notes", { state: { courseId: video.course_id } });
                        }}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-[#E5F842] hover:bg-[#25272F] transition-colors cursor-pointer"
                        title="Generate Notes"
                      >
                        <BookOpen className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {isAdmin && (
                    <button
                      onClick={(e) => handleDeleteVideo(e, video.id, title)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete video"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DELETE VIDEO CONFIRMATION MODAL */}
      <ConfirmDialog
        isOpen={!!deletingVideo}
        title="Delete Video?"
        message={`Are you sure you want to permanently delete "${deletingVideo?.title}"? This will remove the video file, transcripts, and embeddings.`}
        confirmText="Delete Completely"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={confirmDeleteVideo}
        onCancel={() => setDeletingVideo(null)}
      />
    </div>
  );
}
