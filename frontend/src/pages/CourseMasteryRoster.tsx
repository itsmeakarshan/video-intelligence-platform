import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  Eye,
  Search,
  RefreshCw,
  X,
  ArrowUpDown,
  Loader2
} from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "../components/layout/Navbar";
import CourseSkillMasteryCard from "../components/skills/CourseSkillMasteryCard";
import { getCourses, type CourseItem } from "../api/api";
import {
  getCourseAdminMasterySummary,
  getOverallAdminMasterySummary,
  getUserCourseMasteryAsAdmin,
  getCourseSkills,
  type CourseAdminMasterySummary,
  type CourseMasteryProfile,
  type CourseSkillItem
} from "../api/skillApi";

export default function CourseMasteryRoster() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<number | null>(() => courseId ? Number(courseId) : null);
  const [skills, setSkills] = useState<CourseSkillItem[]>([]);
  const [summary, setSummary] = useState<CourseAdminMasterySummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "mastered" | "high" | "support">("all");
  const [sortBy, setSortBy] = useState<"score_desc" | "score_asc" | "quizzes" | "skills" | "name">("score_desc");

  // Inspect Modal
  const [inspectingProfile, setInspectingProfile] = useState<CourseMasteryProfile | null>(null);
  const [inspectingLoading, setInspectingLoading] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const courseList = await getCourses();
        setCourses(courseList);

        if (courseId) {
          const cId = Number(courseId);
          setActiveCourseId(cId);
          loadData(cId);
        } else {
          // Check last active course id from localStorage
          const savedCourseId = localStorage.getItem("last_active_course_id");
          if (savedCourseId && courseList.some(c => c.id === Number(savedCourseId))) {
            const targetId = Number(savedCourseId);
            setActiveCourseId(targetId);
            loadData(targetId);
          } else {
            // Default to Course 3 (Computer, which has 132 quizzes) or 0 (All Courses)
            const preferredCourse = courseList.find(c => c.id === 3) || courseList[0];
            const targetId = preferredCourse ? preferredCourse.id : 0;
            setActiveCourseId(targetId);
            loadData(targetId);
          }
        }
      } catch (err) {
        console.error("Failed to initialize course roster:", err);
        setLoading(false);
      }
    }
    init();
  }, [courseId]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setInspectingProfile(null);
    }
    if (inspectingProfile) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [inspectingProfile]);

  async function loadData(cId: number) {
    setLoading(true);
    try {
      if (cId > 0) {
        const [summaryData, skillsData] = await Promise.all([
          getCourseAdminMasterySummary(cId),
          getCourseSkills(cId).catch(() => [])
        ]);

        setSummary(summaryData);
        setSkills(skillsData);
      } else {
        // Platform-wide aggregate across all courses
        const summaryData = await getOverallAdminMasterySummary();
        setSummary(summaryData);
        setSkills(summaryData.skill_summaries?.map((s, idx) => ({
          id: s.skill_id,
          course_id: 0,
          name: s.skill_name,
          description: "",
          category: s.category,
          order_index: idx,
          created_at: ""
        })) || []);
      }
    } catch (err: any) {
      console.error("Failed to load course mastery roster:", err);
      toast.error("Failed to load student mastery roster.");
    } finally {
      setLoading(false);
    }
  }

  function handleSelectCourse(cId: number) {
    setActiveCourseId(cId);
    if (cId > 0) {
      localStorage.setItem("last_active_course_id", String(cId));
      navigate(`/courses/${cId}/roster`);
    } else {
      navigate(`/roster`);
    }
    loadData(cId);
  }

  async function handleInspectStudent(userId: number) {
    setInspectingLoading(true);
    try {
      const profile = await getUserCourseMasteryAsAdmin(userId, activeCourseId || 0);
      setInspectingProfile(profile);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to load student mastery profile.");
    } finally {
      setInspectingLoading(false);
    }
  }

  // Filtered & Sorted Student Roster
  const filteredStudents = useMemo(() => {
    if (!summary?.student_masteries) return [];
    let list = [...summary.student_masteries];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (st) =>
          st.student_name.toLowerCase().includes(q) ||
          st.student_email.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter === "mastered") {
      list = list.filter((st) => st.mastered_skills_count > 0);
    } else if (statusFilter === "high") {
      list = list.filter((st) => st.overall_percentage >= 80);
    } else if (statusFilter === "support") {
      list = list.filter((st) => st.overall_percentage < 80);
    }

    // Sorting
    list.sort((a, b) => {
      switch (sortBy) {
        case "score_desc":
          return b.overall_percentage - a.overall_percentage;
        case "score_asc":
          return a.overall_percentage - b.overall_percentage;
        case "quizzes":
          return b.quizzes_taken - a.quizzes_taken;
        case "skills":
          return b.mastered_skills_count - a.mastered_skills_count;
        case "name":
          return a.student_name.localeCompare(b.student_name);
        default:
          return 0;
      }
    });

    return list;
  }, [summary?.student_masteries, searchQuery, statusFilter, sortBy]);

  return (
    <div className="min-h-screen bg-[#121316] text-white">
      <Navbar />

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-8 space-y-8">
        {/* Navigation Breadcrumb & Course Selector */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => activeCourseId && activeCourseId > 0 ? navigate(`/courses/${activeCourseId}`, { state: { tab: "skills" } }) : navigate("/courses")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#18191E] border border-[#333642] text-slate-300 hover:text-white hover:bg-[#25272F] text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-[#E5F842]" />
            <span>{activeCourseId && activeCourseId > 0 ? "Back to Course Studio" : "Back to Courses"}</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#18191E] border border-[#333642] px-3.5 py-1.5 rounded-xl shadow-sm">
              <span className="text-xs font-bold text-slate-400">View Roster For:</span>
              <select
                value={activeCourseId !== null ? activeCourseId : 0}
                onChange={(e) => handleSelectCourse(Number(e.target.value))}
                className="bg-transparent text-[#E5F842] font-black text-xs focus:outline-hidden cursor-pointer"
              >
                <option value="0" className="bg-[#18191E] text-white font-bold">
                  🌟 All Courses (Platform Cohort)
                </option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#18191E] text-white font-bold">
                    {c.title} {c.id === 3 ? "🔥 (132 Quizzes)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Hero Header Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#18191E] border border-[#333642] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black uppercase tracking-widest text-[#E5F842] bg-[#E5F842]/15 px-3 py-1 rounded-lg border border-[#E5F842]/30">
                Course Intelligence Analytics
              </span>
              <span className="text-xs font-bold text-slate-400 bg-[#25272F] px-2.5 py-1 rounded-md border border-[#333642]">
                {skills.length} Curriculum Skills
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <Award className="w-8 h-8 text-[#E5F842]" />
              <span>Class-Wide Student Mastery Roster</span>
            </h1>
            <p className="text-sm text-slate-300 font-medium max-w-2xl leading-relaxed">
              Track individual and cohort progression across every extracted skill. Detailed quiz accuracy profiles identify students excelling and those requiring targeted practice.
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0 self-start md:self-auto flex-wrap">
            <button
              onClick={() => activeCourseId && loadData(activeCourseId)}
              disabled={loading}
              className="p-3 rounded-2xl bg-[#25272F] hover:bg-[#2e313b] text-slate-300 hover:text-[#E5F842] border border-[#333642] transition-colors cursor-pointer"
              title="Refresh Roster Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            {summary && (
              <div className="px-5 py-3 rounded-2xl bg-[#25272F] border border-[#333642] text-right shadow-sm">
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Class Avg Score
                </span>
                <span className="text-2xl font-black text-[#E5F842]">
                  {summary.average_score}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Search, Filters & Table Section */}
        <div className="rounded-3xl bg-[#18191E] border border-[#333642] shadow-xl overflow-hidden">
          {/* Controls Bar */}
          <div className="p-5 sm:p-6 border-b border-[#333642] flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student by name or email..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#121316] border border-[#333642] text-sm text-white focus:outline-hidden focus:border-[#E5F842] placeholder:text-slate-500"
              />
            </div>

            {/* Filters & Sorting */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-[#121316] border border-[#333642] rounded-xl text-xs font-bold">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    statusFilter === "all" ? "bg-[#25272F] text-white shadow-xs" : "text-slate-400 hover:text-white"
                  }`}
                >
                  All ({summary?.student_masteries?.length ?? 0})
                </button>
                <button
                  onClick={() => setStatusFilter("mastered")}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    statusFilter === "mastered" ? "bg-emerald-500/20 text-emerald-300" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Has Mastered Skills
                </button>
                <button
                  onClick={() => setStatusFilter("high")}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    statusFilter === "high" ? "bg-[#E5F842]/20 text-[#E5F842]" : "text-slate-400 hover:text-white"
                  }`}
                >
                  ≥ 80% Score
                </button>
                <button
                  onClick={() => setStatusFilter("support")}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    statusFilter === "support" ? "bg-amber-500/20 text-amber-300" : "text-slate-400 hover:text-white"
                  }`}
                >
                  &lt; 80% Score
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1.5 bg-[#121316] border border-[#333642] rounded-xl px-3 py-2 text-xs font-bold">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-white focus:outline-hidden cursor-pointer"
                >
                  <option value="score_desc" className="bg-[#18191E]">Score: High to Low</option>
                  <option value="score_asc" className="bg-[#18191E]">Score: Low to High</option>
                  <option value="quizzes" className="bg-[#18191E]">Most Quizzes Taken</option>
                  <option value="skills" className="bg-[#18191E]">Most Skills Mastered</option>
                  <option value="name" className="bg-[#18191E]">Student Name (A-Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table View */}
          {loading ? (
            <div className="p-16 text-center">
              <Loader2 className="w-10 h-10 text-[#E5F842] animate-spin mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-400">Loading student mastery roster...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-16 text-center space-y-2">
              <p className="text-base font-bold text-white">No students match the current filters.</p>
              <p className="text-xs text-slate-400">Try clearing the search query or selecting "All Students".</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-[#121316] text-xs font-black uppercase text-slate-400 tracking-wider border-b border-[#333642]">
                  <tr>
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4 text-center">Quizzes Taken</th>
                    <th className="px-6 py-4 text-center">Mastered Skills</th>
                    <th className="px-6 py-4 text-center">Overall Score</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#25272F]">
                  {filteredStudents.map((st) => {
                    const isHigh = st.overall_percentage >= 80;
                    const isMedium = st.overall_percentage >= 60 && st.overall_percentage < 80;

                    return (
                      <tr key={st.user_id} className="hover:bg-[#25272F]/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#25272F] border border-[#333642] flex items-center justify-center text-xs font-black text-[#E5F842] shrink-0">
                              {st.student_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-extrabold text-white text-sm">{st.student_name}</div>
                              <div className="text-xs text-slate-400 font-medium">{st.student_email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center font-black text-white text-base">
                          {st.quizzes_taken}
                        </td>

                        <td className="px-6 py-4 text-center font-black text-white text-base">
                          {st.mastered_skills_count} / {st.total_skills_count}
                        </td>

                        <td className="px-6 py-4 text-center font-black text-base">
                          <span
                            className={
                              isHigh
                                ? "text-emerald-400"
                                : isMedium
                                ? "text-amber-400"
                                : "text-rose-400"
                            }
                          >
                            {st.overall_percentage}%
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleInspectStudent(st.user_id)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25272F] hover:bg-[#E5F842] hover:text-[#121316] text-slate-300 font-extrabold text-xs transition-all cursor-pointer border border-[#333642] shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect Mastery</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* INSPECT STUDENT MODAL */}
      {inspectingProfile && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm p-3 sm:p-6 md:p-8 flex justify-center items-start animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInspectingProfile(null);
          }}
        >
          <div className="max-w-5xl w-full my-2 sm:my-4 bg-[#18191E] border border-[#333642] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Sticky Header */}
            <div className="px-6 py-4 border-b border-[#333642] bg-[#22242B] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E5F842] text-[#121316] flex items-center justify-center font-black text-sm shadow-sm">
                  {inspectingProfile.user_name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">
                      {inspectingProfile.user_name}
                    </h3>
                    <span className="text-[11px] font-bold text-slate-300 bg-[#18191E] px-2.5 py-0.5 rounded-md border border-[#333642]">
                      {inspectingProfile.course_title}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">
                    Student Mastery Profile & Skill Tree Breakdown
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#18191E] border border-[#333642] text-xs font-bold text-slate-300">
                  <span>Overall Mastery:</span>
                  <span className="text-[#E5F842] font-black">{inspectingProfile.overall_mastery_percentage}%</span>
                </div>
                <button
                  onClick={() => setInspectingProfile(null)}
                  className="p-2 rounded-xl bg-[#18191E] hover:bg-[#E5F842] hover:text-[#121316] text-slate-400 border border-[#333642] transition-colors cursor-pointer shadow-sm"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <CourseSkillMasteryCard
                profile={inspectingProfile}
                loading={inspectingLoading}
                showPracticeAction={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
