import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import {
    Box,
    CircularProgress,
    IconButton,
    Slider,
    Stack,
    Typography
} from "@mui/material";
import MovieIcon from "@mui/icons-material/Movie";
import Replay5Icon from "@mui/icons-material/Replay5";
import Replay10Icon from "@mui/icons-material/Replay10";
import Forward5Icon from "@mui/icons-material/Forward5";
import Forward10Icon from "@mui/icons-material/Forward10";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import FullscreenRoundedIcon from "@mui/icons-material/FullscreenRounded";
import { useVideo } from "../../context/VideoContext";

export default function VideoPlayer() {
    const {
        videoUrl,
        videoTitle,
        processing,
        playerRef
    } = useVideo();

    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(100);
    const [showControls, setShowControls] = useState(true);

    const hideTimer = useRef<number | null>(null);

    function skip(seconds: number) {
        if (!playerRef.current) return;
        playerRef.current.currentTime += seconds;
    }

    function togglePlay() {
        if (!playerRef.current) return;
        if (playerRef.current.paused) {
            playerRef.current.play();
        } else {
            playerRef.current.pause();
        }
    }

    function handleProgress(_: Event | SyntheticEvent, value: number | number[]) {
        if (!playerRef.current) return;
        playerRef.current.currentTime = value as number;
    }

    function handleVolume(_: Event | SyntheticEvent, value: number | number[]) {
        if (!playerRef.current) return;
        const v = value as number;
        setVolume(v);
        playerRef.current.volume = v / 100;
    }

    function fullscreen() {
        playerRef.current?.requestFullscreen();
    }

    function formatTime(seconds: number) {
        if (!seconds) return "00:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    }

    function showOverlay() {
        setShowControls(true);
        if (hideTimer.current) {
            clearTimeout(hideTimer.current);
        }
        hideTimer.current = window.setTimeout(() => {
            setShowControls(false);
        }, 2500);
    }

    useEffect(() => {
        if (!playerRef.current) return;
        const video = playerRef.current;

        const update = () => {
            setPlaying(!video.paused);
            setCurrentTime(video.currentTime);
            setDuration(video.duration || 0);
        };

        video.addEventListener("timeupdate", update);
        video.addEventListener("play", update);
        video.addEventListener("pause", update);
        video.addEventListener("loadedmetadata", update);

        return () => {
            video.removeEventListener("timeupdate", update);
            video.removeEventListener("play", update);
            video.removeEventListener("pause", update);
            video.removeEventListener("loadedmetadata", update);
        };
    }, [videoUrl]);

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            switch (e.key) {
                case " ":
                    e.preventDefault();
                    togglePlay();
                    break;
                case "ArrowLeft":
                    skip(-5);
                    break;
                case "ArrowRight":
                    skip(5);
                    break;
                case "f":
                case "F":
                    fullscreen();
                    break;
            }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    if (processing) {
        return (
            <Box
                sx={{
                    height: 600,
                    borderRadius: 2,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    background: "transparent", // Made transparent to let Dashboard glass show
                    color: "#f8fafc"
                }}
            >
                <CircularProgress
                    size={70}
                    sx={{
                        color: "#14b8a6", // Teal color
                        mb: 3
                    }}
                />
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    Processing Video...
                </Typography>
                <Typography sx={{ mt: 1, opacity: .8 }}>
                    Generating transcript and AI knowledge...
                </Typography>
            </Box>
        );
    }

    if (!videoUrl) {
        return (
            <Box
                sx={{
                    height: 600,
                    borderRadius: 2,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    background: "transparent", // Made transparent to let Dashboard glass show
                    color: "#f8fafc"
                }}
            >
                <MovieIcon
                    sx={{
                        fontSize: 90,
                        opacity: .6,
                        mb: 2,
                        color: "#14b8a6" // Teal color icon
                    }}
                />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    No Video Selected
                </Typography>
                <Typography sx={{ mt: 2, opacity: .75 }}>
                    Upload or choose a video from your library.
                </Typography>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                position: "relative",
                overflow: "hidden",
                borderRadius: 2, // Adjusted curve
                background: "#000",
                boxShadow: "0 25px 70px rgba(0,0,0,.25)"
            }}
        >
            <video
                ref={playerRef}
                src={videoUrl}
                onClick={togglePlay}
                onMouseMove={showOverlay}
                onDoubleClick={fullscreen}
                style={{
                    width: "100%",
                    height: "620px",
                    display: "block",
                    objectFit: "contain",
                    background: "#000"
                }}
            />

            <Box
                sx={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    opacity: showControls ? 1 : 0,
                    transition: ".25s"
                }}
            >
                {/* Top */}
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        px: 3,
                        py: 2,
                        background: "linear-gradient(to bottom,rgba(0,0,0,.75),transparent)"
                    }}
                >
                    <Typography sx={{ color: "#FFF", fontWeight: 700, fontSize: 20 }}>
                        🎬 {videoTitle || "Current Video"}
                    </Typography>
                    <Typography sx={{ color: "#FFF" }}>
                        AI Video Player
                    </Typography>
                </Box>

                {/* Center Play Button */}
                <Box
                    sx={{
                        flex: 1,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center"
                    }}
                >
                    <IconButton
                        onClick={togglePlay}
                        sx={{
                            width: 95,
                            height: 95,
                            bgcolor: "rgba(0,0,0,.45)",
                            backdropFilter: "blur(16px)",
                            color: "#FFF",
                            transition: ".25s",
                            "&:hover": {
                                bgcolor: "rgba(0,0,0,.65)",
                                transform: "scale(1.08)"
                            }
                        }}
                    >
                        {playing ? <PauseRoundedIcon sx={{ fontSize: 48 }} /> : <PlayArrowRoundedIcon sx={{ fontSize: 48 }} />}
                    </IconButton>
                </Box>

                {/* Bottom Controls */}
                <Box
                    sx={{
                        px: 3,
                        py: 2,
                        background: "linear-gradient(to top,rgba(0,0,0,.85),transparent)"
                    }}
                >
                    <Slider
                        min={0}
                        max={duration}
                        value={currentTime}
                        onChange={handleProgress}
                        size="small"
                        sx={{
                            color: "#14b8a6", // Teal Color
                            "& .MuiSlider-thumb": {
                                width: 14,
                                height: 14
                            }
                        }}
                    />
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <IconButton onClick={togglePlay} sx={{ color: "#FFF", "&:hover": { bgcolor: "rgba(255,255,255,.08)" } }}>
                                {playing ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
                            </IconButton>
                            <IconButton onClick={() => skip(-10)} sx={{ color: "#FFF" }}><Replay10Icon /></IconButton>
                            <IconButton onClick={() => skip(-5)} sx={{ color: "#FFF" }}><Replay5Icon /></IconButton>
                            <IconButton onClick={() => skip(5)} sx={{ color: "#FFF" }}><Forward5Icon /></IconButton>
                            <IconButton onClick={() => skip(10)} sx={{ color: "#FFF" }}><Forward10Icon /></IconButton>
                            <Typography sx={{ color: "#FFF", ml: 2, fontWeight: 600 }}>
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </Typography>
                        </Stack>

                        <Stack direction="row" spacing={2} alignItems="center">
                            <VolumeUpRoundedIcon sx={{ color: "#FFF" }} />
                            <Slider
                                value={volume}
                                onChange={handleVolume}
                                size="small"
                                sx={{ width: 120, color: "#14b8a6" }} // Teal Color
                            />
                            <IconButton onClick={fullscreen} sx={{ color: "#FFF", "&:hover": { bgcolor: "rgba(255,255,255,.08)" } }}>
                                <FullscreenRoundedIcon />
                            </IconButton>
                        </Stack>
                    </Stack>
                </Box>
            </Box>
        </Box>
    );
}