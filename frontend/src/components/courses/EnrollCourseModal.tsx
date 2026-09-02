import { useState } from "react";
import {
  X,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  BookOpen,
  Video,
  ShieldCheck,
  Building2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { enrollInCourse, type CourseItem } from "../../api/api";
import { getThumbnailFullUrl } from "../../utils/media";

interface EnrollCourseModalProps {
  isOpen: boolean;
  course: CourseItem | null;
  onClose: () => void;
  onEnrolled?: (courseId: number) => void;
}

export default function EnrollCourseModal({
  isOpen,
  course,
  onClose,
  onEnrolled
}: EnrollCourseModalProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !course) return null;

  const price = course.price ?? 0;
  const isFree = price === 0;

  const fullThumbUrl = getThumbnailFullUrl(course.thumbnail_url);

  async function handleConfirmEnroll() {
    if (!course) return;

    setLoading(true);
    setError("");

    try {
      const res = await enrollInCourse(course.id);
      toast.success(res.message || `Successfully enrolled in ${course.title}!`);
      if (onEnrolled) {
        onEnrolled(course.id);
      }
      localStorage.setItem("active_dashboard_course_id", String(course.id));
      // Redirect learner to dashboard to view the enrolled course
      navigate("/dashboard", { state: { courseId: course.id } });
    } catch (err: any) {
      console.error("Enrollment failed:", err);
      const msg = err.response?.data?.detail || err.response?.data?.error || "Failed to complete enrollment.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-[#1E2028] border border-[#333642] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 my-8">
        
        {/* Header */}
        <div className="p-5 border-b border-[#333642] bg-[#25272F] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E5F842]/15 text-[#E5F842] flex items-center justify-center font-extrabold shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Confirm Course Enrollment</h2>
              <p className="text-xs text-slate-400 font-medium">Verify your payment and bank authorization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#18191E] transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Course Summary Card */}
          <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-[#141519] border border-[#333642]">
            <div className="w-20 h-16 rounded-xl bg-[#25272F] overflow-hidden shrink-0 relative flex items-center justify-center">
              {fullThumbUrl ? (
                <img
                  src={fullThumbUrl}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <BookOpen className="w-6 h-6 text-[#E5F842]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-extrabold text-white truncate">{course.title}</h3>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Video className="w-3.5 h-3.5 text-[#E5F842]" />
                <span>{course.video_count} {course.video_count === 1 ? "Lesson" : "Lessons"} included</span>
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className={`px-3 py-1 rounded-xl font-black text-xs ${
                isFree
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-[#E5F842]/20 text-[#E5F842] border border-[#E5F842]/40"
              }`}>
                {isFree ? "FREE" : `£${price.toFixed(2)}`}
              </span>
            </div>
          </div>

          {/* Requested Prompt Confirmation Box */}
          <div className="p-4 rounded-2xl bg-[#25272F] border border-[#3E4251] space-y-2">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Bank Deduction Authorization
                </h4>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {isFree ? (
                    <>
                      Are you sure you want to enroll in <strong className="text-white font-bold">{course.title}</strong>? This course is completely free.
                    </>
                  ) : (
                    <>
                      Are you sure you want to enroll in <strong className="text-white font-bold">{course.title}</strong>? The following amount of <strong className="text-[#E5F842] font-black">£{price.toFixed(2)}</strong> will be deducted from your bank account.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Breakdown receipt */}
          <div className="p-4 rounded-2xl bg-[#141519] border border-[#333642] space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>Course Tuition & Curriculum</span>
              <span className="font-semibold text-white">{isFree ? "£0.00" : `£${price.toFixed(2)}`}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>AI Analysis & Adaptive Forecasting Fee</span>
              <span className="font-semibold text-emerald-400">Waived (£0.00)</span>
            </div>
            <div className="pt-2 border-t border-[#333642] flex items-center justify-between text-sm font-extrabold text-white">
              <span>Total Bank Deduction:</span>
              <span className="text-[#E5F842] text-base">{isFree ? "FREE" : `£${price.toFixed(2)}`}</span>
            </div>
          </div>

          {/* Security Guarantee */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Encrypted 256-bit Bank Authorization • Instant Access</span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#333642]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-2xl bg-[#25272F] hover:bg-[#2E313B] text-slate-300 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirmEnroll}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#E5F842] hover:bg-[#D6EA35] text-[#121316] font-extrabold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#121316]" />
                  <span>Authorizing Enrollment...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#121316]" />
                  <span>{isFree ? "Confirm Enrollment" : `Confirm & Pay £${price.toFixed(2)}`}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
