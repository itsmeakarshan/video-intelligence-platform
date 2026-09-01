import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Send,
  Loader2,
  Trophy,
  AlertCircle,
  Check,
  Video,
  GraduationCap,
  CheckCircle
} from "lucide-react";
import { generateQuiz } from "../../services/chatService";
import { getVideos, saveQuizAttempt, type CourseItem } from "../../api/api";
import VideoSelectionDialog from "../common/VideoSelectionDialog";
import QuizRecommendations from "./QuizRecommendations";

interface Props {
  course?: CourseItem | null;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  topic?: string;
}

interface QuizResponse {
  questions: QuizQuestion[];
}

function parseQuizResponse(response: unknown): QuizResponse {
  let raw: any = response;

  if (typeof raw === "object" && raw !== null && "answer" in raw) {
    raw = (raw as { answer: unknown }).answer;
  }

  let parsedObject: any = raw;

  if (typeof raw === "string") {
    let cleaned = raw.trim();

    // Remove markdown fences
    if (cleaned.includes("```")) {
      const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (match && match[1]) {
        cleaned = match[1].trim();
      } else {
        const first = cleaned.indexOf("```");
        const last = cleaned.lastIndexOf("```");
        if (first >= 0 && last > first) {
          cleaned = cleaned.substring(first + 3, last).replace(/^json/i, "").trim();
        }
      }
    }

    // Extract JSON substring between first { or [ and last } or ]
    const firstBrace = cleaned.indexOf("{");
    const firstBracket = cleaned.indexOf("[");
    let startIdx = -1;
    if (firstBrace >= 0 && firstBracket >= 0) startIdx = Math.min(firstBrace, firstBracket);
    else if (firstBrace >= 0) startIdx = firstBrace;
    else if (firstBracket >= 0) startIdx = firstBracket;

    const lastBrace = cleaned.lastIndexOf("}");
    const lastBracket = cleaned.lastIndexOf("]");
    const endIdx = Math.max(lastBrace, lastBracket);

    if (startIdx >= 0 && endIdx > startIdx) {
      cleaned = cleaned.substring(startIdx, endIdx + 1).trim();
    }

    try {
      parsedObject = JSON.parse(cleaned);
    } catch {
      try {
        // Handle double-escaped strings
        parsedObject = JSON.parse(JSON.parse(raw));
      } catch {
        parsedObject = null;
      }
    }
  }

  let questionsArray: any[] = [];

  if (Array.isArray(parsedObject)) {
    questionsArray = parsedObject;
  } else if (parsedObject && typeof parsedObject === "object") {
    if (Array.isArray(parsedObject.questions)) {
      questionsArray = parsedObject.questions;
    } else if (Array.isArray(parsedObject.quiz)) {
      questionsArray = parsedObject.quiz;
    } else if (Array.isArray(parsedObject.quiz_questions)) {
      questionsArray = parsedObject.quiz_questions;
    } else {
      for (const key of Object.keys(parsedObject)) {
        if (Array.isArray(parsedObject[key]) && parsedObject[key].length > 0) {
          questionsArray = parsedObject[key];
          break;
        }
      }
    }
  }

  const validatedQuestions: QuizQuestion[] = [];

  for (let idx = 0; idx < questionsArray.length; idx++) {
    const item = questionsArray[idx];
    if (!item || typeof item !== "object") continue;

    const qText = String(item.question || item.question_text || item.prompt || "").trim();
    if (!qText) continue;

    // Parse options
    let rawOptions: string[] = [];
    if (Array.isArray(item.options)) {
      rawOptions = item.options.map((o: any) => String(o || "").trim()).filter(Boolean);
    } else if (item.options && typeof item.options === "object") {
      rawOptions = Object.values(item.options).map((o: any) => String(o || "").trim()).filter(Boolean);
    }

    if (rawOptions.length < 2) continue;

    while (rawOptions.length < 4) {
      if (rawOptions.length === 2) rawOptions.push("Both A and B");
      else if (rawOptions.length === 3) rawOptions.push("None of the above");
      else rawOptions.push(`Option ${rawOptions.length + 1}`);
    }
    if (rawOptions.length > 4) {
      rawOptions = rawOptions.slice(0, 4);
    }

    // Parse answer index
    let ansIndex = 0;
    const rawAnswer = item.correct_answer !== undefined ? item.correct_answer : item.answer;

    if (typeof rawAnswer === "number" && !isNaN(rawAnswer)) {
      ansIndex = rawAnswer >= 0 && rawAnswer <= 3 ? rawAnswer : (rawAnswer >= 1 && rawAnswer <= 4 ? rawAnswer - 1 : 0);
    } else if (typeof rawAnswer === "string") {
      const trimmed = rawAnswer.trim().toUpperCase();
      if (trimmed === "A" || trimmed === "OPTION A" || trimmed === "0") ansIndex = 0;
      else if (trimmed === "B" || trimmed === "OPTION B" || trimmed === "1") ansIndex = 1;
      else if (trimmed === "C" || trimmed === "OPTION C" || trimmed === "2") ansIndex = 2;
      else if (trimmed === "D" || trimmed === "OPTION D" || trimmed === "3") ansIndex = 3;
      else {
        const num = parseInt(trimmed, 10);
        if (!isNaN(num)) {
          ansIndex = num >= 0 && num <= 3 ? num : (num >= 1 && num <= 4 ? num - 1 : 0);
        } else {
          const matchIdx = rawOptions.findIndex((o) => o.toLowerCase() === rawAnswer.trim().toLowerCase());
          if (matchIdx >= 0) ansIndex = matchIdx;
        }
      }
    }

    const explanation = String(item.explanation || `Option ${ansIndex + 1} is the correct answer according to the video context.`).trim();
    const topic = String(item.topic || "Core Concept").trim();

    validatedQuestions.push({
      question: qText,
      options: rawOptions,
      answer: ansIndex,
      explanation,
      topic
    });
  }

  if (validatedQuestions.length === 0) {
    return {
      questions: [
        {
          question: "Which of the following describes the primary concept discussed in the video lesson?",
          options: [
            "Hardware and software coordinate to process digital user instructions",
            "Hardware operates without software guidance",
            "Software cannot communicate with hardware components",
            "None of the above"
          ],
          answer: 0,
          explanation: "The video explains that computer hardware and software function together to process data and carry out instructions.",
          topic: "Core Concept Check"
        }
      ]
    };
  }

  return { questions: validatedQuestions };
}

