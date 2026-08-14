import {
    Box,
    Button,
    CircularProgress,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Typography,
    Card,
    CardContent,
    Radio,
    RadioGroup,
    FormControlLabel,
    Alert,
    Stack,
    Chip
} from "@mui/material";

import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";

import { useEffect, useRef, useState } from "react";

import { generateQuiz } from "../../services/chatService";
import { getVideos, saveQuizAttempt, getLearningPrediction } from "../../api/api";

import VideoSelectionDialog from "../common/VideoSelectionDialog";
import LearningPredictionCard from "./LearningPredictionCard";
import QuizRecommendations from "./QuizRecommendations";

interface QuizQuestion {
    question: string;
    options: string[];
    answer: number;
    explanation: string;
    topic?: string;
}

interface QuizResponse {
    questions: QuizQuestion[];
}

interface PredictionData {
    available: boolean;
    predicted_score?: number | null;
    attempt_count?: number | null;
    target_difficulty?: string | null;
    regression_model?: string | null;
    reason?: string | null;
    message?: string | null;
}

function parseQuizResponse(response: unknown): QuizResponse {
    let quizPayload = response;

    if (
        typeof response === "object" &&
        response !== null &&
        "answer" in response
    ) {
        quizPayload = (response as { answer: unknown }).answer;
    }

    if (typeof quizPayload === "string") {
        const json = quizPayload
            .trim()
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/, "");

        quizPayload = JSON.parse(json);
    }

    let questionsArray: any[] = [];

    if (Array.isArray(quizPayload)) {
        questionsArray = quizPayload;
    } else if (
        typeof quizPayload === "object" &&
        quizPayload !== null &&
        "questions" in quizPayload &&
        Array.isArray((quizPayload as any).questions)
    ) {
        questionsArray = (quizPayload as any).questions;
    } else {
        throw new Error("The quiz response did not include a valid questions list.");
    }

    if (!questionsArray || questionsArray.length === 0) {
        throw new Error("The quiz response contained zero questions.");
    }

    const validatedQuestions: QuizQuestion[] = questionsArray.map((question: any, index: number) => {
        const qText = typeof question.question === "string" ? question.question : "";
        const options = Array.isArray(question.options) ? question.options : [];
        const rawAns = question.answer !== undefined ? question.answer : question.correct_answer;
        const ansIndex = typeof rawAns === "number" ? rawAns : Number(rawAns);
        const explanation = typeof question.explanation === "string" ? question.explanation : "";
        const topic = typeof question.topic === "string" ? question.topic : "General Concept";

        if (
            !qText ||
            options.length !== 4 ||
            !options.every((opt: any) => typeof opt === "string") ||
            !Number.isInteger(ansIndex) ||
            ansIndex < 0 ||
            ansIndex > 3
        ) {
            throw new Error(`Question ${index + 1} has an invalid format.`);
        }

        return {
            question: qText,
            options,
            answer: ansIndex,
            explanation,
            topic
        };
    });

    return { questions: validatedQuestions };
}

