import { useState, useEffect, useRef } from "react";

import {
    Box,
    Grid,
    Paper,
    Typography,
    Container,
    Chip,
    Button
} from "@mui/material";

import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import NotesRoundedIcon from "@mui/icons-material/NotesRounded";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";

import { useNavigate } from "react-router-dom";

import StarTrail from "./StarTrail";

import Chat from "../components/chat/Chat";
import VideoPlayer from "../components/video/VideoPlayer";
import VideoLibrary from "../components/video/VideoLibrary";
import YouTubeDownloader from "../components/video/YouTubeDownloader";


function DraggableRobot({
    defaultLeftPct,
    defaultTopPct,
    size,
    animationString,
    glowColor
}: any) {

    const containerRef = useRef<HTMLDivElement>(null);

    const pos = useRef({ x: 0, y: 0 });

    const dragStart = useRef({ x: 0, y: 0 });

    const [dragging, setDragging] = useState(false);


    useEffect(() => {

        pos.current = {
            x: window.innerWidth * defaultLeftPct,
            y: window.innerHeight * defaultTopPct
        };

        if (containerRef.current) {

            containerRef.current.style.transform =
                `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;

            containerRef.current.style.opacity = "1";

        }

    }, [defaultLeftPct, defaultTopPct]);


    const handlePointerDown = (
        e: React.PointerEvent<HTMLDivElement>
    ) => {

        setDragging(true);

        dragStart.current = {
            x: e.clientX - pos.current.x,
            y: e.clientY - pos.current.y
        };

        e.currentTarget.setPointerCapture(e.pointerId);

    };


    const handlePointerMove = (
        e: React.PointerEvent<HTMLDivElement>
    ) => {

        if (!dragging) return;

        pos.current = {
            x: e.clientX - dragStart.current.x,
            y: e.clientY - dragStart.current.y
        };

        if (containerRef.current) {

            containerRef.current.style.transform =
                `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;

        }

    };


    const handlePointerUp = (
        e: React.PointerEvent<HTMLDivElement>
    ) => {

        setDragging(false);

        e.currentTarget.releasePointerCapture(e.pointerId);

    };


    return (

        <Box
            ref={containerRef}
            sx={{
                position: "fixed",
                left: 0,
                top: 0,
                opacity: 0,
                width: size,
                height: "auto",
                zIndex: 0,
                cursor: dragging ? "grabbing" : "grab",
                touchAction: "none",
                userSelect: "none",
                willChange: "transform",
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >

            <Box
                component="img"
                src="/robot.png"
                alt="Roaming Robot"
                draggable={false}
                sx={{
                    width: "100%",
                    height: "auto",
                    objectFit: "contain",
                    pointerEvents: "none",
                    animation: animationString,
                    filter: `drop-shadow(0 0 20px ${glowColor})`,
                    animationPlayState: dragging ? "paused" : "running",
                    transition: "filter 0.2s ease",

                    ...(dragging && {
                        filter:
                            `drop-shadow(0 0 30px ${glowColor}) brightness(1.2)`
                    })
                }}
            />

        </Box>

    );

}


export default function Dashboard() {

    useEffect(() => {

        window.scrollTo(0, 0);

    }, []);


    const navigate = useNavigate();


    const handleLogout = () => {

        navigate("/login");

    };


    const cardGlassStyle = {

        borderRadius: 2,

        backdropFilter: "blur(20px)",

        background: "rgba(4, 47, 46, 0.7)",

        border: "1px solid rgba(20, 184, 166, 0.15)",

        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.45)",

    };


    return (

        <Box
            sx={{
                minHeight: "100vh",
                overflowX: "hidden",
                background:
                    "radial-gradient(circle at 50% 0%, #064e3b 0%, #020617 100%)",
                color: "#f8fafc",
                position: "relative",
                pb: 6
            }}
        >

            <StarTrail />


            {/* Draggable Robot 1 */}

            <DraggableRobot
                defaultLeftPct={0.05}
                defaultTopPct={0.15}
                size={240}
                animationString="droneHover1 16s ease-in-out infinite"
                glowColor="rgba(20, 184, 166, 0.4)"
            />


            {/* Draggable Robot 2 */}

            <DraggableRobot
                defaultLeftPct={0.75}
                defaultTopPct={0.65}
                size={300}
                animationString="droneHover2 20s ease-in-out infinite reverse"
                glowColor="rgba(16, 185, 129, 0.4)"
            />


            <style>{`

                @keyframes droneHover1 {

                    0% {
                        transform: translate(0, 0) rotate(0deg);
                    }

                    33% {
                        transform: translate(40px, -50px) rotate(15deg);
                    }

                    66% {
                        transform: translate(-20px, 30px) rotate(-10deg);
                    }

                    100% {
                        transform: translate(0, 0) rotate(0deg);
                    }

                }

                @keyframes droneHover2 {

                    0% {
                        transform: translate(0, 0) rotate(0deg) scale(1);
                    }

                    50% {
                        transform: translate(-60px, -40px) rotate(20deg) scale(1.1);
                    }

                    100% {
                        transform: translate(0, 0) rotate(0deg) scale(1);
                    }

                }

            `}</style>


            <Container
                maxWidth="xl"
                sx={{
                    position: "relative",
                    zIndex: 1,
                    pt: 4
                }}
            >

                {/* Header Banner */}

                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mb: 4,
                        pb: 2.5,
                        borderBottom:
                            "1px solid rgba(255,255,255,0.08)"
                    }}
                >

                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2
                        }}
                    >

                        <Box
                            sx={{
                                fontSize: 42,
                                lineHeight: 1,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 56,
                                height: 56,
                                flexShrink: 0
                            }}
                        >
                            ✨
                        </Box>

                        <Box>

                            <Typography
                                variant="h4"
                                sx={{
                                    fontWeight: 800,
                                    letterSpacing: "-0.5px",
                                    color: "#f8fafc"
                                }}
                            >
                                Video Intelligence Platform
                            </Typography>

                            <Typography
                                variant="body2"
                                sx={{
                                    color: "#94a3b8",
                                    mt: 0.5
                                }}
                            >
                                AI-powered real-time media analysis & workspace
                            </Typography>

                        </Box>

                    </Box>


                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2
                        }}
                    >

                        <Chip
                            label="v2.0 Active"
                            variant="outlined"
                            sx={{
                                color: "#14b8a6",
                                borderColor:
                                    "rgba(20, 184, 166, 0.4)",
                                fontWeight: 600,
                                display: {
                                    xs: "none",
                                    sm: "flex"
                                }
                            }}
                        />

                        <Button
                            variant="outlined"
                            startIcon={
                                <LogoutRoundedIcon />
                            }
                            onClick={handleLogout}
                            sx={{
                                color: "#f8fafc",
                                borderColor:
                                    "rgba(20, 184, 166, 0.3)",
                                backdropFilter: "blur(10px)",
                                background:
                                    "rgba(4, 47, 46, 0.4)",
                                fontWeight: 600,
                                borderRadius: 2,
                                px: 2.5,
                                py: 1,
                                transition:
                                    "all 0.2s ease-in-out",

                                "&:hover": {
                                    borderColor:
                                        "#14B8A6",
                                    background:
                                        "rgba(20, 184, 166, 0.15)",
                                    boxShadow:
                                        "0 0 20px rgba(20, 184, 166, 0.25)",
                                    transform:
                                        "translateY(-1px)"
                                }
                            }}
                        >
                            Logout
                        </Button>

                    </Box>

                </Box>


                {/* Section 1: Video Player & Chat */}

                <Grid
                    container
                    spacing={3}
                    sx={{ mb: 4 }}
                >

                    <Grid size={{ xs: 12, lg: 8 }}>

                        <Paper
                            elevation={0}
                            sx={{
                                ...cardGlassStyle,
                                height: 650,
                                p: 2,
                                overflow: "hidden",
                                display: "flex",
                                flexDirection: "column"
                            }}
                        >

                            <VideoPlayer />

                        </Paper>

                    </Grid>


                    <Grid size={{ xs: 12, lg: 4 }}>

                        <Paper
                            elevation={0}
                            sx={{
                                ...cardGlassStyle,
                                height: 650,
                                overflow: "hidden",
                                display: "flex",
                                flexDirection: "column"
                            }}
                        >

                            <Box
                                sx={{
                                    flexGrow: 1,
                                    overflow: "hidden",
                                    height: "100%"
                                }}
                            >

                                <Chat />

                            </Box>

                        </Paper>

                    </Grid>

                </Grid>


                {/* Section 2: Media Library */}

                <Box sx={{ mb: 3 }}>

                    <Paper
                        elevation={0}
                        sx={{
                            ...cardGlassStyle,
                            p: 3,
                            transition:
                                "border-color 0.3s ease",

                            "&:hover": {
                                borderColor:
                                    "rgba(20, 184, 166, 0.55)"
                            }
                        }}
                    >

                        <VideoLibrary />

                    </Paper>

                </Box>


                {/* Section 2.5: YouTube Downloader */}

                <Box sx={{ mb: 4 }}>

                    <Paper
                        elevation={0}
                        sx={{
                            ...cardGlassStyle,
                            p: 3,
                            transition:
                                "border-color 0.3s ease",

                            "&:hover": {
                                borderColor:
                                    "rgba(20, 184, 166, 0.45)"
                            }
                        }}
                    >

                        <YouTubeDownloader />

                    </Paper>

                </Box>


                {/* Section 3: AI Intelligence Tools */}

                <Grid
                    container
                    spacing={3}
                >

                    {/* AI Summary */}

                    <Grid
                        size={{
                            xs: 12,
                            md: 4
                        }}
                    >

                        <Paper
                            elevation={0}
                            sx={{
                                ...cardGlassStyle,
                                p: 4,
                                minHeight: 300,
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                transition: ".3s",

                                "&:hover": {
                                    transform:
                                        "translateY(-6px)",
                                    borderColor:
                                        "#14B8A6",
                                    boxShadow:
                                        "0 24px 48px rgba(20,184,166,.22)"
                                }
                            }}
                        >

                            <Box>

                                <DescriptionRoundedIcon
                                    sx={{
                                        fontSize: 52,
                                        color: "#14B8A6",
                                        mb: 2
                                    }}
                                />

                                <Typography
                                    variant="h5"
                                    sx={{
                                        fontWeight: 700,
                                        color: "#F8FAFC",
                                        mb: 1
                                    }}
                                >
                                    AI Summary
                                </Typography>

                                <Typography
                                    sx={{
                                        color: "#94A3B8",
                                        lineHeight: 1.8
                                    }}
                                >
                                    Generate detailed AI summaries from one or multiple processed videos.
                                </Typography>

                            </Box>


                            <Button
                                fullWidth
                                variant="contained"
                                endIcon={
                                    <ArrowForwardRoundedIcon />
                                }
                                onClick={() =>
                                    navigate("/summary")
                                }
                                sx={{
                                    mt: 4,
                                    borderRadius: 2,
                                    bgcolor: "#14B8A6",
                                    color: "#021617",
                                    fontWeight: 700,

                                    "&:hover": {
                                        bgcolor: "#10B981"
                                    }
                                }}
                            >
                                Summary
                            </Button>

                        </Paper>

                    </Grid>


                    {/* AI Notes */}

                    <Grid
                        size={{
                            xs: 12,
                            md: 4
                        }}
                    >

                        <Paper
                            elevation={0}
                            sx={{
                                ...cardGlassStyle,
                                p: 4,
                                minHeight: 300,
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                transition: ".3s",

                                "&:hover": {
                                    transform:
                                        "translateY(-6px)",
                                    borderColor:
                                        "#14B8A6",
                                    boxShadow:
                                        "0 24px 48px rgba(20,184,166,.22)"
                                }
                            }}
                        >

                            <Box>

                                <NotesRoundedIcon
                                    sx={{
                                        fontSize: 52,
                                        color: "#14B8A6",
                                        mb: 2
                                    }}
                                />

                                <Typography
                                    variant="h5"
                                    sx={{
                                        fontWeight: 700,
                                        color: "#F8FAFC",
                                        mb: 1
                                    }}
                                >
                                    AI Notes
                                </Typography>

                                <Typography
                                    sx={{
                                        color: "#94A3B8",
                                        lineHeight: 1.8
                                    }}
                                >
                                    Produce clean study notes from one or more videos with AI.
                                </Typography>

                            </Box>


                            <Button
                                fullWidth
                                variant="contained"
                                endIcon={
                                    <ArrowForwardRoundedIcon />
                                }
                                onClick={() =>
                                    navigate("/notes")
                                }
                                sx={{
                                    mt: 4,
                                    borderRadius: 2,
                                    bgcolor: "#14B8A6",
                                    color: "#021617",
                                    fontWeight: 700,

                                    "&:hover": {
                                        bgcolor: "#10B981"
                                    }
                                }}
                            >
                                Notes
                            </Button>

                        </Paper>

                    </Grid>


                    {/* AI Quiz */}

                    <Grid
                        size={{
                            xs: 12,
                            md: 4
                        }}
                    >

                        <Paper
                            elevation={0}
                            sx={{
                                ...cardGlassStyle,
                                p: 4,
                                minHeight: 300,
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                transition: ".3s",

                                "&:hover": {
                                    transform:
                                        "translateY(-6px)",
                                    borderColor:
                                        "#14B8A6",
                                    boxShadow:
                                        "0 24px 48px rgba(20,184,166,.22)"
                                }
                            }}
                        >

                            <Box>

                                <QuizRoundedIcon
                                    sx={{
                                        fontSize: 52,
                                        color: "#14B8A6",
                                        mb: 2
                                    }}
                                />

                                <Typography
                                    variant="h5"
                                    sx={{
                                        fontWeight: 700,
                                        color: "#F8FAFC",
                                        mb: 1
                                    }}
                                >
                                    AI Quiz
                                </Typography>

                                <Typography
                                    sx={{
                                        color: "#94A3B8",
                                        lineHeight: 1.8
                                    }}
                                >
                                    Generate interactive quizzes from processed videos to test your understanding.
                                </Typography>

                            </Box>


                            <Button
                                fullWidth
                                variant="contained"
                                endIcon={
                                    <ArrowForwardRoundedIcon />
                                }
                                onClick={() =>
                                    navigate("/quiz")
                                }
                                sx={{
                                    mt: 4,
                                    borderRadius: 2,
                                    bgcolor: "#14B8A6",
                                    color: "#021617",
                                    fontWeight: 700,

                                    "&:hover": {
                                        bgcolor: "#10B981"
                                    }
                                }}
                            >
                                Quiz
                            </Button>

                        </Paper>

                    </Grid>

                </Grid>

            </Container>

        </Box>

    );

}