import { useEffect, useState } from "react";
import { getVideos } from "../../api/api";
import { Video, Check, Film, X, Loader2, Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  title: string;
  buttonText: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (videoIds: number[]) => void;
  onUploadClick?: () => void;
  extraContent?: React.ReactNode;
  courseId?: number;
  courseTitle?: string;
}

export default function VideoSelectionDialog({
  open,
  title,
  buttonText,
  loading = false,
  onClose,
  onConfirm,
  onUploadClick,
  extraContent,
  courseId,
  courseTitle
}: Props) {
  const [videos, setVideos] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (open) {
      loadVideos();
    }
  }, [open, courseId]);

  async function loadVideos() {
    setFetching(true);
    try {
      const result = await getVideos(courseId);
      const completed = result.filter(
        (video: any) =>
          video.status === "completed" &&
          (courseId ? video.course_id === courseId : true)
      );
      setVideos(completed);
      setSelected(completed.map((video: any) => video.id));
    } catch (err) {
      console.error("Failed to load videos for selection dialog:", err);
    } finally {
      setFetching(false);
    }
  }

  function toggleVideo(id: number) {
    if (selected.includes(id)) {
      setSelected(selected.filter((v) => v !== id));
    } else {
      setSelected([...selected, id]);
    }
  }

  function toggleAll() {
    if (selected.length === videos.length) {
      setSelected([]);
    } else {
      setSelected(videos.map((v) => v.id));
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[#25272F] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#333642] animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#333642] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#18191E] border border-[#333642] text-[#E5F842] flex items-center justify-center font-bold">
              <Film className="w-5 h-5 text-[#E5F842]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">
                {title}
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {courseTitle
                  ? `Select video lessons from "${courseTitle}"`
                  : "Select one or more processed videos to analyze"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-white hover:bg-[#2E313B] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="py-4 overflow-y-auto space-y-4 flex-grow pr-1">
          {extraContent && (
            <div className="bg-[#18191E] p-3.5 rounded-2xl border border-[#333642]">
              {extraContent}
            </div>
          )}

          {fetching ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-7 h-7 text-[#E5F842] animate-spin mb-2" />
              <span className="text-xs font-medium">Loading video collection...</span>
            </div>
          ) : videos.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-[#18191E] text-slate-400 flex items-center justify-center mb-3">
                <Video className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">
                No Processed Videos Found {courseTitle ? `in "${courseTitle}"` : ""}
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mb-4">
                {courseTitle
                  ? `Please upload and process at least one video in "${courseTitle}" first.`
                  : "Please upload and process at least one video first."}
              </p>
              {onUploadClick && (
                <button
                  onClick={onUploadClick}
                  className="px-4 py-2 rounded-xl bg-[#E5F842] hover:bg-[#D6EA35] text-[#121316] font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Upload a Video
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {selected.length} of {videos.length} Selected
                </span>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs font-bold text-[#E5F842] hover:underline cursor-pointer"
                >
                  {selected.length === videos.length ? "Deselect All" : "Select All"}
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {[...videos]
                  .sort((a, b) => (a.order_index || a.id) - (b.order_index || b.id))
                  .map((video, index) => {
                    const isChecked = selected.includes(video.id);
                    return (
                      <div
                        key={video.id}
                        onClick={() => toggleVideo(video.id)}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          isChecked
                            ? "bg-[#E5F842]/10 border-[#E5F842]/50 shadow-xs"
                            : "bg-[#18191E] border-[#333642] hover:border-slate-500 hover:bg-[#2E313B]"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-3">
                          <div
                            className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                              isChecked
                                ? "bg-[#E5F842] text-[#121316]"
                                : "border border-[#333642] bg-[#18191E]"
                            }`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3] text-[#121316]" />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-[#E5F842] bg-[#E5F842]/15 px-2 py-0.5 rounded-md border border-[#E5F842]/30">
                                #{video.order_index || index + 1}
                              </span>
                              <p className="text-sm font-bold text-white truncate">
                                {video.title || video.original_filename || video.filename}
                              </p>
                            </div>
                            <span className="text-[11px] font-medium text-slate-400 mt-0.5 block">
                              Ready for intelligence synthesis
                            </span>
                          </div>
                        </div>

                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E5F842]/15 text-[#E5F842] border border-[#E5F842]/30 shrink-0">
                          <Sparkles className="w-2.5 h-2.5 text-[#E5F842]" />
                          Ready
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[#333642] flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:bg-[#2E313B] hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || selected.length === 0}
            onClick={() => onConfirm(selected)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E5F842] hover:bg-[#D6EA35] text-[#121316] font-extrabold text-sm shadow-md shadow-black/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#121316]" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{buttonText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}