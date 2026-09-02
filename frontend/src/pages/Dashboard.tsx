import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import { getCourses, type CourseItem } from "../api/api";
import { getThumbnailFullUrl } from "../utils/media";
import { useAuth } from "../context/AuthContext";
import {
  Bot,
  BookOpen,
  ArrowRight,
  Loader2,
  Video,
  CheckCircle2,
  Trophy
} from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user: authUser, isAdmin } = useAuth();

  const [enrolledCourses, setEnrolledCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);

  const user = authUser || { name: "User", role: "student" };

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchEnrolledCourses();
  }, []);

  async function fetchEnrolledCourses() {
    setLoading(true);
    try {
      const allCourses = await getCourses();
      const enrolled = allCourses.filter((c) => isAdmin || c.is_enrolled);
      setEnrolledCourses(enrolled);
    } catch (err) {
      console.error("Failed to load enrolled courses:", err);
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="min-h-screen bg-transparent text-white pb-16">
      <Navbar />

      <main className="w-full px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* 1. WELCOME HEADER BANNER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#333642]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#25272F] border border-[#333642] text-[#E5F842] flex items-center justify-center shadow-lg shadow-black/40 shrink-0">
              <Bot className="w-7 h-7" />
            </div>

            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Welcome back, {user.name} 👋
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E5F842]/15 text-[#E5F842] border border-[#E5F842]/30">
                  <span className="w-2 h-2 rounded-full bg-[#E5F842] animate-pulse" />
                  {isAdmin ? "Instructor / Admin Session" : "Active Student Session"}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1 font-medium">
                Your enrolled learning tracks, interactive video lectures & AI tutor workspace
              </p>
            </div>
          </div>

          {!isAdmin && (
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <button
                onClick={() => navigate("/scores")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#E5F842] text-[#121316] font-extrabold text-sm hover:bg-[#d6e838] transition-all duration-150 cursor-pointer shadow-lg shadow-[#E5F842]/10"
              >
                <Trophy className="w-4.5 h-4.5 text-[#121316]" />
                My Scores & Attempts
              </button>
            </div>
          )}
        </div>

        {/* 2. ENROLLED COURSES SECTION */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#E5F842]/15 text-[#E5F842] flex items-center justify-center font-bold border border-[#E5F842]/20">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <span>My Enrolled Courses</span>
                  {!loading && (
                    <span className="px-2 py-0.5 rounded-full bg-[#E5F842] text-[#121316] text-[11px] font-black">
                      {enrolledCourses.length}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  Select any course to view its curriculum, video lessons, and interactive AI chat
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate("/courses")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25272F] hover:bg-[#2E313B] text-slate-300 hover:text-white border border-[#333642] text-xs font-bold transition-all cursor-pointer"
            >
              <span>Explore All Courses</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#E5F842]" />
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 bg-[#25272F] rounded-3xl border border-[#333642] text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#E5F842]" />
              <span className="text-xs font-bold">Loading your enrolled courses...</span>
            </div>
          ) : enrolledCourses.length === 0 ? (
            /* No enrolled courses empty state */
            <div className="p-12 rounded-3xl bg-[#25272F] border border-[#333642] text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-[#18191E] border border-[#333642] text-[#E5F842] flex items-center justify-center shadow-lg">
                <BookOpen className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-lg font-extrabold text-white">
                  No Enrolled Courses Yet
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  You have not enrolled in any courses yet. Browse our Course Catalog to unlock interactive video lectures, lesson notes, quizzes, and live AI tutor chat.
                </p>
              </div>
              <button
                onClick={() => navigate("/courses")}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#E5F842] hover:bg-[#D6EA35] text-[#121316] font-extrabold text-xs shadow-md transition-all cursor-pointer"
              >
                <span>Browse & Enroll in Courses</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Enrolled courses card grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {enrolledCourses.map((course) => {
                const thumb = getThumbnailFullUrl(course.thumbnail_url);

                return (
                  <div
                    key={course.id}
                    onClick={() => navigate(`/courses/${course.id}`)}
                    className="group bg-[#25272F] rounded-3xl border border-[#333642] shadow-xs hover:shadow-2xl hover:border-[#E5F842]/60 transition-all duration-200 overflow-hidden flex flex-col cursor-pointer"
                  >
                    {/* Thumbnail Image Container */}
                    <div className="relative w-full h-48 bg-[#18191E] overflow-hidden shrink-0">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#2E313B] via-[#1E2028] to-[#18191E] flex flex-col items-center justify-center p-6 text-white text-center">
                          <BookOpen className="w-12 h-12 text-[#E5F842] mb-2 opacity-80" />
                          <span className="text-xs font-extrabold uppercase tracking-widest text-[#E5F842]">
                            Course Track
                          </span>
                        </div>
                      )}

                      {/* Lesson Count & Enrolled Badges */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                        <div className="bg-[#18191E]/90 backdrop-blur-md px-3 py-1 rounded-full text-white text-[11px] font-bold flex items-center gap-1.5 border border-white/10 shadow-xs">
                          <Video className="w-3 h-3 text-[#E5F842]" />
                          <span>{course.video_count} {course.video_count === 1 ? "Lesson" : "Lessons"}</span>
                        </div>

                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1 shadow-md">
                          <CheckCircle2 className="w-3 h-3" />
                          Enrolled
                        </span>
                      </div>
                    </div>

                    {/* Course Body */}
                    <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <h3 className="text-lg font-extrabold text-white group-hover:text-[#E5F842] transition-colors line-clamp-1">
                          {course.title}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium line-clamp-2 leading-relaxed">
                          {course.description || "No description provided for this course."}
                        </p>
                      </div>

                      {/* Footer Info & Action */}
                      <div className="pt-4 border-t border-[#333642] flex items-center justify-between">
                        <div className="text-[11px] text-slate-500 font-semibold">
                          By {course.user_name || "Instructor"}
                        </div>

                        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#E5F842] group-hover:bg-[#D6EA35] text-[#121316] font-extrabold text-xs shadow-sm transition-all">
                          <span>Continue Learning</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
