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
                            fontSize: "1.05rem",
                            lineHeight: 1.8
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