import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { generateSummary } from "../../services/chatService";
import { getVideos, type CourseItem } from "../../api/api";
import VideoSelectionDialog from "../common/VideoSelectionDialog";
import { generatePDF } from "../../utils/pdfGenerator";
import {
  FileText,
  Copy,
  Download,
  Check,
  Sparkles,
  Loader2,
  Layers,
  UploadCloud,
  FileCheck
} from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  course?: CourseItem | null;
}

export default function Summary({ course }: Props) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hasVideos, setHasVideos] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedCount, setSelectedCount] = useState<number>(0);

  useEffect(() => {
    checkVideos();
  }, [course?.id]);

  async function checkVideos() {
    try {
      const videos = await getVideos(course?.id);
      const completed = videos.filter(
        (video: any) =>
          video.status === "completed" &&
          (!course?.id || video.course_id === course.id)
      );
      setHasVideos(completed.length > 0);
    } catch {
      setHasVideos(false);
    }
  }

  function openDialog() {
    setDialogOpen(true);
  }

  async function generateSummaryHandler(videoIds: number[]) {
    setDialogOpen(false);
    setLoading(true);
    setSelectedCount(videoIds.length);

    try {
      const result = await generateSummary(videoIds);
      setSummary(result.answer);
      toast.success("AI Summary generated successfully!");
    } catch (error) {
      console.error("Summary generation error:", error);
      toast.error("Failed to generate summary. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function copySummary() {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    toast.success("Summary copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadSummary() {
    if (!summary) return;
    generatePDF({
      title: "AI Executive Summary",
      videoTitle: `${selectedCount > 0 ? selectedCount : "Curated"} Video Collection`,
      content: summary,
      docType: "summary"
    });
    toast.success("PDF summary downloaded!");
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Trigger Section */}
      <div 
        className="rounded-3xl border border-[#333642] shadow-xl overflow-hidden relative"
        style={{
          backgroundImage: "url('/summary.png')",
          backgroundSize: "cover",
          backgroundPosition: "center center"
        }}
      >
        <div className="absolute inset-0 bg-[#18191E]/75 backdrop-blur-md" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6">
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#E5F842]" />
              Executive Synthesis Engine
            </h3>
            <p className="text-xs text-slate-300 font-medium">
              Select one or more lectures from your library to generate an executive synopsis with key topics and timestamps.
            </p>
          </div>

          <div>
            {hasVideos ? (
              <button
                onClick={openDialog}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#E5F842] hover:bg-[#D6EA35] text-[#121316] font-extrabold text-sm shadow-md shadow-black/30 transition-all duration-150 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#121316]" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#121316]" />
                    <span>Select Videos & Generate</span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-[#18191E]/90 px-4 py-2 rounded-xl border border-[#333642]">
                <UploadCloud className="w-4 h-4 text-[#E5F842]" />
                Upload a video in Dashboard first
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loading Skeleton / Progress */}
      {loading && (
        <div 
          className="rounded-3xl border border-[#333642] shadow-xl overflow-hidden relative"
          style={{
            backgroundImage: "url('/summary.png')",
            backgroundSize: "cover",
            backgroundPosition: "center center"
          }}
        >
          <div className="absolute inset-0 bg-[#18191E]/75 backdrop-blur-md" />
          <div className="relative z-10 py-16 text-center flex flex-col items-center justify-center p-8">
            <div className="w-14 h-14 rounded-2xl bg-[#18191E]/90 border border-[#333642] text-[#E5F842] flex items-center justify-center shadow-md mb-4 animate-pulse">
              <Loader2 className="w-7 h-7 animate-spin text-[#E5F842]" />
            </div>
            <h4 className="text-base font-extrabold text-white">
              Synthesizing AI Summary...
            </h4>
            <p className="text-xs text-slate-300 mt-1 max-w-sm font-medium">
              Analyzing video transcripts, extracting pivotal concepts, and formatting key study takeaways.
            </p>
          </div>
        </div>
      )}

      {/* Empty State when no summary generated yet and not loading */}
      {!summary && !loading && (
        <div 
          className="rounded-3xl border border-[#333642] shadow-xl overflow-hidden relative"
          style={{
            backgroundImage: "url('/summary.png')",
            backgroundSize: "cover",
            backgroundPosition: "center center"
          }}
        >
          <div className="absolute inset-0 bg-[#18191E]/75 backdrop-blur-md" />
          <div className="relative z-10 py-16 text-center flex flex-col items-center justify-center p-8">
            <div className="w-14 h-14 rounded-2xl bg-[#18191E]/90 border border-[#333642] text-[#E5F842] flex items-center justify-center mb-3">
              <FileText className="w-7 h-7 text-[#E5F842]" />
            </div>
            <h4 className="text-base font-extrabold text-white">
              No Summary Generated Yet
            </h4>
            <p className="text-xs text-slate-300 mt-1 max-w-sm font-medium mb-5">
              Click "Select Videos & Generate" above to choose lecture videos and receive a comprehensive executive breakdown.
            </p>
            {hasVideos && (
              <button
                onClick={openDialog}
                className="px-5 py-2 rounded-xl bg-[#18191E]/90 border border-[#333642] text-white font-bold text-xs hover:bg-[#2E313B] hover:border-[#E5F842]/40 transition-all cursor-pointer"
              >
                Choose Videos Now
              </button>
            )}
          </div>
        </div>
      )}

      {/* Summary Render Card */}
      {summary && !loading && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Action Buttons Toolbar */}
          <div 
            className="rounded-2xl border border-[#333642] shadow-xs overflow-hidden relative"
            style={{
              backgroundImage: "url('/summary.png')",
              backgroundSize: "cover",
              backgroundPosition: "center center"
            }}
          >
            <div className="absolute inset-0 bg-[#18191E]/75 backdrop-blur-md" />
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#E5F842]/15 text-[#E5F842] flex items-center justify-center font-bold border border-[#E5F842]/30">
                  <FileCheck className="w-4 h-4 text-[#E5F842]" />
                </div>
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                    Executive Lecture Summary
                  </span>
                  <p className="text-[11px] text-slate-300 font-medium">
                    Synthesized across {selectedCount > 0 ? `${selectedCount} selected video lessons` : "selected videos"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={copySummary}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#18191E]/90 border border-[#333642] text-white font-bold text-xs hover:bg-[#2E313B] hover:border-[#E5F842]/40 transition-all cursor-pointer shadow-2xs"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#E5F842]" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>

                <button
                  onClick={downloadSummary}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#E5F842] hover:bg-[#D6EA35] text-[#121316] font-extrabold text-xs shadow-md shadow-black/20 transition-all cursor-pointer hover:scale-102"
                >
                  <Download className="w-3.5 h-3.5 text-[#121316]" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          </div>

          {/* Rendered Markdown Body with custom stylish elements */}
          <div 
            className="rounded-3xl border border-[#333642] shadow-2xl relative overflow-hidden"
            style={{
              backgroundImage: "url('/summary.png')",
              backgroundSize: "cover",
              backgroundPosition: "center center"
            }}
          >
            <div className="absolute inset-0 bg-[#18191E]/80 backdrop-blur-md" />
            <div className="p-6 sm:p-10 relative z-10">
            {/* Ambient Corner Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#E5F842]/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-4xl">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <div className="mt-8 mb-4 pb-3 border-b border-[#333642] first:mt-0">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5F842]/15 text-[#E5F842] text-xs font-black uppercase tracking-wider mb-2 border border-[#E5F842]/30">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Core Section</span>
                      </div>
                      <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        {children}
                      </h1>
                    </div>
                  ),
                  h2: ({ children }) => (
                    <div className="mt-6 mb-3 pt-2">
                      <h2 className="text-base sm:text-lg font-extrabold text-[#E5F842] tracking-tight flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#E5F842] shadow-xs shrink-0" />
                        <span>{children}</span>
                      </h2>
                    </div>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm sm:text-base font-bold text-white mt-4 mb-2">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-sm sm:text-[15px] text-slate-300 leading-relaxed mb-4 font-normal">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="space-y-2.5 my-3 pl-1">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="space-y-2.5 my-3 pl-5 list-decimal text-sm sm:text-[15px] text-slate-300 leading-relaxed">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="flex items-start gap-2.5 text-sm sm:text-[15px] text-slate-200 leading-relaxed group">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E5F842] mt-2 shrink-0 group-hover:scale-125 transition-transform" />
                      <div className="flex-1 min-w-0">{children}</div>
                    </li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-bold text-white bg-[#25272F] px-1.5 py-0.5 rounded-md border border-[#333642] text-xs sm:text-sm">
                      {children}
                    </strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-slate-200">{children}</em>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="my-4 p-4 rounded-2xl bg-[#25272F]/60 border-l-4 border-[#E5F842] text-slate-300 italic text-sm">
                      {children}
                    </blockquote>
                  ),
                  code: ({ children }) => (
                    <code className="px-2 py-0.5 rounded-md bg-[#121316] text-[#E5F842] font-mono text-xs border border-[#333642]">
                      {children}
                    </code>
                  ),
                  hr: () => <hr className="my-6 border-[#333642]" />
                }}
              >
                {summary}
              </ReactMarkdown>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Selection Dialog Modal */}
      <VideoSelectionDialog
        open={dialogOpen}
        title={course ? `Generate AI Summary (${course.title})` : "Generate AI Summary"}
        buttonText="Generate Summary"
        loading={loading}
        onClose={() => setDialogOpen(false)}
        onConfirm={generateSummaryHandler}
        courseId={course?.id}
        courseTitle={course?.title}
      />
    </div>
  );
}