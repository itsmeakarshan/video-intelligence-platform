import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import QuizComponent from "../components/quiz/Quiz";
import CourseSelectionScreen, { CourseContextBar } from "../components/common/CourseSelectionScreen";
import { getCourse, type CourseItem } from "../api/api";
import { ArrowLeft, GraduationCap, Sparkles } from "lucide-react";

export default function Quiz() {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(() => {
    if (location.state?.course) return location.state.course;
    return null;
  });

  useEffect(() => {
    if (location.state?.courseId && !selectedCourse) {
      getCourse(location.state.courseId)
        .then((course) => {
          handleSelectCourse(course);
        })
        .catch((err) => console.error("Failed to load initial course:", err));
    }
  }, [location.state?.courseId]);

  function handleSelectCourse(course: CourseItem) {
    setSelectedCourse(course);
  }

  function handleSwitchCourse() {
    setSelectedCourse(null);
  }

  return (
    <div className="min-h-screen bg-[#121316] text-white pb-16">
      <Navbar />

      <main className="w-full px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Header Navigation & Banner (Dark Theme) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#333642]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#25272F] border border-[#333642] text-[#E5F842] flex items-center justify-center shadow-lg shadow-black/40 shrink-0">
              <GraduationCap className="w-7 h-7" />
            </div>

            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  AI Quiz Studio
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E5F842]/15 text-[#E5F842] border border-[#E5F842]/30">
                  <Sparkles className="w-3.5 h-3.5 text-[#E5F842]" />
                  Adaptive Evaluation & Recommendations
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1 font-medium">
                Generate interactive multiple-choice quizzes tailored to your video study set with instant AI explanations and weak-point YouTube recommendations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#25272F] border border-[#333642] text-white font-bold text-sm hover:bg-[#2E313B] hover:border-[#E5F842]/40 transition-all cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-4 h-4 text-slate-400" />
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Workspace Area */}
        <div className="mt-6">
          {!selectedCourse ? (
            <div className="bg-[#25272F] rounded-2xl p-5 sm:p-7 border border-[#333642] shadow-xs">
              <CourseSelectionScreen
                studioTitle="Choose a Course for AI Quiz"
                studioSubtitle="Select an enrolled course below to generate interactive assessment quizzes. Only videos from your chosen course will be tested."
                studioIcon={<GraduationCap className="w-8 h-8 text-[#E5F842]" />}
                actionText="Generate Course Quiz"
                onSelectCourse={handleSelectCourse}
              />
            </div>
          ) : (
            <div className="space-y-6">
              <CourseContextBar
                selectedCourse={selectedCourse}
                onChangeCourse={handleSwitchCourse}
              />

              <QuizComponent course={selectedCourse} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
