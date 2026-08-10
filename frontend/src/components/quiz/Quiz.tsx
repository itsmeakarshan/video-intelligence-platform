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
    Stack
} from "@mui/material";

import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";

import { useEffect, useRef, useState } from "react";

import { generateQuiz } from "../../services/chatService";
import { getVideos, saveQuizAttempt } from "../../api/api";

import VideoSelectionDialog from "../common/VideoSelectionDialog";

interface QuizQuestion {

    question: string;

    options: string[];

    answer: number;

    explanation: string;

}

interface QuizResponse {

    questions: QuizQuestion[];

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

    if (
        typeof quizPayload !== "object" ||
        quizPayload === null ||
        !Array.isArray((quizPayload as QuizResponse).questions)
    ) {
        throw new Error("The quiz response did not include questions.");
    }

    const parsedQuiz = quizPayload as QuizResponse;

    parsedQuiz.questions.forEach((question, index) => {
        if (
            typeof question.question !== "string" ||
            !Array.isArray(question.options) ||
            question.options.length !== 4 ||
            !question.options.every(option => typeof option === "string") ||
            !Number.isInteger(question.answer) ||
            question.answer < 0 ||
            question.answer > 3 ||
            typeof question.explanation !== "string"
        ) {
            throw new Error(`Question ${index + 1} has an invalid format.`);
        }
    });

    return parsedQuiz;
}