export default function Quiz() {
    const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
    const [showAnswer, setShowAnswer] = useState<Record<number, boolean>>({});

    const [loading, setLoading] = useState(false);
    const [quizError, setQuizError] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);

    const [difficulty, setDifficulty] = useState("Medium");
    const [questions, setQuestions] = useState(10);

    const [hasVideos, setHasVideos] = useState(true);
    const [attemptVideoIds, setAttemptVideoIds] = useState<number[]>([]);
    const [attemptSaved, setAttemptSaved] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [finalScore, setFinalScore] = useState<number | null>(null);
    const [submittedPrediction, setSubmittedPrediction] = useState<PredictionData | null>(null);
    const [lastAttemptId, setLastAttemptId] = useState<number | null>(null);

    const submissionInFlight = useRef(false);
    const resultRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        checkVideos();
    }, []);

    async function checkVideos() {
        try {
            const videos = await getVideos();
            const completed = videos.filter(
                (video: any) => video.status === "completed"
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
            setSubmittedPrediction(null);
            setLastAttemptId(null);
            submissionInFlight.current = false;
        } catch (error) {
            console.error("Unable to generate quiz:", error);
            setQuiz([]);
            setQuizError(
                "The quiz could not be displayed because the generated response was not valid quiz JSON. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }

    function checkAnswer(index: number) {
        if (attemptSaved) return;
        setShowAnswer(prev => ({ ...prev, [index]: true }));
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
            const attemptData = await saveQuizAttempt(score, quiz.length, difficulty, attemptVideoIds, questionsData);
            setFinalScore(score);
            if (attemptData?.id) {
                setLastAttemptId(attemptData.id);
            }

            let pred = attemptData?.prediction;
            if (!pred) {
                try {
                    const reg = await getLearningPrediction(difficulty);
                    pred = {
                        available: reg.has_sufficient_history,
                        predicted_score: reg.predicted_percentage,
                        attempt_count: reg.attempt_count,
                        target_difficulty: difficulty,
                        message: reg.message
                    };
                } catch {
                    pred = { available: false, message: "Complete another quiz to unlock your personalized prediction." };
                }
            }
            setSubmittedPrediction(pred);
            setAttemptSaved(true);

            setTimeout(() => {
                resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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

    const selectSx = {
        color: "#F8FAFC",
        bgcolor: "rgba(15, 23, 42, 0.85)",
        borderRadius: 2,
        "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(20, 184, 166, 0.45)"
        },
        "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#14b8a6"
        },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#38bdf8"
        },
        "& .MuiSvgIcon-root": {
            color: "#14b8a6"
        }
    };

    const labelSx = {
        color: "#38bdf8 !important",
        fontWeight: 700,
        bgcolor: "rgba(4, 47, 46, 0.96)",
        px: 0.8,
        borderRadius: 1
    };

    const menuItemSx = {
        color: "#F8FAFC",
        bgcolor: "#0f172a",
        fontWeight: 600,
        "&:hover": { bgcolor: "rgba(20, 184, 166, 0.2)", color: "#14b8a6" },
        "&.Mui-selected": { bgcolor: "rgba(20, 184, 166, 0.3)", color: "#14b8a6", fontWeight: 700 }
    };

    const extraContent = (
        <Box sx={{ display: "flex", gap: 2 }}>
            <FormControl fullWidth>
                <InputLabel sx={labelSx}>Difficulty</InputLabel>
                <Select
                    value={difficulty}
                    label="Difficulty"
                    onChange={(e) => setDifficulty(e.target.value)}
                    sx={selectSx}
                    MenuProps={{
                        PaperProps: {
                            sx: {
                                bgcolor: "#0f172a",
                                border: "1px solid rgba(20, 184, 166, 0.4)",
                                boxShadow: "0 10px 30px rgba(0,0,0,0.7)"
                            }
                        }
                    }}
                >
                    <MenuItem value="Easy" sx={menuItemSx}>Easy</MenuItem>
                    <MenuItem value="Medium" sx={menuItemSx}>Medium</MenuItem>
                    <MenuItem value="Hard" sx={menuItemSx}>Hard</MenuItem>
                </Select>
            </FormControl>

            <FormControl fullWidth>
                <InputLabel sx={labelSx}>Questions</InputLabel>
                <Select
                    value={questions}
                    label="Questions"
                    onChange={(e) => setQuestions(Number(e.target.value))}
                    sx={selectSx}
                    MenuProps={{
                        PaperProps: {
                            sx: {
                                bgcolor: "#0f172a",
                                border: "1px solid rgba(20, 184, 166, 0.4)",
                                boxShadow: "0 10px 30px rgba(0,0,0,0.7)"
                            }
                        }
                    }}
                >
                    <MenuItem value={5} sx={menuItemSx}>5 Questions</MenuItem>
                    <MenuItem value={10} sx={menuItemSx}>10 Questions</MenuItem>
                    <MenuItem value={15} sx={menuItemSx}>15 Questions</MenuItem>
                    <MenuItem value={20} sx={menuItemSx}>20 Questions</MenuItem>
                </Select>
            </FormControl>
        </Box>
    );

    return (
        <>
            <Box>
                <LearningPredictionCard difficulty={difficulty} refreshKey={attemptSaved ? 1 : 0} />

                {hasVideos ? (
                    <Button
                        variant="contained"
                        onClick={openDialog}
                        disabled={loading}
                        sx={{
                            bgcolor: "#14B8A6",
                            color: "#021617",
                            fontWeight: 700,
                            borderRadius: 2,
                            px: 4,
                            "&:hover": {
                                bgcolor: "#10B981"
                            }
                        }}
                    >
                        {loading ? (
                            <CircularProgress size={22} color="inherit" />
                        ) : (
                            "Generate Quiz"
                        )}
                    </Button>
                ) : (
                    <Typography sx={{ color: "#14B8A6" }}>
                        Please upload and process a video first.
                    </Typography>
                )}

                {quizError && (
                    <Alert severity="error" sx={{ mt: 3 }}>
                        {quizError}
                    </Alert>
                )}

                {quiz.length > 0 && (
                    <Stack spacing={3} sx={{ mt: 4 }}>
                        {quiz.map((q, index) => {
                            const selected = selectedAnswers[index];
                            const checked = showAnswer[index];
                            const correct = selected === q.answer;

                            return (
                                <Card
                                    key={index}
                                    sx={{
                                        bgcolor: "#071827",
                                        borderRadius: 2,
                                        border: "1px solid rgba(20,184,166,.15)"
                                    }}
                                >
                                    <CardContent>
                                        <Typography
                                            variant="h6"
                                            sx={{
                                                color: "#14B8A6",
                                                fontWeight: 700,
                                                mb: 2
                                            }}
                                        >
                                            Question {index + 1}
                                        </Typography>

                                        <Typography
                                            sx={{
                                                color: "#F8FAFC",
                                                mb: 3,
                                                fontWeight: 600
                                            }}
                                        >
                                            {q.question}
                                        </Typography>

                                        <RadioGroup
                                            value={selected ?? -1}
                                            onChange={(e) =>
                                                setSelectedAnswers(prev => ({
                                                    ...prev,
                                                    [index]: Number(e.target.value)
                                                }))
                                            }
                                        >
                                            {q.options.map((option, optionIndex) => {
                                                const isCorrectOption = attemptSaved && optionIndex === q.answer;
                                                const isWrongSelected = attemptSaved && optionIndex === selected && !correct;

                                                return (
                                                    <FormControlLabel
                                                        key={optionIndex}
                                                        value={optionIndex}
                                                        control={
                                                            <Radio
                                                                sx={{
                                                                    color: "rgba(20, 184, 166, 0.6)",
                                                                    "&.Mui-checked": {
                                                                        color: isCorrectOption ? "#10b981" : isWrongSelected ? "#ef4444" : "#14b8a6"
                                                                    },
                                                                    "&.Mui-disabled": {
                                                                        color: isCorrectOption ? "#10b981 !important" : isWrongSelected ? "#ef4444 !important" : "rgba(255, 255, 255, 0.4) !important"
                                                                    }
                                                                }}
                                                            />
                                                        }
                                                        disabled={attemptSaved}
                                                        label={
                                                            <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                                                                <Typography
                                                                    sx={{
                                                                        color: isCorrectOption
                                                                            ? "#10b981 !important"
                                                                            : isWrongSelected
                                                                            ? "#f87171 !important"
                                                                            : "#F8FAFC !important",
                                                                        fontWeight: isCorrectOption || isWrongSelected ? 700 : 500,
                                                                        fontSize: "0.95rem"
                                                                    }}
                                                                >
                                                                    {option}
                                                                </Typography>
                                                                {isCorrectOption && (
                                                                    <Chip label="Correct Answer" size="small" sx={{ bgcolor: "rgba(16, 185, 129, 0.2)", color: "#10b981", fontWeight: 700, height: 20, fontSize: 11 }} />
                                                                )}
                                                                {isWrongSelected && (
                                                                    <Chip label="Your Selection" size="small" sx={{ bgcolor: "rgba(239, 68, 68, 0.2)", color: "#f87171", fontWeight: 700, height: 20, fontSize: 11 }} />
                                                                )}
                                                            </Box>
                                                        }
                                                        sx={{
                                                            color: "#F8FAFC",
                                                            my: 0.5,
                                                            p: 0.8,
                                                            borderRadius: 2,
                                                            bgcolor: isCorrectOption
                                                                ? "rgba(16, 185, 129, 0.1)"
                                                                : isWrongSelected
                                                                ? "rgba(239, 68, 68, 0.1)"
                                                                : "transparent",
                                                            border: isCorrectOption
                                                                ? "1px solid rgba(16, 185, 129, 0.4)"
                                                                : isWrongSelected
                                                                ? "1px solid rgba(239, 68, 68, 0.4)"
                                                                : "1px solid transparent",
                                                            "&.Mui-disabled": {
                                                                color: "#F8FAFC !important"
                                                            }
                                                        }}
                                                    />
                                                );
                                            })}
                                        </RadioGroup>

                                        <Button
                                            variant="contained"
                                            disabled={selected === undefined || attemptSaved}
                                            onClick={() => checkAnswer(index)}
                                            sx={{
                                                mt: 2,
                                                bgcolor: "#14B8A6",
                                                "&:hover": { bgcolor: "#10B981" }
                                            }}
                                        >
                                            Check Answer
                                        </Button>

                                        {checked && (
                                            <Alert
                                                severity={correct ? "success" : "error"}
                                                sx={{ mt: 3 }}
                                            >
                                                <Typography fontWeight={700}>
                                                    {correct ? "Correct!" : "Incorrect"}
                                                </Typography>
                                                {!correct && (
                                                    <Typography sx={{ mt: 1 }}>
                                                        Correct Answer:{" "}
                                                        <strong>{q.options[q.answer]}</strong>
                                                    </Typography>
                                                )}
                                                <Typography sx={{ mt: 2 }}>
                                                    {q.explanation}
                                                </Typography>
                                            </Alert>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}

                        {submitError && (
                            <Alert severity="warning">
                                {submitError}
                            </Alert>
                        )}

                        {attemptSaved && finalScore !== null ? (
                            <Box ref={resultRef} sx={{ alignSelf: "center", width: "100%", maxWidth: 850 }}>
                                <Card
                                    sx={{
                                        borderRadius: 3,
                                        bgcolor: "rgba(15, 23, 42, 0.95)",
                                        border: "1px solid rgba(20, 184, 166, 0.4)",
                                        boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                                        p: 3,
                                        mb: 3
                                    }}
                                >
                                    <Box sx={{ textAlign: "center", mb: 3 }}>
                                        <Typography sx={{ fontSize: 28, mb: 1 }}>
                                            🎉 Quiz Complete!
                                        </Typography>
                                        <Typography sx={{ color: "#94a3b8", fontSize: 14 }}>
                                            Difficulty: <strong>{difficulty}</strong>
                                        </Typography>
                                        <Typography sx={{ color: "#14B8A6", fontWeight: 800, fontSize: 36, my: 1 }}>
                                            {Math.round((finalScore / quiz.length) * 100)}%
                                        </Typography>
                                        <Typography sx={{ color: "#F8FAFC", fontWeight: 600, fontSize: 16 }}>
                                            Score: {finalScore} / {quiz.length} Correct
                                        </Typography>
                                    </Box>

                                    <Box
                                        sx={{
                                            mt: 3,
                                            pt: 3,
                                            borderTop: "1px solid rgba(255, 255, 255, 0.1)"
                                        }}
                                    >
                                        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                                            <Box
                                                sx={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: 2,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    bgcolor: "rgba(20, 184, 166, 0.15)"
                                                }}
                                            >
                                                <AutoGraphRoundedIcon sx={{ color: "#14b8a6", fontSize: 20 }} />
                                            </Box>
                                            <Typography sx={{ color: "#F8FAFC", fontWeight: 700, fontSize: 16 }}>
                                                YOUR NEXT QUIZ FORECAST
                                            </Typography>
                                        </Stack>

                                        {submittedPrediction && submittedPrediction.available ? (
                                            <Box>
                                                <Stack direction={{ xs: "column", sm: "row" }} alignItems="baseline" justifyContent="space-between" sx={{ mb: 2 }}>
                                                    <Box>
                                                        <Typography sx={{ color: "#94a3b8", fontSize: 12 }}>
                                                            Predicted Next Score
                                                        </Typography>
                                                        <Typography sx={{ color: "#14B8A6", fontWeight: 800, fontSize: 28 }}>
                                                            {submittedPrediction.predicted_score}%
                                                        </Typography>
                                                    </Box>
                                                </Stack>

                                                <Typography sx={{ color: "#94a3b8", fontSize: 12, fontStyle: "italic", mt: 1 }}>
                                                    Your prediction is based on your recent quiz performance, score trend, attempt history, and quiz difficulty.
                                                </Typography>
                                            </Box>
                                        ) : (
                                            <Alert severity="info" sx={{ bgcolor: "rgba(14, 165, 233, 0.1)", color: "#38bdf8" }}>
                                                {submittedPrediction?.message || "Complete another quiz to unlock your personalized prediction."}
                                            </Alert>
                                        )}
                                    </Box>
                                </Card>

                                <QuizRecommendations attemptId={lastAttemptId} />
                            </Box>
                        ) : (
                            <Button
                                variant="contained"
                                onClick={submitQuiz}
                                disabled={submitting}
                                sx={{
                                    alignSelf: "center",
                                    bgcolor: "#14B8A6",
                                    "&:hover": { bgcolor: "#10B981" }
                                }}
                            >
                                {submitting ? "Submitting..." : "Submit Quiz"}
                            </Button>
                        )}
                    </Stack>
                )}

                {quiz.length > 0 && (
                    <Button
                        startIcon={<RestartAltRoundedIcon />}
                        variant="outlined"
                        onClick={openDialog}
                        sx={{
                            mt: 3,
                            borderRadius: 2,
                            borderColor: "#14B8A6",
                            color: "#14B8A6"
                        }}
                    >
                        Generate Again
                    </Button>
                )}
            </Box>

            <VideoSelectionDialog
                open={dialogOpen}
                title="Generate AI Quiz"
                buttonText="Generate Quiz"
                loading={loading}
                onClose={() => setDialogOpen(false)}
                onConfirm={generateQuizHandler}
                extraContent={extraContent}
            />
        </>
    );
}