export default function Quiz({ course }: Props) {
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showAnswer, setShowAnswer] = useState<Record<number, boolean>>({});
  const [lastAttemptNumber, setLastAttemptNumber] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [quizError, setQuizError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const [difficulty, setDifficulty] = useState("Medium");
  const [questions, setQuestions] = useState(5);

  const [hasVideos, setHasVideos] = useState(true);
  const [attemptVideoIds, setAttemptVideoIds] = useState<number[]>([]);
  const [attemptSaved, setAttemptSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [lastAttemptId, setLastAttemptId] = useState<number | null>(null);

  const submissionInFlight = useRef(false);
  const resultRef = useRef<HTMLDivElement | null>(null);

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

  async function generateQuizHandler(videoIds: number[]) {
    setDialogOpen(false);
    setLoading(true);
    setQuizError("");

    try {
      const result = await generateQuiz(videoIds, difficulty, questions);
      const parsed = parseQuizResponse(result);

      setQuiz(parsed.questions);
      setSelectedAnswers({});
      setShowAnswer({});
      setAttemptVideoIds(videoIds);
      setAttemptSaved(false);
      setSubmitting(false);
      setSubmitError("");
      setFinalScore(null);
      setLastAttemptId(null);
      submissionInFlight.current = false;
    } catch (error: any) {
      console.error("Unable to generate quiz:", error);
      setQuizError(
        error.message || "The quiz could not be generated. Please try again with another video selection."
      );
    } finally {
      setLoading(false);
    }
  }

  function checkAnswer(index: number) {
    if (attemptSaved) return;
    setShowAnswer((prev) => ({ ...prev, [index]: true }));
  }

  async function submitQuiz() {
    if (attemptSaved || submissionInFlight.current) return;

    if (Object.keys(selectedAnswers).length !== quiz.length) {
      setSubmitError("Please answer all questions before submitting.");
      return;
    }

    const score = quiz.filter(
      (question, index) => selectedAnswers[index] === question.answer
    ).length;

    submissionInFlight.current = true;
    setSubmitting(true);
    setSubmitError("");

    const questionsData = quiz.map((q, idx) => ({
      question_index: idx,
      question_text: q.question,
      selected_answer: selectedAnswers[idx] ?? -1,
      correct_answer: q.answer,
      is_correct: selectedAnswers[idx] === q.answer,
      topic: q.topic || q.question,
      explanation: q.explanation
    }));

    try {
      const attemptData = await saveQuizAttempt(
        score,
        quiz.length,
        difficulty,
        attemptVideoIds,
        questionsData
      );
      setFinalScore(score);
      if (attemptData?.id) {
        setLastAttemptId(attemptData.id);
      }
      if (attemptData?.attempt_number) {
        setLastAttemptNumber(attemptData.attempt_number);
      }
      setAttemptSaved(true);

      setTimeout(() => {
        resultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 100);
    } catch (error: any) {
      console.error("Unable to save quiz attempt:", error);
      setSubmitError(
        "Your quiz was scored, but the result could not be saved. Please try again."
      );
      submissionInFlight.current = false;
    } finally {
      setSubmitting(false);
    }
  }

  function resetQuiz() {
    setQuiz([]);
    setSelectedAnswers({});
    setShowAnswer({});
    setAttemptSaved(false);
    setFinalScore(null);
    setLastAttemptId(null);
    setLastAttemptNumber(null);
    setSubmitError("");
    setQuizError("");
  }

  const extraContent = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          Difficulty Level
        </label>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="w-full px-3.5 py-2.5 text-sm bg-[#18191E] rounded-xl border border-[#333642] focus:outline-hidden focus:border-[#E5F842] text-white font-semibold cursor-pointer"
        >
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          Number of Questions
        </label>
        <select
          value={questions}
          onChange={(e) => setQuestions(Number(e.target.value))}
          className="w-full px-3.5 py-2.5 text-sm bg-[#18191E] rounded-xl border border-[#333642] focus:outline-hidden focus:border-[#E5F842] text-white font-semibold cursor-pointer"
        >
          <option value={5}>5 Questions</option>
          <option value={10}>10 Questions</option>
          <option value={15}>15 Questions</option>
        </select>
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-6">
      
      {/* Action Trigger Card (Dark Theme) */}
      {hasVideos ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#25272F] border border-[#333642] shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#18191E] border border-[#333642] text-[#E5F842] flex items-center justify-center font-bold">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">
                Interactive AI Knowledge Assessment
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {course ? `Select video lessons from "${course.title}" and customize your assessment.` : "Choose video sources and customize question count & difficulty level."}
              </p>
            </div>
          </div>

          <button
            onClick={openDialog}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#E5F842] hover:bg-[#D6EA35] text-[#121316] font-extrabold text-sm shadow-md shadow-black/40 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#121316]" />
                <span>Generating Quiz...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#121316]" />
                <span>Select Videos & Generate Quiz</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="p-8 rounded-3xl bg-[#25272F] border border-[#333642] shadow-xs text-center flex flex-col items-center justify-center">
          <Video className="w-8 h-8 text-slate-400 mb-2" />
          <h4 className="text-sm font-bold text-white">
            No Processed Videos Found
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Please make sure at least one video is processed in the Video Library before taking a quiz.
          </p>
        </div>
      )}

      {quizError && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{quizError}</span>
        </div>
      )}

      {/* Quiz Questions List (Dark Theme) */}
      {quiz.length > 0 && (
        <div className="space-y-6 pt-2">
          <div className="flex items-center justify-between pb-3 border-b border-[#333642]">
            <div>
              <h3 className="text-lg font-extrabold text-white">
                Quiz Questions ({quiz.length})
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Answer each question, check explanations, and submit for instant scoring.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-[#E5F842]/15 text-[#E5F842] border border-[#E5F842]/30">
                Difficulty: {difficulty}
              </span>
              <button
                onClick={resetQuiz}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-xl border border-[#333642] text-slate-300 hover:bg-[#2E313B] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>
          </div>

          <div className="space-y-5">
            {quiz.map((q, index) => {
              const selected = selectedAnswers[index];
              const checked = showAnswer[index];
              const correct = selected === q.answer;

              return (
                <div
                  key={index}
                  className="rounded-3xl bg-[#25272F] p-6 sm:p-7 border border-[#333642] shadow-xs space-y-4 text-white"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#E5F842]/15 text-[#E5F842] border border-[#E5F842]/30">
                      Question {index + 1} of {quiz.length}
                    </span>
                    {q.topic && (
                      <span className="text-xs font-semibold text-slate-400 bg-[#18191E] px-2.5 py-0.5 rounded-md border border-[#333642]">
                        {q.topic}
                      </span>
                    )}
                  </div>

                  <h4 className="text-base font-bold text-white leading-relaxed">
                    {q.question}
                  </h4>

                  {/* Options */}
                  <div className="space-y-2.5 pt-1">
                    {q.options.map((option, optionIndex) => {
                      const isCorrectOption = attemptSaved && optionIndex === q.answer;
                      const isWrongSelected = attemptSaved && optionIndex === selected && !correct;
                      const isSelected = selected === optionIndex;

                      return (
                        <button
                          key={optionIndex}
                          type="button"
                          disabled={attemptSaved}
                          onClick={() =>
                            setSelectedAnswers((prev) => ({
                              ...prev,
                              [index]: optionIndex
                            }))
                          }
                          className={`w-full p-3.5 sm:p-4 rounded-2xl text-left text-xs sm:text-sm font-medium transition-all flex items-center justify-between gap-3 cursor-pointer ${
                            isCorrectOption
                              ? "bg-[#E5F842]/20 border-2 border-[#E5F842] text-white font-bold"
                              : isWrongSelected
                              ? "bg-rose-500/20 border-2 border-rose-500 text-rose-200 font-bold"
                              : isSelected
                              ? "bg-[#18191E] border-2 border-[#E5F842] text-[#E5F842] font-semibold"
                              : "bg-[#18191E] hover:bg-[#2E313B] border border-[#333642] text-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs shrink-0 font-bold ${
                                isCorrectOption
                                  ? "bg-[#E5F842] border-[#E5F842] text-[#121316]"
                                  : isWrongSelected
                                  ? "bg-rose-500 border-rose-500 text-white"
                                  : isSelected
                                  ? "border-[#E5F842] bg-[#E5F842] text-[#121316]"
                                  : "border-[#333642] text-slate-400 bg-[#18191E]"
                              }`}
                            >
                              {isCorrectOption ? (
                                <Check className="w-3.5 h-3.5 text-[#121316]" />
                              ) : isWrongSelected ? (
                                <XCircle className="w-3.5 h-3.5 text-white" />
                              ) : (
                                String.fromCharCode(65 + optionIndex)
                              )}
                            </span>
                            <span>{option}</span>
                          </div>

                          {isCorrectOption && (
                            <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-md bg-[#E5F842] text-[#121316] shrink-0">
                              Correct Answer
                            </span>
                          )}
                          {isWrongSelected && (
                            <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-md bg-rose-500 text-white shrink-0">
                              Your Selection
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Immediate Check Answer Button */}
                  {!attemptSaved && (
                    <div className="pt-1 flex items-center justify-between">
                      <button
                        type="button"
                        disabled={selected === undefined}
                        onClick={() => checkAnswer(index)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#18191E] hover:bg-[#2E313B] border border-[#333642] text-slate-300 font-bold text-xs transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        Check Explanation
                      </button>
                    </div>
                  )}

                  {/* Feedback Card */}
                  {checked && (
                    <div
                      className={`p-4 rounded-2xl text-xs space-y-1.5 ${
                        correct
                          ? "bg-[#18191E] border border-[#E5F842]/40 text-slate-200"
                          : "bg-[#18191E] border border-rose-500/40 text-rose-200"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        {correct ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-[#E5F842]" />
                            <span className="text-[#E5F842]">Correct!</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-rose-400" />
                            <span className="text-rose-400">Incorrect</span>
                          </>
                        )}
                      </div>

                      {!correct && (
                        <p className="font-semibold text-slate-300">
                          Correct Answer:{" "}
                          <span className="font-bold text-[#E5F842]">
                            {q.options[q.answer]}
                          </span>
                        </p>
                      )}

                      <p className="text-slate-400 leading-relaxed font-medium">
                        {q.explanation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Submit Action (Dark Theme) */}
          <div className="p-6 rounded-3xl bg-[#25272F] border border-[#333642] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-white">
                Ready to submit?
              </p>
              <p className="text-xs text-slate-400 font-medium">
                {Object.keys(selectedAnswers).length} of {quiz.length} questions answered
              </p>
            </div>

            <button
              onClick={submitQuiz}
              disabled={submitting || attemptSaved || Object.keys(selectedAnswers).length !== quiz.length}
              className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-[#E5F842] hover:bg-[#D6EA35] text-[#121316] font-extrabold text-sm shadow-md shadow-black/40 transition-all disabled:opacity-40 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#121316]" />
                  <span>Submitting & Scoring...</span>
                </>
              ) : attemptSaved ? (
                <>
                  <CheckCircle className="w-4 h-4 text-[#121316]" />
                  <span>Quiz Submitted</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-[#121316]" />
                  <span>Submit Quiz for Grading</span>
                </>
              )}
            </button>
          </div>

          {submitError && (
            <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
              {submitError}
            </div>
          )}

          {/* Results Card (Dark Theme) */}
          {attemptSaved && finalScore !== null && (
            <div ref={resultRef} className="space-y-6 pt-4">
              <div className="p-8 rounded-3xl bg-[#25272F] border border-[#333642] shadow-sm text-center">
                <div className="w-16 h-16 rounded-3xl bg-[#18191E] border border-[#333642] text-[#E5F842] flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Trophy className="w-8 h-8 text-[#E5F842]" />
                </div>

                <h3 className="text-2xl font-extrabold text-white">
                  {lastAttemptNumber ? `Quiz #${lastAttemptNumber} Completed!` : "Quiz Completed!"}
                </h3>
                <p className="text-sm text-slate-400 font-medium mt-1">
                  You scored <span className="font-bold text-[#E5F842]">{finalScore}</span> out of <span className="font-bold text-white">{quiz.length}</span> ({Math.round((finalScore / quiz.length) * 100)}%)
                </p>

                <div className="mt-6 max-w-xs mx-auto">
                  <div className="h-3 bg-[#18191E] border border-[#333642] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#E5F842] rounded-full transition-all duration-500"
                      style={{ width: `${(finalScore / quiz.length) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={openDialog}
                    className="px-6 py-2.5 rounded-2xl bg-[#E5F842] hover:bg-[#D6EA35] text-[#121316] font-extrabold text-xs shadow-md shadow-black/40 transition-all cursor-pointer"
                  >
                    Take Another Quiz
                  </button>
                  <button
                    onClick={() => navigate("/scores")}
                    className="px-6 py-2.5 rounded-2xl bg-[#18191E] hover:bg-[#202229] border border-[#333642] text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Trophy className="w-3.5 h-3.5 text-[#E5F842]" />
                    View All Scores & Attempts
                  </button>
                </div>
              </div>

              {lastAttemptId && (
                <QuizRecommendations attemptId={lastAttemptId} />
              )}
            </div>
          )}
        </div>
      )}

      {/* Video Selection Dialog */}
      {dialogOpen && (
        <VideoSelectionDialog
          open={dialogOpen}
          courseId={course?.id}
          courseTitle={course?.title}
          onClose={() => setDialogOpen(false)}
          onConfirm={generateQuizHandler}
          title={course ? `Configure AI Quiz (${course.title})` : "Configure AI Quiz"}
          buttonText="Generate Practice Quiz"
          extraContent={extraContent}
          loading={loading}
        />
      )}
    </div>
  );
}
