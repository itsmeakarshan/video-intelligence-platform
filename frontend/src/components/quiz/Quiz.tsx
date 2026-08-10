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
    Chip,
    Stack
} from "@mui/material";

import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";

import { useEffect, useState } from "react";

import { generateQuiz } from "../../services/chatService";
import { getVideos } from "../../api/api";

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

export default function Quiz() {

    const [quiz, setQuiz] = useState<QuizQuestion[]>([]);

    const [selectedAnswers, setSelectedAnswers] = useState<
        Record<number, number>
    >({});

    const [showAnswer, setShowAnswer] = useState<
        Record<number, boolean>
    >({});

    const [loading, setLoading] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);

    const [difficulty, setDifficulty] = useState("Medium");

    const [questions, setQuestions] = useState(10);

    const [hasVideos, setHasVideos] = useState(true);

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

        try {

            const result = await generateQuiz(
                videoIds,
                difficulty,
                questions
            );

            const parsed: QuizResponse =
                JSON.parse(
                    result.answer
                );

            setQuiz(
                parsed.questions
            );

            setSelectedAnswers({});

            setShowAnswer({});

        } catch (error) {

            console.error(error);

        } finally {

            setLoading(false);

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
                                                selected === undefined
                                            }
                                            onClick={() =>
                                                setShowAnswer(
                                                    prev => ({
                                                        ...prev,
                                                        [index]: true
                                                    })
                                                )
                                            }
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

                        <Chip
                            color="success"
                            label={`Score: ${
                                Object.keys(
                                    showAnswer
                                ).filter(i =>
                                    selectedAnswers[
                                        Number(i)
                                    ] ===
                                    quiz[
                                        Number(i)
                                    ].answer
                                ).length
                            } / ${quiz.length}`}
                            sx={{
                                alignSelf: "center",
                                mt: 2,
                                fontSize: 18,
                                px: 2,
                                py: 3
                            }}
                        />

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