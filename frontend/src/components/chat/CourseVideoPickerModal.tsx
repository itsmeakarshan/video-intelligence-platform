import { useState, useEffect } from "react";
import { X, Play, Film, Loader2 } from "lucide-react";
import { getCourse, type CourseVideoItem } from "../../api/api";
import { API_URL } from "../../utils/constants";
import toast from "react-hot-toast";

interface CourseVideoPickerModalProps {
  open: boolean;
  courseId: number;
  courseTitle: string;
  onClose: () => void;
  onSelectVideo: (video: CourseVideoItem) => Promise<void>;
}

export default function CourseVideoPickerModal({
  open,
  courseId,
  courseTitle,
  onClose,
  onSelectVideo
}: CourseVideoPickerModalProps) {
  const [videos, setVideos] = useState<CourseVideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<number | null>(null);

  const token = (localStorage.getItem("access_token") || "").replace(/^"|"$/g, "").trim();

  useEffect(() => {
    if (open && courseId) {
      loadVideos();
    }
  }, [open, courseId]);

  async function loadVideos() {
    setLoading(true);
    try {
      const course = await getCourse(courseId);
      const videoList = (course.videos || []) as CourseVideoItem[];
      setVideos(videoList.filter((v) => v.status === "completed"));
    } catch (err) {
      console.error("Failed to load course videos:", err);
      toast.error("Could not fetch course videos.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePick(video: CourseVideoItem) {
    setSendingId(video.id);
    try {
      await onSelectVideo(video);
      onClose();
    } catch (err) {
      console.error("Error sharing video:", err);
    } finally {
      setSendingId(null);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-[#18191E] border border-[#333642] rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#333642] bg-[#22242B]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E5F842]/15 text-[#E5F842] flex items-center justify-center border border-[#E5F842]/30">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-white">Share Course Video</h4>
              <p className="text-xs text-slate-400 font-medium truncate max-w-xs sm:max-w-md">
                From: {courseTitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#2C2E37] text-slate-400 hover:text-white hover:bg-[#383B46] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video Grid */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="py-16 text-center flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#E5F842] mb-2" />
              <span className="text-xs font-semibold">Loading course lecture videos...</span>
            </div>
          ) : videos.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center text-slate-400">
              <Film className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-sm font-bold text-white">No processed videos found</p>
              <p className="text-xs text-slate-400 mt-1">Upload lecture videos in Course Studio first.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {videos.map((video, idx) => {
                const thumbUrl = `${API_URL}/videos/${video.id}/thumbnail${token ? `?access_token=${token}` : ""}`;
                const isSending = sendingId === video.id;

                return (
                  <div
                    key={video.id}
                    className="bg-[#22242B] border border-[#333642] hover:border-[#E5F842]/50 rounded-2xl overflow-hidden p-3 flex flex-col justify-between gap-2.5 transition-all group"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video rounded-xl bg-black overflow-hidden">
                      <img
                        src={thumbUrl}
                        alt={video.title || video.filename}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-[10px] font-black text-[#E5F842]">
                        #{idx + 1}
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <h5 className="text-xs font-bold text-white truncate" title={video.title || video.filename}>
                        {video.title || video.filename}
                      </h5>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Lesson #{video.order_index || idx + 1}
                      </p>
                    </div>

                    {/* Action */}
                    <button
                      onClick={() => handlePick(video)}
                      disabled={isSending}
                      className="w-full py-2 px-3 rounded-xl bg-[#E5F842] hover:bg-[#D6EA35] text-[#121316] font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Attaching...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-[#121316]" />
                          <span>Attach to Chat</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
