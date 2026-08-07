import { useState, useEffect, useRef } from "react";
import {
    Box,
    Grid,
    Paper,
    Typography,
    Container,
    Chip
} from "@mui/material";

import StarTrail from "./StarTrail";

import Chat from "../components/chat/Chat";
import VideoPlayer from "../components/video/VideoPlayer";
import VideoLibrary from "../components/video/VideoLibrary";
import Summary from "../components/ai/Summary";
import Notes from "../components/notes/Notes";
import Quiz from "../components/quiz/Quiz";

// --- Optimized Draggable Robot Component (60FPS GPU Accelerated) ---
function DraggableRobot({ defaultLeftPct, defaultTopPct, size, animationString, glowColor }: any) {
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
            containerRef.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
            containerRef.current.style.opacity = "1";
        }
    }, [defaultLeftPct, defaultTopPct]);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        setDragging(true);
        dragStart.current = {
            x: e.clientX - pos.current.x,
            y: e.clientY - pos.current.y
        };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragging) return;
        
        pos.current = {
            x: e.clientX - dragStart.current.x,
            y: e.clientY - dragStart.current.y
        };

        if (containerRef.current) {
            containerRef.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
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
                        filter: `drop-shadow(0 0 30px ${glowColor}) brightness(1.2)`
                    })
                }}
            />
        </Box>
    );
}

export default function Dashboard() {
    // Forces the window to scroll to the top immediately upon mounting
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

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
                background: "radial-gradient(circle at 50% 0%, #064e3b 0%, #020617 100%)", 
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
                    0% { transform: translate(0, 0) rotate(0deg); }
                    33% { transform: translate(40px, -50px) rotate(15deg); }
                    66% { transform: translate(-20px, 30px) rotate(-10deg); }
                    100% { transform: translate(0, 0) rotate(0deg); }
                }
                @keyframes droneHover2 {
                    0% { transform: translate(0, 0) rotate(0deg) scale(1); }
                    50% { transform: translate(-60px, -40px) rotate(20deg) scale(1.1); }
                    100% { transform: translate(0, 0) rotate(0deg) scale(1); }
                }
            `}</style>

            <Container maxWidth="xl" sx={{ position: "relative", zIndex: 1, pt: 4 }}>
                {/* Header Banner */}
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mb: 4,
                        pb: 2.5,
                        borderBottom: "1px solid rgba(255,255,255,0.08)"
                    }}
                >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Box
                            component="img"
                            src="/logo.png"
                            alt="App Logo"
                            sx={{
                                width: 56,
                                height: 56,
                                borderRadius: "50%",
                                boxShadow: "0 0 24px rgba(20, 184, 166, 0.45)"
                            }}
                        />
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.5px", color: "#f8fafc" }}>
                                Video Intelligence Platform
                            </Typography>
                            <Typography variant="body2" sx={{ color: "#94a3b8", mt: 0.5 }}>
                                AI-powered real-time media analysis & workspace
                            </Typography>
                        </Box>
                    </Box>
                    <Chip 
                        label="v2.0 Active" 
                        variant="outlined" 
                        sx={{ color: "#14b8a6", borderColor: "rgba(20, 184, 166, 0.4)", fontWeight: 600 }} 
                    />
                </Box>

                {/* Section 1: Video Player & Chat */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
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
                            <Box sx={{ flexGrow: 1, overflow: "hidden", height: "100%" }}>
                                <Chat />
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>

                {/* Section 2: Media Library */}
                <Box sx={{ mb: 4 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            ...cardGlassStyle,
                            p: 3,
                            transition: "border-color 0.3s ease",
                            "&:hover": {
                                borderColor: "rgba(20, 184, 166, 0.55)" 
                            }
                        }}
                    >
                        <VideoLibrary />
                    </Paper>
                </Box>

                {/* Section 3: AI Intelligence Tools */}
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                ...cardGlassStyle,
                                p: 3,
                                minHeight: 280,
                                transition: "all 0.3s ease",
                                "&:hover": {
                                    transform: "translateY(-4px)",
                                    boxShadow: "0 24px 48px rgba(20, 184, 166, 0.2)",
                                    borderColor: "rgba(20, 184, 166, 0.55)"
                                }
                            }}
                        >
                            <Summary />
                        </Paper>
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                ...cardGlassStyle,
                                p: 3,
                                minHeight: 280,
                                transition: "all 0.3s ease",
                                "&:hover": {
                                    transform: "translateY(-4px)",
                                    boxShadow: "0 24px 48px rgba(16, 185, 129, 0.2)",
                                    borderColor: "rgba(16, 185, 129, 0.55)"
                                }
                            }}
                        >
                            <Notes />
                        </Paper>
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                ...cardGlassStyle,
                                p: 3,
                                minHeight: 280,
                                transition: "all 0.3s ease",
                                "&:hover": {
                                    transform: "translateY(-4px)",
                                    boxShadow: "0 24px 48px rgba(20, 184, 166, 0.2)",
                                    borderColor: "rgba(20, 184, 166, 0.55)"
                                }
                            }}
                        >
                            <Quiz />
                        </Paper>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
}