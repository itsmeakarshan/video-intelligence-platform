import { useState, useEffect } from "react";
import {
    Box,
    Grid,
    Paper,
    Typography,
    Container,
    Chip,
    Button,
    Stack,
    Card,
    CardContent
} from "@mui/material";

import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import NotesRoundedIcon from "@mui/icons-material/NotesRounded";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import SchoolIcon from "@mui/icons-material/School";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import VideoLibraryRoundedIcon from "@mui/icons-material/VideoLibraryRounded";
import YouTubeIcon from "@mui/icons-material/YouTube";

import { useNavigate } from "react-router-dom";

import Navbar from "../components/layout/Navbar";
import StarTrail from "./StarTrail";
import Chat from "../components/chat/Chat";
import VideoPlayer from "../components/video/VideoPlayer";
import VideoLibrary from "../components/video/VideoLibrary";
import YouTubeDownloader from "../components/video/YouTubeDownloader";
import Upload from "../components/upload/Upload";
import DraggableRobot from "../components/common/DraggableRobot";
import { getConfidenceTier } from "../components/quiz/LearningPredictionCard";
import { getLearningPrediction, getPassPrediction } from "../api/api";

export default function Dashboard() {
    const navigate = useNavigate();

    const [predScore, setPredScore] = useState<number | null>(null);
    const [passProb, setPassProb] = useState<number | null>(null);
    const [histAvg, setHistAvg] = useState<number | null>(null);
    const [attemptCount, setAttemptCount] = useState<number>(0);

    const userStr = localStorage.getItem("user");
    let user = { name: "Learner" };
    if (userStr) {
        try {
            user = JSON.parse(userStr);
        } catch (e) {
            console.error(e);
        }
    }

    useEffect(() => {
        window.scrollTo(0, 0);
        loadOverviewPredictions();
    }, []);

    async function loadOverviewPredictions() {
        try {
            const [regRes, clfRes] = await Promise.all([
                getLearningPrediction("Medium"),
                getPassPrediction("Medium")
            ]);
            if (regRes && regRes.has_sufficient_history) {
                setPredScore(regRes.predicted_percentage);
                setHistAvg(regRes.historical_avg);
                setAttemptCount(regRes.attempt_count);
            }
            if (clfRes && clfRes.has_sufficient_history) {
                setPassProb(clfRes.probability_of_pass);
            }
        } catch (err) {
            console.error("Failed to load overview predictions", err);
        }
    }

    const tierInfo = getConfidenceTier(passProb);

    const cardGlassStyle = {
        borderRadius: 3,
        backdropFilter: "blur(20px)",
        background: "rgba(15, 23, 42, 0.75)",
        border: "1px solid rgba(20, 184, 166, 0.2)",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.45)"
    };

    return (
        <Box
            sx={{
                minHeight: "100vh",
                overflowX: "hidden",
                bgcolor: "#0F172A",
                color: "#f8fafc",
                position: "relative",
                pb: 8
            }}
        >
            <Navbar />
            <StarTrail />

            <Container
                maxWidth="xl"
                sx={{
                    position: "relative",
                    zIndex: 1,
                    pt: 4
                }}
            >
                {/* 1. WELCOME / HEADER */}
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mb: 4,
                        pb: 2.5,
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        flexWrap: "wrap",
                        gap: 2
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={2}>
                        {/* Animated Floating Robot Visual */}
                        <Box
                            sx={{
                                width: 52,
                                height: 52,
                                borderRadius: "18px",
                                background: "linear-gradient(135deg, #14b8a6, #0ea5e9)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "0 0 24px rgba(20, 184, 166, 0.45)",
                                animation: "floatRobot 3.2s ease-in-out infinite",
                                "@keyframes floatRobot": {
                                    "0%, 100%": { transform: "translateY(0px)" },
                                    "50%": { transform: "translateY(-7px)" }
                                }
                            }}
                        >
                            <SmartToyRoundedIcon sx={{ color: "#ffffff", fontSize: 30 }} />
                        </Box>
                        <Box>
                            <Stack direction="row" alignItems="center" spacing={1.5}>
                                <Typography
                                    variant="h4"
                                    sx={{
                                        fontWeight: 800,
                                        letterSpacing: "-0.5px",
                                        color: "#f8fafc",
                                        fontSize: { xs: 24, sm: 30 }
                                    }}
                                >
                                    Welcome back, {user.name} 👋
                                </Typography>
                                <Chip
                                    icon={<SchoolIcon sx={{ fontSize: 16, color: "#14b8a6" }} />}
                                    label="Active Student Session"
                                    sx={{ bgcolor: "rgba(20, 184, 166, 0.15)", color: "#14b8a6", fontWeight: 700 }}
                                />
                            </Stack>
                            <Typography variant="body2" sx={{ color: "#94a3b8", mt: 0.5 }}>
                                AI-powered real-time video intelligence & personalized score forecasting workspace
                            </Typography>
                        </Box>
                    </Stack>

                    <Stack direction="row" spacing={1.5}>
                        <Button
                            variant="contained"
                            startIcon={<QuizRoundedIcon />}
                            onClick={() => navigate("/quiz")}
                            sx={{
                                bgcolor: "#0f766e",
                                color: "#f8fafc",
                                fontWeight: 700,
                                px: 3,
                                py: 1,
                                borderRadius: 2.5,
                                "&:hover": { bgcolor: "#14b8a6" }
                            }}
                        >
                            Generate Quiz
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<SchoolIcon />}
                            onClick={() => navigate("/profile")}
                            sx={{
                                color: "#38bdf8",
                                borderColor: "rgba(56, 189, 248, 0.3)",
                                fontWeight: 700,
                                borderRadius: 2.5,
                                px: 2.5,
                                py: 1,
                                "&:hover": { bgcolor: "rgba(56, 189, 248, 0.15)" }
                            }}
                        >
                            View Analytics Profile
                        </Button>
                    </Stack>
                </Box>

                {/* 2. ML METRICS (EXACTLY 3 CARDS) */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    {/* Card 1: Predicted Next Score */}
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Card
                            sx={{
                                ...cardGlassStyle,
                                p: 1,
                                border: "1px solid rgba(20, 184, 166, 0.3)",
                                transition: "all 0.2s ease",
                                "&:hover": { transform: "translateY(-4px)", borderColor: "#14b8a6" }
                            }}
                        >
                            <CardContent>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                    <Typography sx={{ color: "#94A3B8", fontSize: 13, fontWeight: 700 }}>
                                        PREDICTED NEXT SCORE
                                    </Typography>
                                    <AutoGraphIcon sx={{ color: "#14b8a6" }} />
                                </Stack>
                                <Typography variant="h3" sx={{ color: "#14b8a6", fontWeight: 800 }}>
                                    {predScore !== null ? `${predScore}%` : "--"}
                                </Typography>
                                <Typography sx={{ color: "#64748B", fontSize: 11, mt: 1 }}>
                                    Extra Trees Regressor_v4.0
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Card 2: Pass Probability */}
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Card
                            sx={{
                                ...cardGlassStyle,
                                p: 1,
                                border: `1px solid ${tierInfo?.borderColor || "rgba(255,255,255,0.1)"}`,
                                transition: "all 0.2s ease",
                                "&:hover": { transform: "translateY(-4px)" }
                            }}
                        >
                            <CardContent>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                    <Typography sx={{ color: "#94A3B8", fontSize: 13, fontWeight: 700 }}>
                                        PASS PROBABILITY
                                    </Typography>
                                    <CheckCircleOutlineIcon sx={{ color: tierInfo?.color || "#94a3b8" }} />
                                </Stack>
                                <Typography variant="h3" sx={{ color: tierInfo?.color || "#F8FAFC", fontWeight: 800 }}>
                                    {passProb !== null ? `${Math.round(passProb * 100)}%` : "--"}
                                </Typography>
                                <Chip
                                    label={tierInfo?.label || "Calculating..."}
                                    size="small"
                                    sx={{
                                        mt: 1,
                                        bgcolor: tierInfo?.bgColor || "rgba(255,255,255,0.08)",
                                        color: tierInfo?.color || "#94a3b8",
                                        fontWeight: 700,
                                        fontSize: 10
                                    }}
                                />
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Card 3: Historical Average */}
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Card
                            sx={{
                                ...cardGlassStyle,
                                p: 1,
                                transition: "all 0.2s ease",
                                "&:hover": { transform: "translateY(-4px)", borderColor: "rgba(56, 189, 248, 0.4)" }
                            }}
                        >
                            <CardContent>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                    <Typography sx={{ color: "#94A3B8", fontSize: 13, fontWeight: 700 }}>
                                        HISTORICAL AVERAGE
                                    </Typography>
                                    <SchoolIcon sx={{ color: "#38bdf8" }} />
                                </Stack>
                                <Typography variant="h3" sx={{ color: "#F8FAFC", fontWeight: 800 }}>
                                    {histAvg !== null ? `${histAvg}%` : "--"}
                                </Typography>
                                <Typography sx={{ color: "#64748B", fontSize: 11, mt: 1 }}>
                                    Across {attemptCount} completed quizzes
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* 3. MAIN LEARNING WORKSPACE (VIDEO PLAYER ~70% | AI CHAT ~30%) */}
                <Grid container spacing={3} sx={{ mb: 4 }} alignItems="stretch">
                    {/* LEFT SIDE — VIDEO PLAYER (~70%) */}
                    <Grid size={{ xs: 12, lg: 8.4 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                ...cardGlassStyle,
                                p: 3,
                                height: "100%",
                                minHeight: 600,
                                display: "flex",
                                flexDirection: "column"
                            }}
                        >
                            <VideoPlayer />
                        </Paper>
                    </Grid>

                    {/* RIGHT SIDE — AI VIDEO INTELLIGENCE CHAT (~30%) */}
                    <Grid size={{ xs: 12, lg: 3.6 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                ...cardGlassStyle,
                                p: 0,
                                height: "100%",
                                minHeight: 600,
                                maxHeight: 720,
                                display: "flex",
                                flexDirection: "column",
                                overflow: "hidden",
                                borderRadius: 3
                            }}
                        >
                            <Box sx={{ flex: 1, minHeight: 0, height: "100%" }}>
                                <Chat />
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>

                {/* 4. VIDEO LIBRARY — DIRECTLY BELOW MAIN WORKSPACE */}
                <Box sx={{ mb: 4 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                        <VideoLibraryRoundedIcon sx={{ color: "#14b8a6", fontSize: 28 }} />
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 800, color: "#F8FAFC" }}>
                                Video Library
                            </Typography>
                            <Typography variant="body2" sx={{ color: "#94A3B8" }}>
                                Select, view, and manage your processed learning video collection.
                            </Typography>
                        </Box>
                    </Stack>
                    <Paper
                        elevation={0}
                        sx={{
                            ...cardGlassStyle,
                            p: 3,
                            transition: "border-color 0.3s ease",
                            "&:hover": { borderColor: "rgba(20, 184, 166, 0.55)" }
                        }}
                    >
                        <VideoLibrary />
                    </Paper>
                </Box>

                {/* 5. LOCAL VIDEO UPLOAD — BELOW VIDEO LIBRARY */}
                <Box sx={{ mb: 4 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                        <CloudUploadRoundedIcon sx={{ color: "#14b8a6", fontSize: 28 }} />
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 800, color: "#F8FAFC" }}>
                                Upload Local Videos
                            </Typography>
                            <Typography variant="body2" sx={{ color: "#94A3B8" }}>
                                Drag & drop local video files or browse to upload multi-video collections.
                            </Typography>
                        </Box>
                    </Stack>
                    <Paper
                        elevation={0}
                        sx={{
                            ...cardGlassStyle,
                            p: 3,
                            transition: "border-color 0.3s ease",
                            "&:hover": { borderColor: "rgba(20, 184, 166, 0.45)" }
                        }}
                    >
                        <Upload />
                    </Paper>
                </Box>

                {/* 6. YOUTUBE DOWNLOAD — BELOW LOCAL UPLOAD */}
                <Box id="recommendations-section" sx={{ mb: 4 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                        <YouTubeIcon sx={{ color: "#ef4444", fontSize: 30 }} />
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 800, color: "#F8FAFC" }}>
                                Add YouTube Video
                            </Typography>
                            <Typography variant="body2" sx={{ color: "#94A3B8" }}>
                                Paste a YouTube video link to download, index, and generate AI insights.
                            </Typography>
                        </Box>
                    </Stack>
                    <Paper
                        elevation={0}
                        sx={{
                            ...cardGlassStyle,
                            p: 3,
                            transition: "border-color 0.3s ease",
                            "&:hover": { borderColor: "rgba(20, 184, 166, 0.45)" }
                        }}
                    >
                        <YouTubeDownloader />
                    </Paper>
                </Box>

                {/* 7. AI TOOLS — 3 EQUAL COLUMNS SIDE BY SIDE */}
                <Grid container spacing={3}>
                    {/* Summary Card */}
                    <Grid size={{ xs: 12, md: 4 }} id="summary-section">
                        <Paper
                            elevation={0}
                            sx={{
                                ...cardGlassStyle,
                                p: 4,
                                minHeight: 260,
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                transition: ".3s",
                                "&:hover": {
                                    transform: "translateY(-6px)",
                                    borderColor: "#14B8A6",
                                    boxShadow: "0 24px 48px rgba(20,184,166,.22)"
                                }
                            }}
                        >
                            <Box>
                                <DescriptionRoundedIcon sx={{ fontSize: 44, color: "#14B8A6", mb: 2 }} />
                                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: "#F8FAFC" }}>
                                    Video Summaries
                                </Typography>
                                <Typography variant="body2" sx={{ color: "#94A3B8" }}>
                                    Structured, AI-generated transcript summaries with key insights.
                                </Typography>
                            </Box>
                            <Button
                                variant="contained"
                                endIcon={<ArrowForwardRoundedIcon />}
                                onClick={() => navigate("/summary")}
                                sx={{
                                    bgcolor: "#0f766e",
                                    color: "#f8fafc",
                                    fontWeight: 700,
                                    alignSelf: "flex-start",
                                    mt: 2,
                                    boxShadow: "0 4px 14px rgba(20, 184, 166, 0.35)",
                                    "&:hover": { bgcolor: "#14b8a6", transform: "translateY(-2px)" }
                                }}
                            >
                                Open Summaries
                            </Button>
                        </Paper>
                    </Grid>

                    {/* Notes Card */}
                    <Grid size={{ xs: 12, md: 4 }} id="notes-section">
                        <Paper
                            elevation={0}
                            sx={{
                                ...cardGlassStyle,
                                p: 4,
                                minHeight: 260,
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                transition: ".3s",
                                "&:hover": {
                                    transform: "translateY(-6px)",
                                    borderColor: "#14B8A6",
                                    boxShadow: "0 24px 48px rgba(20,184,166,.22)"
                                }
                            }}
                        >
                            <Box>
                                <NotesRoundedIcon sx={{ fontSize: 44, color: "#14B8A6", mb: 2 }} />
                                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: "#F8FAFC" }}>
                                    Smart Notes
                                </Typography>
                                <Typography variant="body2" sx={{ color: "#94A3B8" }}>
                                    Automated study notes mapped to video timestamps.
                                </Typography>
                            </Box>
                            <Button
                                variant="contained"
                                endIcon={<ArrowForwardRoundedIcon />}
                                onClick={() => navigate("/notes")}
                                sx={{
                                    bgcolor: "#0f766e",
                                    color: "#f8fafc",
                                    fontWeight: 700,
                                    alignSelf: "flex-start",
                                    mt: 2,
                                    boxShadow: "0 4px 14px rgba(20, 184, 166, 0.35)",
                                    "&:hover": { bgcolor: "#14b8a6", transform: "translateY(-2px)" }
                                }}
                            >
                                Open Notes
                            </Button>
                        </Paper>
                    </Grid>

                    {/* Quiz Studio Card */}
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                ...cardGlassStyle,
                                p: 4,
                                minHeight: 260,
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                transition: ".3s",
                                "&:hover": {
                                    transform: "translateY(-6px)",
                                    borderColor: "#14B8A6",
                                    boxShadow: "0 24px 48px rgba(20,184,166,.22)"
                                }
                            }}
                        >
                            <Box>
                                <QuizRoundedIcon sx={{ fontSize: 44, color: "#14B8A6", mb: 2 }} />
                                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: "#F8FAFC" }}>
                                    Quiz Studio
                                </Typography>
                                <Typography variant="body2" sx={{ color: "#94A3B8" }}>
                                    Adaptive quiz generation with real-time feedback & scoring.
                                </Typography>
                            </Box>
                            <Button
                                variant="contained"
                                endIcon={<ArrowForwardRoundedIcon />}
                                onClick={() => navigate("/quiz")}
                                sx={{
                                    bgcolor: "#0f766e",
                                    color: "#f8fafc",
                                    alignSelf: "flex-start",
                                    mt: 2,
                                    "&:hover": { bgcolor: "#14b8a6" }
                                }}
                            >
                                Launch Quiz Studio
                            </Button>
                        </Paper>
                    </Grid>
                </Grid>
            </Container>

            {/* DRAGGABLE FLOATING ROBOT ASSISTANT */}
            <DraggableRobot />
        </Box>
    );
}