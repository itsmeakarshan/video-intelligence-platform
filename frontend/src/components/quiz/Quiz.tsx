import { useState } from "react";
import {
    Paper,
    Typography,
    Button,
    CircularProgress,
    Box
} from "@mui/material";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { askAI } from "../../services/chatService";

export default function Quiz() {

    const [quiz, setQuiz] = useState("");
    const [loading, setLoading] = useState(false);

    async function generateQuiz() {

        setLoading(true);

        try {

            const response = await askAI(
                `Generate 10 multiple choice questions from the uploaded video.

Format:

Question
A)
B)
C)
D)

Then provide the correct answer below each question.`
            );

            setQuiz(response.answer);

        } catch (error) {

            console.error(error);

        } finally {

            setLoading(false);

        }

    }

    return (

        <Paper
            sx={{
                p: 3,
                mt: 3,
                borderRadius: 4
            }}
        >

            <Typography
                variant="h6"
                sx={{
                    fontWeight: 700,
                    mb: 2
                }}
            >
                AI Quiz
            </Typography>

            <Button
                variant="contained"
                onClick={generateQuiz}
                disabled={loading}
            >
                {
                    loading
                        ? <CircularProgress size={22} color="inherit" />
                        : "Generate Quiz"
                }
            </Button>

            {
                quiz &&

                <Box
                    sx={{
                        mt: 3
                    }}
                >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {quiz}
                    </ReactMarkdown>
                </Box>

            }

        </Paper>

    );

}