export default function Quiz() {

    const [quiz, setQuiz] = useState<QuizQuestion[]>([]);

    const [selectedAnswers, setSelectedAnswers] = useState<
        Record<number, number>
    >({});

    const [showAnswer, setShowAnswer] = useState<
        Record<number, boolean>
    >({});

    const [loading, setLoading] = useState(false);
    const [quizError, setQuizError] = useState("");

    const [dialogOpen, setDialogOpen] = useState(false);

    const [difficulty, setDifficulty] = useState("Medium");

    const [questions, setQuestions] = useState(10);

    const [hasVideos, setHasVideos] = useState(true);
    const [attemptVideoId, setAttemptVideoId] = useState<number | undefined>();
    const [attemptSaved, setAttemptSaved] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [finalScore, setFinalScore] = useState<number | null>(null);
    const submissionInFlight = useRef(false);

    useEffect(() => {

        checkVideos();

    }, []);

    async function checkVideos() {

        try {

            const videos = await getVideos();

            const completed = videos.filter(
                (video: any) =>
                    video.status === "completed"
            );

            setHasVideos(
                completed.length > 0
            );

        } catch {

            setHasVideos(false);

        }

    }

    function openDialog() {

        setDialogOpen(true);

    }

    async function generateQuizHandler(
        videoIds: number[]
    ) {

        setDialogOpen(false);

        setLoading(true);
        setQuizError("");

        try {

            const result = await generateQuiz(
                videoIds,
                difficulty,
                questions
            );

            const parsed = parseQuizResponse(result);

            setQuiz(
                parsed.questions
            );

            setSelectedAnswers({});

            setShowAnswer({});
            setAttemptVideoId(videoIds.length === 1 ? videoIds[0] : undefined);
            setAttemptSaved(false);
            setSubmitting(false);
            setSubmitError("");
            setFinalScore(null);
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
            (question, index) =>
                selectedAnswers[index] === question.answer
        ).length;

        submissionInFlight.current = true;
        setSubmitting(true);
        setSubmitError("");

        try {
            await saveQuizAttempt(score, quiz.length, difficulty, attemptVideoId);
            setFinalScore(score);
            setAttemptSaved(true);
        } catch (error) {
            console.error("Unable to save quiz attempt", error);
            setSubmitError(
                "Your quiz was scored, but the result could not be saved. Please try again."
            );
            submissionInFlight.current = false;
        } finally {
            setSubmitting(false);
        }
    }

    const extraContent = (

        <Box
            sx={{
                display: "flex",
                gap: 2
            }}
        >

            <FormControl fullWidth>

                <InputLabel>
                    Difficulty
                </InputLabel>

                <Select
                    value={difficulty}
                    label="Difficulty"
                    onChange={(e) =>
                        setDifficulty(
                            e.target.value
                        )
                    }
                >

                    <MenuItem value="Easy">
                        Easy
                    </MenuItem>

                    <MenuItem value="Medium">
                        Medium
                    </MenuItem>

                    <MenuItem value="Hard">
                        Hard
                    </MenuItem>

                </Select>

            </FormControl>

            <FormControl fullWidth>

                <InputLabel>
                    Questions
                </InputLabel>

                <Select
                    value={questions}
                    label="Questions"
                    onChange={(e) =>
                        setQuestions(
                            Number(
                                e.target.value
                            )
                        )
                    }
                >

                    <MenuItem value={5}>
                        5
                    </MenuItem>

                    <MenuItem value={10}>
                        10
                    </MenuItem>

                    <MenuItem value={15}>
                        15
                    </MenuItem>

                    <MenuItem value={20}>
                        20
                    </MenuItem>

                </Select>

            </FormControl>

        </Box>

    );

    return (

        <>

            <Box>

                {

                    hasVideos ? (

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

                            {

                                loading
                                    ? (
                                        <CircularProgress
                                            size={22}
                                            color="inherit"
                                        />
                                    )
                                    : "Generate Quiz"

                            }

                        </Button>

                    ) : (

                        <Typography
                            sx={{
                                color: "#14B8A6"
                            }}
                        >
                            Please upload and process a video first.
                        </Typography>

                    )

                }

                {quizError && (
                    <Alert severity="error" sx={{ mt: 3 }}>
                        {quizError}
                    </Alert>
                )}

                {quiz.length > 0 && (

                    <Stack
                        spacing={3}
                        sx={{
                            mt: 4
                        }}
                    >

                        {quiz.map((q, index) => {

                            const selected =
                                selectedAnswers[index];

                            const checked =
                                showAnswer[index];

                            const correct =
                                selected === q.answer;

                            return (

                                <Card
                                    key={index}
                                    sx={{
                                        bgcolor: "#071827",

                                        // Slightly less rounded corners
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
                                            value={
                                                selected ?? -1
                                            }
                                            onChange={(e) =>
                                                setSelectedAnswers(
                                                    prev => ({
                                                        ...prev,
                                                        [index]:
                                                            Number(
                                                                e.target.value
                                                            )
                                                    })
                                                )
                                            }
                                        >

                                            {q.options.map(
                                                (
                                                    option,
                                                    optionIndex
                                                ) => (

                                                    <FormControlLabel
                                                        key={
                                                            optionIndex
                                                        }
                                                        value={
                                                            optionIndex
                                                        }
                                                        control={
                                                            <Radio />
                                                        }
                                                        disabled={attemptSaved}
                                                        label={
                                                            option
                                                        }
                                                        sx={{
                                                            color:
                                                                "#F8FAFC"
                                                        }}
                                                    />

                                                )
                                            )}

                                        </RadioGroup>

                                        <Button
                                            variant="contained"
                                            disabled={
                                                selected === undefined ||
                                                attemptSaved
                                            }
                                            onClick={() => checkAnswer(index)}
                                            sx={{
                                                mt: 2,
                                                bgcolor: "#14B8A6",
                                                "&:hover": {
                                                    bgcolor: "#10B981"
                                                }
                                            }}
                                        >
                                            Check Answer
                                        </Button>

                                        {

                                            checked && (

                                                <Alert
                                                    severity={
                                                        correct
                                                            ? "success"
                                                            : "error"
                                                    }
                                                    sx={{
                                                        mt: 3
                                                    }}
                                                >

                                                    <Typography
                                                        fontWeight={700}
                                                    >

                                                        {

                                                            correct
                                                                ? "Correct!"
                                                                : "Incorrect"

                                                        }

                                                    </Typography>

                                                    {

                                                        !correct && (

                                                            <Typography
                                                                sx={{
                                                                    mt: 1
                                                                }}
                                                            >

                                                                Correct Answer:

                                                                {" "}

                                                                <strong>

                                                                    {
                                                                        q.options[
                                                                            q.answer
                                                                        ]
                                                                    }

                                                                </strong>

                                                            </Typography>

                                                        )

                                                    }

                                                    <Typography
                                                        sx={{
                                                            mt: 2
                                                        }}
                                                    >

                                                        {
                                                            q.explanation
                                                        }

                                                    </Typography>

                                                </Alert>

                                            )

                                        }

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
                            <Alert
                                severity="success"
                                sx={{ alignSelf: "center", textAlign: "center" }}
                            >
                                <Typography fontWeight={700}>
                                    Quiz Complete 🎉
                                </Typography>
                                <Typography>
                                    Score: {finalScore} / {quiz.length}
                                </Typography>
                                <Typography>
                                    Percentage: {Math.round((finalScore / quiz.length) * 100)}%
                                </Typography>
                                <Typography>
                                    Difficulty: {difficulty}
                                </Typography>
                            </Alert>
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

                {

                    quiz.length > 0 && (

                        <Button
                            startIcon={
                                <RestartAltRoundedIcon />
                            }
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

                    )

                }

            </Box>

            <VideoSelectionDialog
                open={dialogOpen}
                title="Generate AI Quiz"
                buttonText="Generate Quiz"
                loading={loading}
                onClose={() =>
                    setDialogOpen(false)
                }
                onConfirm={
                    generateQuizHandler
                }
                extraContent={
                    extraContent
                }
            />

        </>

    );

}
