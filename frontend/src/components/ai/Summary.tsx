import {
    Box,
    Button,
    CircularProgress,
    Typography
} from "@mui/material";

import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";

import { useEffect, useState } from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
    generateSummary
} from "../../services/chatService";

import { getVideos } from "../../api/api";

import VideoSelectionDialog from "../common/VideoSelectionDialog";
import { generatePDF } from "../../utils/pdfGenerator";

export default function Summary() {

    const [summary, setSummary] = useState("");

    const [loading, setLoading] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);

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

    async function generateSummaryHandler(
        videoIds: number[]
    ) {

        setDialogOpen(false);

        setLoading(true);

        try {

            const result = await generateSummary(
                videoIds
            );

            setSummary(
                result.answer
            );

        } catch (error) {

            console.error(error);

        } finally {

            setLoading(false);

        }

    }

    function copySummary() {

        navigator.clipboard.writeText(
            summary
        );

    }

    function downloadSummary() {
        if (!summary) return;
        generatePDF({
            title: "AI Executive Summary",
            videoTitle: "Selected Video Collection",
            content: summary,
            docType: "summary"
        });
    }

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
                                px: 3,
                                py: 1.2,
                                "&:hover": {
                                    bgcolor: "#10B981"
                                }
                            }}
                        >
                            Select Videos & Generate Summary
                        </Button>

                    ) : (

                        <Typography
                            sx={{
                                color: "#94A3B8"
                            }}
                        >
                            Upload and process at least one video to generate summaries.
                        </Typography>

                    )

                }

            </Box>

            {loading && (

                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        mt: 4
                    }}
                >

                    <CircularProgress
                        size={24}
                        sx={{
                            color: "#14B8A6"
                        }}
                    />

                    <Typography
                        sx={{
                            color: "#94A3B8"
                        }}
                    >
                        Generating AI summary...
                    </Typography>

                </Box>

            )}

            {summary && !loading && (

                <Box
                    sx={{
                        mt: 4
                    }}
                >

                    <Box
                        sx={{
                            display: "flex",
                            gap: 2,
                            mb: 3
                        }}
                    >

                        <Button
                            startIcon={<ContentCopyRoundedIcon />}
                            variant="outlined"
                            onClick={copySummary}
                            sx={{
                                borderColor: "rgba(20,184,166,.3)",
                                color: "#14B8A6",
                                borderRadius: 2
                            }}
                        >
                            Copy Text
                        </Button>

                        <Button
                            startIcon={<PictureAsPdfRoundedIcon />}
                            variant="outlined"
                            onClick={downloadSummary}
                            sx={{
                                borderColor: "rgba(20,184,166,.3)",
                                color: "#14B8A6",
                                borderRadius: 2
                            }}
                        >
                            Download PDF
                        </Button>

                    </Box>

                    <Box
                        className="markdown-body"
                        sx={{
                            color: "#F8FAFC",
                            fontSize: "0.98rem",
                            lineHeight: 1.75,
                            letterSpacing: "0.15px",
                            fontFamily: `'Plus Jakarta Sans', 'Inter', sans-serif`,
                            "& h1": {
                                color: "#38BDF8",
                                fontWeight: 800,
                                fontSize: "1.5rem",
                                letterSpacing: "-0.5px",
                                mt: 3,
                                mb: 1.5,
                                pb: 1,
                                borderBottom: "1px solid rgba(56, 189, 248, 0.2)"
                            },
                            "& h2": {
                                color: "#14B8A6",
                                fontWeight: 700,
                                fontSize: "1.25rem",
                                letterSpacing: "-0.3px",
                                mt: 2.5,
                                mb: 1.2
                            },
                            "& h3": {
                                color: "#F8FAFC",
                                fontWeight: 700,
                                fontSize: "1.1rem",
                                mt: 2,
                                mb: 1
                            },
                            "& p": {
                                my: 1.2,
                                color: "#E2E8F0"
                            },
                            "& ul, & ol": {
                                pl: 2.5,
                                my: 1.2
                            },
                            "& li": {
                                mb: 0.8,
                                lineHeight: 1.7,
                                color: "#E2E8F0"
                            },
                            "& strong": {
                                color: "#38BDF8",
                                fontWeight: 700
                            },
                            "& code": {
                                bgcolor: "rgba(255, 255, 255, 0.08)",
                                color: "#38BDF8",
                                px: 1,
                                py: 0.3,
                                borderRadius: 1,
                                fontSize: "0.88rem",
                                fontFamily: "monospace"
                            },
                            "& hr": {
                                borderColor: "rgba(255, 255, 255, 0.12)",
                                my: 3
                            }
                        }}
                    >
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {summary}
                        </ReactMarkdown>
                    </Box>

                </Box>

            )}

            <VideoSelectionDialog
                open={dialogOpen}
                title="Generate AI Summary"
                buttonText="Generate Summary"
                loading={loading}
                onClose={() => setDialogOpen(false)}
                onConfirm={generateSummaryHandler}
            />

        </>

    );

}