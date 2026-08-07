import {
    Box,
    Button,
    CircularProgress,
    Paper,
    Typography
} from "@mui/material";

import { useState } from "react";

import { askAI } from "../../services/chatService";
import VideoSelectionDialog from "../common/VideoSelectionDialog";

export default function Summary() {

    const [summary, setSummary] = useState("");

    const [loading, setLoading] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);

    function openDialog() {

        setDialogOpen(true);

    }

    async function generateSummary(

        videoIds: number[]

    ) {

        setDialogOpen(false);

        setLoading(true);

        try {

            const result = await askAI(

                "Provide a detailed summary of the selected videos.",

                undefined,

                videoIds

            );

            setSummary(

                result.answer

            );

        }

        catch {

            console.error("Unable to generate summary.");

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

                    📄 AI Summary

                </Typography>

                <Typography

                    sx={{

                        color: "#94A3B8",

                        mb: 3,

                        fontSize: 14

                    }}

                >

                    Generate an AI summary from one or more processed videos.

                </Typography>

                <Button

                    variant="contained"

                    onClick={openDialog}

                    disabled={loading}

                >

                    {

                        loading

                            ?

                            <CircularProgress

                                size={20}

                                color="inherit"

                            />

                            :

                            "Generate Summary"

                    }

                </Button>

                {

                    summary &&

                    <Box

                        sx={{

                            mt: 3,

                            whiteSpace: "pre-wrap",

                            lineHeight: 1.8,

                            color: "#F8FAFC"

                        }}

                    >

                        {summary}

                    </Box>

                }

            </Paper>

            <VideoSelectionDialog

                open={dialogOpen}

                title="Generate AI Summary"

                buttonText="Generate Summary"

                loading={loading}

                onClose={() =>

                    setDialogOpen(false)

                }

                onConfirm={generateSummary}

            />

        </>

    );

}