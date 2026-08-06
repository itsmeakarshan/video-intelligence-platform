import {
    Box,
    Divider,
    Grid,
    Paper,
    Typography
} from "@mui/material";

import { useEffect, useState } from "react";

import Chat from "../components/chat/Chat";
import Upload from "../components/upload/Upload";
import VideoPlayer from "../components/video/VideoPlayer";
import Transcript from "../components/video/Transcript";
import Summary from "../components/ai/Summary";
import Notes from "../components/notes/Notes";
import Quiz from "../components/quiz/Quiz";

import { getSegments } from "../api/api";
import { useVideo } from "../context/VideoContext";

export default function Dashboard() {

    const { videoId, seekTo } = useVideo();

    const [segments, setSegments] = useState<any[]>([]);

    useEffect(() => {

        async function loadTranscript() {

            if (!videoId) return;

            try {

                const data = await getSegments(videoId);

                setSegments(data);

            } catch (error) {

                console.error(error);

            }

        }

        loadTranscript();

    }, [videoId]);

    return (

        <Box
            sx={{
                minHeight: "100vh",
                backgroundColor: "#F5F7FA",
                p: 3
            }}
        >

            <Typography
                variant="h4"
                sx={{
                    fontWeight: 700,
                    mb: 3
                }}
            >
                Video Intelligence Platform
            </Typography>

            <Grid container spacing={3}>

                {/* LEFT PANEL */}

                <Grid size={{ xs: 12, lg: 8 }}>

                    <Paper
                        sx={{
                            p: 2,
                            borderRadius: 4,
                            mb: 3
                        }}
                    >
                        <VideoPlayer />
                    </Paper>

                    <Paper
                        sx={{
                            p: 2,
                            borderRadius: 4,
                            mb: 3
                        }}
                    >
                        <Upload />
                    </Paper>

                    <Paper
                        sx={{
                            p: 2,
                            borderRadius: 4,
                            mb: 3
                        }}
                    >
                        <Transcript
                            segments={segments}
                            onSeek={seekTo}
                        />
                    </Paper>

                    <Summary />

                    <Notes />

                    <Quiz />

                </Grid>

                {/* RIGHT PANEL */}

                <Grid size={{ xs: 12, lg: 4 }}>

                    <Paper
                        sx={{
                            height: "100%",
                            borderRadius: 4,
                            overflow: "hidden"
                        }}
                    >

                        <Box
                            sx={{
                                p: 2
                            }}
                        >
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 700
                                }}
                            >
                                AI Assistant
                            </Typography>
                        </Box>

                        <Divider />

                        <Chat />

                    </Paper>

                </Grid>

            </Grid>

        </Box>

    );

}