import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import {
  Trophy,
  GraduationCap,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  Award,
  Sparkles,
  BookOpen,
  ArrowRight,
  Video
} from "lucide-react";
import { getQuizAttempts, type QuizAttemptItem, getCourses, type CourseItem } from "../api/api";
import { getStudentCourseMastery, type CourseMasteryProfile } from "../api/skillApi";
import QuizRecommendations from "../components/quiz/QuizRecommendations";
import CourseSkillMasteryCard from "../components/skills/CourseSkillMasteryCard";

export default function QuizScores() {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<QuizAttemptItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [masteryProfile, setMasteryProfile] = useState<CourseMasteryProfile | null>(null);
  const [masteryLoading, setMasteryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedAttemptForRecs, setSelectedAttemptForRecs] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedCourseId]);

  useEffect(() => {
    // Determine active course ID:
    // 1. Explicitly selected course
    // 2. Course from the student's quiz attempt history
    // 3. "Computer" (ID: 3) where student has established quiz history
    // 4. Any course from the list
    const attemptCourseId = attempts.find((a) => a?.course_id)?.course_id;
    const cId = selectedCourseId 
      || attemptCourseId 
      || (courses.find((c) => c.title.toLowerCase().includes("computer"))?.id) 
      || (courses.length > 0 ? courses[courses.length - 1].id : null);

    if (cId) {
      setMasteryLoading(true);
      getStudentCourseMastery(cId)
        .then((res) => setMasteryProfile(res))
        .catch(() => setMasteryProfile(null))
        .finally(() => setMasteryLoading(false));
    } else {
      setMasteryProfile(null);
    }
  }, [selectedCourseId, courses, attempts]);

  async function loadData() {
    setLoading(true);
    try {
      const [attemptsData, coursesData] = await Promise.all([
        getQuizAttempts(selectedCourseId || undefined).catch((err) => {
          console.error("Failed to load quiz attempts:", err);
          return [];
        }),
        getCourses().catch((err) => {
          console.error("Failed to load courses:", err);
          return [];
        })
      ]);
      setAttempts(Array.isArray(attemptsData) ? attemptsData : []);
      setCourses(Array.isArray(coursesData) ? coursesData : []);
    } catch (err) {
      console.error("Failed to load quiz scores:", err);
      setAttempts([]);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }

  // Safe checks for calculations
  const safeAttempts = Array.isArray(attempts) ? attempts : [];
  const totalAttempts = safeAttempts.length;
  const avgPercentage = totalAttempts > 0
    ? Math.round(safeAttempts.reduce((sum, a) => sum + (a?.percentage || 0), 0) / totalAttempts)
    : 0;
  const highestScore = totalAttempts > 0
    ? Math.round(Math.max(...safeAttempts.map(a => a?.percentage || 0)))
    : 0;
  const latestAttempt = totalAttempts > 0 ? safeAttempts[0] : null;

  return (
    <div className="min-h-screen bg-[#121316] text-white pb-20">
      <Navbar />

      <main className="w-full px-4 sm:px-6 lg:px-8 pt-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#333642]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#25272F] border border-[#333642] text-[#E5F842] flex items-center justify-center shadow-lg shadow-black/40 shrink-0">
              <Trophy className="w-7 h-7" />
            </div>

            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  My Quiz Scores & Attempts
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-[#E5F842]/15 text-[#E5F842] border border-[#E5F842]/30">
                  <Sparkles className="w-3.5 h-3.5 text-[#E5F842]" />
                  Learner Performance Log
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1 font-medium">
                Track your completed quiz attempts, historical scores, and review personalized study recommendations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigate("/quiz")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#E5F842] text-[#121316] font-extrabold text-sm hover:bg-[#d6e838] transition-all cursor-pointer shadow-lg shadow-[#E5F842]/10"
            >
              <GraduationCap className="w-4 h-4" />
              Take New Quiz
            </button>
          </div>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {/* Card 1: Total Attempts */}
          <div className="bg-[#25272F] border border-[#333642] rounded-3xl p-5 shadow-lg relative overflow-hidden group hover:border-[#E5F842]/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Attempts
              </span>
              <div className="w-10 h-10 rounded-xl bg-[#18191E] border border-[#333642] flex items-center justify-center text-[#E5F842]">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {totalAttempts}
              </span>
              <span className="text-xs text-slate-400 ml-2 font-medium">
                {totalAttempts === 1 ? "Quiz Taken" : "Quizzes Taken"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Recorded in your learner profile
            </p>
          </div>

          {/* Card 2: Average Score */}
          <div className="bg-[#25272F] border border-[#333642] rounded-3xl p-5 shadow-lg relative overflow-hidden group hover:border-[#E5F842]/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Average Score
              </span>
              <div className="w-10 h-10 rounded-xl bg-[#18191E] border border-[#333642] flex items-center justify-center text-emerald-400">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {avgPercentage}%
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Across all evaluated assessments
            </p>
          </div>

          {/* Card 3: Best Score */}
          <div className="bg-[#25272F] border border-[#333642] rounded-3xl p-5 shadow-lg relative overflow-hidden group hover:border-[#E5F842]/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Best Score
              </span>
              <div className="w-10 h-10 rounded-xl bg-[#18191E] border border-[#333642] flex items-center justify-center text-yellow-400">
                <Award className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {highestScore}%
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Personal highest score recorded
            </p>
          </div>

          {/* Card 4: Recent Score */}
          <div className="bg-[#25272F] border border-[#333642] rounded-3xl p-5 shadow-lg relative overflow-hidden group hover:border-[#E5F842]/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Latest Attempt
              </span>
              <div className="w-10 h-10 rounded-xl bg-[#18191E] border border-[#333642] flex items-center justify-center text-cyan-400">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              {latestAttempt ? (
                <>
                  <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                    {Math.round(latestAttempt.percentage)}%
                  </span>
                  <span className="text-xs text-slate-400 ml-2 font-medium">
                    (Quiz #{latestAttempt.attempt_number || 1})
                  </span>
                </>
              ) : (
                <span className="text-2xl font-bold text-slate-500">N/A</span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {latestAttempt
                ? new Date(latestAttempt.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  })
                : "No attempts yet"}
            </p>
          </div>
        </div>

        {/* Course Switcher for Curriculum Skill Mastery */}
        {courses.length > 0 && (
          <div className="mt-8 flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-[#333642]/60">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                Curriculum Topic Mastery:
              </span>
              <span className="text-xs font-black text-[#E5F842] px-2.5 py-1 rounded-lg bg-[#E5F842]/10 border border-[#E5F842]/30">
                {masteryProfile?.course_title || "Computer"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {courses.map((c) => {
                const isSelected = (selectedCourseId === c.id) || (!selectedCourseId && (masteryProfile?.course_id === c.id));
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCourseId(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-[#E5F842] text-[#121316] shadow-sm font-black"
                        : "bg-[#25272F] text-slate-300 hover:text-white hover:bg-[#2E313B] border border-[#333642]"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    {c.title}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Curriculum Skill Mastery Profile */}
        {masteryProfile && (
          <div className="mt-4">
            <CourseSkillMasteryCard
              profile={masteryProfile}
              loading={masteryLoading}
              showPracticeAction={true}
            />
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-10">
          <div>
            <h2 className="text-xl font-extrabold text-white">Quiz Attempt History</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Detailed breakdown of each quiz taken and its marks.
            </p>
          </div>

          {/* Course Filter Dropdown */}
          {courses.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Filter Course:</span>
              <select
                value={selectedCourseId ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCourseId(val ? Number(val) : null);
                }}
                aria-label="Filter Course"
                className="bg-[#25272F] border border-[#333642] rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-hidden focus:border-[#E5F842] cursor-pointer"
              >
                <option value="">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Attempts List */}
        <div className="mt-6">
          {loading ? (
            <div className="p-12 text-center bg-[#25272F] border border-[#333642] rounded-3xl">
              <div className="w-8 h-8 border-3 border-[#E5F842] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-400">Loading your quiz history...</p>
            </div>
          ) : attempts.length === 0 ? (
            /* Empty State */
            <div className="bg-[#25272F] border border-[#333642] rounded-3xl p-10 text-center max-w-2xl mx-auto shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-[#18191E] border border-[#333642] text-[#E5F842] flex items-center justify-center mx-auto shadow-inner mb-4">
                <GraduationCap className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-extrabold text-white">No Quiz Attempts Found</h3>
              <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
                You haven't completed any quizzes yet. Generate a customized AI quiz from your video lessons to test your comprehension and log your marks here!
              </p>
              <div className="mt-6">
                <button
                  onClick={() => navigate("/quiz")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#E5F842] text-[#121316] font-extrabold text-sm hover:bg-[#d6e838] transition-all cursor-pointer shadow-lg shadow-[#E5F842]/10"
                >
                  <Sparkles className="w-4 h-4" />
                  Take Your First Quiz
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {attempts.map((attempt) => {
                const isPassed = attempt.percentage >= 60;

                const dateStr = new Date(attempt.created_at).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                });
                const timeStr = new Date(attempt.created_at).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit"
                });

                return (
                  <div
                    key={attempt.id}
                    className="bg-[#25272F] border border-[#333642] rounded-2xl p-5 sm:p-6 shadow-md hover:border-[#E5F842]/40 transition-all group"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                      {/* Left: Attempt Number & Details */}
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#18191E] border border-[#333642] flex flex-col items-center justify-center shrink-0 text-white font-extrabold shadow-inner">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Quiz</span>
                          <span className="text-base text-[#E5F842]">#{attempt.attempt_number || 1}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-base font-extrabold text-white">
                              Quiz #{attempt.attempt_number || 1} Assessment
                            </span>

                            <span className="text-slate-600 font-bold">•</span>

                            <span className="text-sm font-bold text-[#E5F842]">
                              {Math.round(attempt.percentage)}%
                            </span>

                            <span className="text-slate-600 font-bold">•</span>

                            <span className={`text-xs font-semibold ${isPassed ? "text-emerald-400" : "text-rose-400"}`}>
                              {isPassed ? "Passed" : "Needs Review"}
                            </span>

                            <span className="text-slate-600 font-bold">•</span>

                            <span className="text-xs text-slate-400 font-medium">
                              {attempt.difficulty}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 flex-wrap">
                            {attempt.course_title && (
                              <span className="flex items-center gap-1.5 text-[#E5F842]">
                                <BookOpen className="w-3.5 h-3.5" />
                                {attempt.course_title}
                              </span>
                            )}

                            {attempt.videos && attempt.videos.length > 0 && (
                              <span className="flex items-center gap-1.5">
                                <Video className="w-3.5 h-3.5 text-slate-400" />
                                {attempt.videos.map(v => v.original_filename || v.filename).join(", ")}
                              </span>
                            )}

                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {dateStr} at {timeStr}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Score breakdown & Recommendation Action */}
                      <div className="flex items-center gap-5 justify-between lg:justify-end border-t lg:border-t-0 pt-4 lg:pt-0 border-[#333642]">
                        <div className="text-right">
                          <div className="text-xs text-slate-400 font-medium">Marks Obtained</div>
                          <div className="text-xl font-extrabold text-white tracking-tight">
                            <span className="text-[#E5F842]">{attempt.score}</span> / {attempt.total_questions}
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            setSelectedAttemptForRecs(
                              selectedAttemptForRecs === attempt.id ? null : attempt.id
                            )
                          }
                          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#18191E] border border-[#333642] text-xs font-bold text-white hover:bg-[#202229] hover:border-[#E5F842]/40 transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#E5F842]" />
                          {selectedAttemptForRecs === attempt.id ? "Hide Recommendations" : "View Recommendations"}
                          <ChevronRight
                            className={`w-3.5 h-3.5 transition-transform ${
                              selectedAttemptForRecs === attempt.id ? "rotate-90" : ""
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Expandable Recommendations Section */}
                    {selectedAttemptForRecs === attempt.id && (
                      <div className="mt-6 pt-6 border-t border-[#333642]">
                        <QuizRecommendations attemptId={attempt.id} />
                      </div>
                    )}
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
