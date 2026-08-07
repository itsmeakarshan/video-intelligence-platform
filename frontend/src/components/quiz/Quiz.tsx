import { useState } from "react";

import {
    Box,
    Button,
    CircularProgress,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Typography
} from "@mui/material";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { askAI } from "../../services/chatService";
import VideoSelectionDialog from "../common/VideoSelectionDialog";

export default function Quiz() {

    const [quiz, setQuiz] = useState("");

    const [loading, setLoading] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);

    const [difficulty, setDifficulty] = useState("Medium");

    const [questions, setQuestions] = useState(10);

    function openDialog() {

        setDialogOpen(true);

    }

    async function generateQuiz(

        videoIds: number[]

    ) {

        setDialogOpen(false);

        setLoading(true);

        try {

            const response = await askAI(

                `Generate ${questions} multiple choice questions from the selected videos.

Difficulty: ${difficulty}

Format:

Question

A)

B)

C)

D)

Then provide the correct answer below each question.`,

                undefined,

                videoIds

            );

            setQuiz(response.answer);

        }

        catch (error) {

            console.error(error);

        }

        finally {

            setLoading(false);

        }

    }

    return (

        <>

            <Paper

                sx={{

                    p: 3,

                    borderRadius: 2,

                    background: "transparent",

                    boxShadow: "none"

                }}

            >

                <Typography

                    variant="h6"

                    sx={{

                        fontWeight: 700,

                        mb: 2

                    }}

                >

                    🧠 AI Quiz

                </Typography>

                <Typography

                    sx={{

                        color: "#94A3B8",

                        mb: 3,

                        fontSize: 14

                    }}

                >

                    Create quizzes from one or more processed videos.

                </Typography>

                <Box

                    sx={{

                        display: "flex",

                        gap: 2,

                        mb: 3

                    }}

                >

                    <FormControl fullWidth>

                        <InputLabel>

                            Difficulty

                        </InputLabel>

                        <Select

                            value={difficulty}

                            label="Difficulty"

                            onChange={(event) =>

                                setDifficulty(

                                    event.target.value

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

                            onChange={(event) =>

                                setQuestions(

                                    Number(event.target.value)

                                )

                            }

                        >

                            <MenuItem value={5}>5</MenuItem>

                            <MenuItem value={10}>10</MenuItem>

                            <MenuItem value={15}>15</MenuItem>

                            <MenuItem value={20}>20</MenuItem>

                        </Select>

                    </FormControl>

                </Box>

                <Button

                    variant="contained"

                    onClick={openDialog}

                    disabled={loading}

                >

                    {

                        loading

                            ?

                            <CircularProgress

                                size={22}

                                color="inherit"

                            />

                            :

                            "Generate Quiz"

                    }

                </Button>

                {

                    quiz &&

                    <Box

                        sx={{

                            mt: 3,

                            color: "#F8FAFC"

                        }}

                    >

                        <ReactMarkdown

                            remarkPlugins={[remarkGfm]}

                        >

                            {quiz}

                        </ReactMarkdown>

                    </Box>

                }

            </Paper>

            <VideoSelectionDialog

                open={dialogOpen}

                title="Generate AI Quiz"

                buttonText="Generate Quiz"

                loading={loading}

                onClose={() =>

                    setDialogOpen(false)

                }

                onConfirm={generateQuiz}

            />

        </>

    );

}