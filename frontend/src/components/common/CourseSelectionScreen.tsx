import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCourses, type CourseItem } from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import {
  BookOpen,
  Layers,
  ArrowRight,
  Loader2,
  Video,
  CheckCircle2,
  ArrowRightLeft
} from "lucide-react";
import { getThumbnailFullUrl } from "../../utils/media";
export { getThumbnailFullUrl };

interface Props {
  studioTitle: string;
  studioSubtitle: string;
  studioIcon: React.ReactNode;
  actionText: string;
  onSelectCourse: (course: CourseItem) => void;
}

export default function CourseSelectionScreen({
  studioTitle,
  studioSubtitle,
  studioIcon,
  actionText,
  onSelectCourse
}: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    setLoading(true);
    try {
      const data = await getCourses();
      // Students only see enrolled courses; admins see all courses
      const accessibleCourses = isAdmin ? data : data.filter((c) => c.is_enrolled);
      setCourses(accessibleCourses);
    } catch (err) {
      console.error("Failed to load courses:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      {/* Studio Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#18191E] border border-[#333642] text-[#E5F842] shadow-md mb-0.5">
          {studioIcon}
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          {studioTitle}
        </h2>
        <p className="text-xs text-slate-400 font-medium max-w-lg mx-auto">
          {studioSubtitle}
        </p>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2.5">
          <Loader2 className="w-7 h-7 text-[#E5F842] animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Loading your enrolled courses...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="p-10 text-center border-2 border-dashed border-[#333642] rounded-2xl max-w-xl mx-auto space-y-3 bg-[#18191E]/60">
          <div className="w-12 h-12 rounded-2xl bg-[#25272F] border border-[#333642] text-slate-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6 text-[#E5F842]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-white">
              {isAdmin ? "No Courses Created Yet" : "No Enrolled Courses Found"}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {isAdmin
                ? "Please create a course and add lessons first from the Courses page."
                : "You haven't enrolled in any courses yet. Enroll in a course from the course catalog to start using AI learning tools."}
            </p>
          </div>
          <button
            onClick={() => navigate("/courses")}
            className="px-5 py-2 rounded-xl bg-[#E5F842] hover:bg-[#D6EA35] text-[#121316] font-extrabold text-xs shadow-md transition-all hover:scale-105 cursor-pointer inline-flex items-center gap-2"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Browse All Courses</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Select an Enrolled Course ({courses.length})
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">
              Only videos from the selected course will be used
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {courses.map((course) => {
              const completedCount = course.completed_video_count ?? 0;
              const totalVideos = course.video_count ?? 0;

              return (
                <div
                  key={course.id}
                  onClick={() => onSelectCourse(course)}
                  className="group bg-[#18191E] rounded-2xl border border-[#333642] hover:border-[#E5F842]/80 hover:shadow-xl hover:shadow-[#E5F842]/5 transition-all duration-200 flex flex-col overflow-hidden cursor-pointer"
                >
                  {/* Thumbnail / Header Card */}
                  <div className="relative h-36 sm:h-40 w-full bg-[#121316] overflow-hidden border-b border-[#333642]/60 shrink-0">
                    {course.thumbnail_url ? (
                      <img
                        src={getThumbnailFullUrl(course.thumbnail_url) || undefined}
                        alt={course.title}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            const fallback = parent.querySelector(".thumb-fallback");
                            if (fallback) (fallback as HTMLElement).style.display = "flex";
                          }
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : null}

                    <div className={`thumb-fallback w-full h-full flex flex-col items-center justify-center text-slate-600 space-y-1.5 ${course.thumbnail_url ? "hidden" : "flex"}`}>
                      <BookOpen className="w-8 h-8 text-[#E5F842]/40" />
                      <span className="text-[11px] font-bold text-slate-500">Course Workspace</span>
                    </div>

                    {/* Lesson Count Badge */}
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-black/80 backdrop-blur-xs text-white text-[10px] font-extrabold border border-white/10 flex items-center gap-1 shadow-md">
                      <Video className="w-3 h-3 text-[#E5F842]" />
                      <span>{totalVideos} {totalVideos === 1 ? "Lesson" : "Lessons"}</span>
                    </div>

                    {/* Enrolled Status Badge */}
                    <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-emerald-500/20 backdrop-blur-xs text-emerald-300 text-[10px] font-extrabold border border-emerald-500/40 flex items-center gap-1 shadow-md">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Enrolled</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white group-hover:text-[#E5F842] transition-colors line-clamp-1">
                        {course.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-normal">
                        {course.description || "Interactive course with structured AI analysis and quiz assessment."}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#333642]/40 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400">
                        {completedCount} AI Indexed
                      </span>

                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-lg bg-[#25272F] group-hover:bg-[#E5F842] text-white group-hover:text-[#121316] font-bold text-[11px] transition-all flex items-center gap-1.5 shadow-xs group-hover:scale-105"
                      >
                        <span>{actionText}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function CourseContextBar({
  selectedCourse,
  onChangeCourse
}: {
  selectedCourse: CourseItem;
  onChangeCourse: () => void;
}) {
  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-[#18191E] border border-[#333642] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
      <div className="flex items-center gap-3 min-w-0">
        {selectedCourse.thumbnail_url ? (
          <img
            src={getThumbnailFullUrl(selectedCourse.thumbnail_url) || undefined}
            alt={selectedCourse.title}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
            className="w-10 h-10 rounded-xl object-cover border border-[#333642] shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-[#E5F842]/15 text-[#E5F842] border border-[#E5F842]/30 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-[#E5F842]" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#E5F842]/20 text-[#E5F842] border border-[#E5F842]/30">
              Active Course
            </span>
            <span className="text-xs text-slate-400 font-bold">
              {selectedCourse.video_count || 0} Lessons
            </span>
          </div>
          <h3 className="text-sm sm:text-base font-extrabold text-white truncate mt-0.5">
            {selectedCourse.title}
          </h3>
        </div>
      </div>

      <button
        onClick={onChangeCourse}
        className="px-3.5 py-2 rounded-xl bg-[#25272F] hover:bg-[#2E313B] text-slate-300 hover:text-white border border-[#333642] hover:border-[#E5F842]/40 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shrink-0 self-end sm:self-auto"
      >
        <ArrowRightLeft className="w-3.5 h-3.5 text-[#E5F842]" />
        <span>Switch Course</span>
      </button>
    </div>
  );
}
