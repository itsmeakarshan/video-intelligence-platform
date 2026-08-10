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
    generateNotes
} from "../../services/chatService";

import { getVideos } from "../../api/api";

import VideoSelectionDialog from "../common/VideoSelectionDialog";

export default function Notes() {

    const [notes, setNotes] = useState("");

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

    async function generateNotesHandler(
        videoIds: number[]
    ) {

        setDialogOpen(false);

        setLoading(true);

        try {

            const result = await generateNotes(
                videoIds
            );

            setNotes(
                result.answer
            );

        } catch (error) {

            console.error(error);

        } finally {

            setLoading(false);

        }

    }

    function copyNotes() {

        navigator.clipboard.writeText(
            notes
        );

    }

    function downloadNotes() {

        const blob = new Blob(
            [notes],
            {
                type: "text/markdown"
            }
        );

        const url = URL.createObjectURL(
            blob
        );

        const a = document.createElement("a");

        a.href = url;

        a.download = "notes.md";

        a.click();

        URL.revokeObjectURL(url);

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
                                px: 4,
                                "&:hover": {
                                    bgcolor: "#10B981"
                                }
                            }}
                        >

                            {

                                loading
                                    ? <CircularProgress size={22} color="inherit" />
                                    : "Generate Notes"

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

                {

                    notes && (

                        <>

                            <Box
                                sx={{
                                    mt: 4,
                                    p: 3,
                                    borderRadius: 2,
                                    bgcolor: "#071827",
                                    border: "1px solid rgba(255,255,255,.08)",
                                    color: "#F8FAFC",
                                    lineHeight: 1.8,

                                    "& h1,& h2,& h3": {
                                        color: "#14B8A6",
                                        mt: 3,
                                        mb: 1
                                    },

                                    "& p": {
                                        mb: 2
                                    },

                                    "& ul": {
                                        pl: 3
                                    },

                                    "& li": {
                                        mb: .8
                                    },

                                    "& code": {
                                        bgcolor: "rgba(255,255,255,.08)",
                                        px: .5,
                                        borderRadius: 1
                                    }
                                }}
                            >

                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                >
                                    {notes}
                                </ReactMarkdown>

                            </Box>

                            <Box
                                sx={{
                                    display: "flex",
                                    gap: 2,
                                    mt: 3
                                }}
                            >

                                <Button
                                    startIcon={<ContentCopyRoundedIcon />}
                                    variant="outlined"
                                    onClick={copyNotes}
                                    sx={{
                                        borderRadius: 2,
                                        borderColor: "#14B8A6",
                                        color: "#14B8A6"
                                    }}
                                >
                                    Copy
                                </Button>

                                <Button
                                    startIcon={<PictureAsPdfRoundedIcon />}
                                    variant="outlined"
                                    onClick={downloadNotes}
                                    sx={{
                                        borderRadius: 2,
                                        borderColor: "#14B8A6",
                                        color: "#14B8A6"
                                    }}
                                >
                                    Download
                                </Button>

                            </Box>

                        </>

                    )

                }

            </Box>

            <VideoSelectionDialog
                open={dialogOpen}
                title="Generate AI Notes"
                buttonText="Generate Notes"
                loading={loading}
                onClose={() => setDialogOpen(false)}
                onConfirm={generateNotesHandler}
            />

        </>

    );

}