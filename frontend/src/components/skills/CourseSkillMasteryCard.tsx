import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Brain,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Filter,
  RefreshCw
} from "lucide-react";
import type { CourseMasteryProfile } from "../../api/skillApi";
import HoverableSkillPieChart from "./HoverableSkillPieChart";

interface Props {
  profile: CourseMasteryProfile | null;
  loading?: boolean;
  onRefresh?: () => void;
  showPracticeAction?: boolean;
}

export default function CourseSkillMasteryCard({
  profile,
  loading = false,
  onRefresh,
  showPracticeAction = true
}: Props) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "mastered" | "practice" | "unassessed">("all");

  if (loading) {
    return (
      <div className="bg-[#23252E] border border-[#333642] rounded-2xl p-8 flex flex-col items-center justify-center text-center">
        <div className="w-10 h-10 border-3 border-[#E5F842] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-medium">Analyzing curriculum mastery profile...</p>
      </div>
    );
  }

  if (!profile || profile.skills.length === 0) {
    return (
      <div className="bg-[#23252E] border border-[#333642] rounded-2xl p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#18191E] border border-[#333642] flex items-center justify-center mx-auto mb-4 text-[#E5F842]">
          <Brain className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">No Course Skills Defined Yet</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
          Course skills allow AI to balance quizzes across core topics and track individual concept mastery.
        </p>
      </div>
    );
  }

  const filteredSkills = profile.skills.filter((skill) => {
    if (filter === "mastered") return skill.status === "Mastered";
    if (filter === "practice") return skill.status === "Needs Practice";
    if (filter === "unassessed") return skill.status === "Unassessed";
    return true;
  });

  return (
    <div className="bg-[#23252E] border border-[#333642] rounded-2xl p-6 lg:p-7 shadow-xl">
      {/* Card Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#333642]">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#E5F842]/15 border border-[#E5F842]/30 flex items-center justify-center text-[#E5F842] shrink-0 shadow-lg shadow-[#E5F842]/5">
            <Brain className="w-7 h-7 text-[#E5F842]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-black uppercase tracking-widest text-[#E5F842]">
                AI Mastery Analytics
              </span>
              <span className="text-xs text-slate-300 font-bold bg-[#18191E] px-2.5 py-0.5 rounded-md border border-[#333642]">
                {profile.course_title}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Curriculum Skill Tree & Mastery
            </h2>
            <p className="text-sm text-slate-300 font-medium mt-1 leading-relaxed">
              Progress calculated across {profile.total_skills} core topics from lecture quizzes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2.5 rounded-xl bg-[#18191E] hover:bg-[#25272F] border border-[#333642] text-slate-400 hover:text-[#E5F842] transition-colors cursor-pointer"
              title="Refresh Mastery Progress"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {/* Big Overall Gauge */}
          <div className="flex items-center gap-4 bg-[#18191E] border border-[#333642] px-6 py-4 rounded-2xl shadow-sm">
            <div className="text-right">
              <span className="block text-xs font-black text-slate-400 uppercase tracking-widest">
                Course Mastery
              </span>
              <span className="text-3xl sm:text-4xl font-black text-[#E5F842]">
                {profile.overall_mastery_percentage}%
              </span>
            </div>
            <div className="w-12 h-12 rounded-full border-3 border-[#333642] flex items-center justify-center relative">
              <div 
                className="absolute inset-0 rounded-full border-3 border-[#E5F842]"
                style={{
                  clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%)`,
                  opacity: profile.overall_mastery_percentage > 0 ? 1 : 0.2
                }}
              />
              <TrendingUp className="w-6 h-6 text-[#E5F842]" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Status Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
        <button
          onClick={() => setFilter(filter === "mastered" ? "all" : "mastered")}
          className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border transition-all text-left cursor-pointer ${
            filter === "mastered"
              ? "bg-emerald-500/15 border-emerald-500/50 shadow-lg shadow-emerald-500/10"
              : "bg-[#18191E] border-[#333642] hover:border-emerald-500/30"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-black text-white block">Mastered Topics</span>
              <span className="text-xs text-slate-400 font-medium">≥ 80% Quiz Accuracy</span>
            </div>
          </div>
          <span className="text-2xl sm:text-3xl font-black text-emerald-400">{profile.mastered_count}</span>
        </button>

        <button
          onClick={() => setFilter(filter === "practice" ? "all" : "practice")}
          className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border transition-all text-left cursor-pointer ${
            filter === "practice"
              ? "bg-amber-500/15 border-amber-500/50 shadow-lg shadow-amber-500/10"
              : "bg-[#18191E] border-[#333642] hover:border-amber-500/30"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-black text-white block">Needs Practice</span>
              <span className="text-xs text-slate-400 font-medium">&lt; 80% Accuracy</span>
            </div>
          </div>
          <span className="text-2xl sm:text-3xl font-black text-amber-400">{profile.needs_practice_count}</span>
        </button>

        <button
          onClick={() => setFilter(filter === "unassessed" ? "all" : "unassessed")}
          className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border transition-all text-left cursor-pointer ${
            filter === "unassessed"
              ? "bg-slate-700/30 border-slate-500 shadow-lg"
              : "bg-[#18191E] border-[#333642] hover:border-slate-500/50"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-black text-white block">Not Attempted</span>
              <span className="text-xs text-slate-400 font-medium">Untested in Quizzes</span>
            </div>
          </div>
          <span className="text-2xl sm:text-3xl font-black text-slate-300">{profile.unassessed_count}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Viewing: {filter.toUpperCase()} ({filteredSkills.length})
          </span>
        </div>
        {filter !== "all" && (
          <button
            onClick={() => setFilter("all")}
            className="text-xs text-[#E5F842] hover:underline cursor-pointer font-black"
          >
            Show All ({profile.skills.length})
          </button>
        )}
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredSkills.map((skill) => {
          const isMastered = skill.status === "Mastered";
          const isPractice = skill.status === "Needs Practice";

          return (
            <div
              key={skill.skill_id}
              className="p-5 sm:p-6 rounded-2xl border transition-all flex flex-col justify-between shadow-md bg-[#1b2320] border-emerald-500/40 hover:border-emerald-500/70"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-xs font-black text-slate-200 uppercase tracking-wider bg-[#23252E] px-3 py-1 rounded-lg border border-[#333642]">
                    {skill.category}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                      isMastered
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : isPractice
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-slate-800 text-slate-300 border border-slate-700"
                    }`}
                  >
                    {isMastered && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {isPractice && <AlertTriangle className="w-3.5 h-3.5" />}
                    {skill.status}
                  </span>
                </div>

                <h4 className="text-base sm:text-lg font-black text-white mb-2 leading-snug tracking-tight">
                  {skill.skill_name}
                </h4>
                <p className="text-sm text-slate-300 font-medium leading-relaxed mb-4">
                  {skill.description}
                </p>
              </div>

              <div>
                {/* Accuracy Pie Chart & Breakdown */}
                <div className="mt-4 pt-4 border-t border-[#333642]/60 flex items-center justify-between gap-4 mb-3.5">
                  <div className="space-y-1 flex-1 min-w-0">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                      Topic Accuracy
                    </span>
                    <div className="text-sm font-bold text-white truncate">
                      {skill.questions_attempted > 0
                        ? `${skill.questions_correct} of ${skill.questions_attempted} correct`
                        : "No questions attempted yet"}
                    </div>
                    <div className="text-xs text-slate-400 font-medium">
                      {skill.questions_attempted > 0
                        ? `${skill.questions_attempted - skill.questions_correct} mistakes to review`
                        : "Hover chart for topic stats"}
                    </div>
                  </div>

                  <HoverableSkillPieChart
                    percentage={skill.mastery_percentage}
                    correct={skill.questions_correct}
                    total={skill.questions_attempted}
                    status={skill.status}
                    size={84}
                    strokeWidth={8}
                  />
                </div>

                {/* Practice CTA for struggling topics */}
                {isPractice && showPracticeAction && (
                  <button
                    onClick={() => navigate("/quiz", { state: { courseId: profile.course_id } })}
                    className="w-full py-2.5 px-4 text-xs font-black uppercase tracking-wider rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Practice Topic in Quiz</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
