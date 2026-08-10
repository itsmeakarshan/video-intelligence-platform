import { useEffect, useRef, useState, type SyntheticEvent } from "react";

import {
    Box,
    CircularProgress,
    IconButton,
    Slider,
    Stack,
    Typography,
    Tooltip,
    List,
    ListItemButton,
    ListItemText
} from "@mui/material";

import MovieIcon from "@mui/icons-material/Movie";
import Replay10Icon from "@mui/icons-material/Replay10";
import Forward10Icon from "@mui/icons-material/Forward10";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import VolumeOffRoundedIcon from "@mui/icons-material/VolumeOffRounded";
import FullscreenRoundedIcon from "@mui/icons-material/FullscreenRounded";
import FullscreenExitRoundedIcon from "@mui/icons-material/FullscreenExitRounded";
import SpeedIcon from "@mui/icons-material/Speed";
import CheckIcon from "@mui/icons-material/Check";

import { useVideo } from "../../context/VideoContext";

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

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
    const [muted, setMuted] = useState(false);
    const [prevVolume, setPrevVolume] = useState(100);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);

    const hideTimer = useRef<number | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    function skip(seconds: number) {
        if (!playerRef.current) return;

        playerRef.current.currentTime += seconds;
    }

    function togglePlay() {
        if (!playerRef.current) return;

        if (playerRef.current.paused) {
            playerRef.current.play().catch((err) => {
                console.error("Error playing video:", err);
            });
        } else {
            playerRef.current.pause();
        }
    }

    function handleProgress(
        _: Event | SyntheticEvent,
        value: number | number[]
    ) {
        if (!playerRef.current) return;

        playerRef.current.currentTime = value as number;
    }

    function handleVolume(
        _: Event | SyntheticEvent,
        value: number | number[]
    ) {
        if (!playerRef.current) return;

        const v = value as number;

        setVolume(v);
        playerRef.current.volume = v / 100;
        setMuted(v === 0);
    }

    function toggleMute() {
        if (!playerRef.current) return;

        if (muted) {
            setMuted(false);
            setVolume(prevVolume);
            playerRef.current.volume = prevVolume / 100;
        } else {
            setPrevVolume(volume);
            setMuted(true);
            setVolume(0);
            playerRef.current.volume = 0;
        }
    }

    function changePlaybackRate(rate: number) {
        if (!playerRef.current) return;

        const video = playerRef.current;

        /*
         * Set the native HTML5 video playbackRate directly.
         * This works independently of fullscreen mode.
         */
        video.playbackRate = rate;

        /*
         * Store the selected rate in React state so
         * the button label and selected option update.
         */
        setPlaybackRate(rate);

        /*
         * Close the speed menu after selecting a speed.
         */
        setShowSpeedMenu(false);
    }

    function toggleSpeedMenu() {
        setShowSpeedMenu((prev) => !prev);
    }

    function toggleFullscreen() {
        if (!containerRef.current) return;

        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch((err) => {
                console.error("Error attempting fullscreen:", err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    useEffect(() => {
        function handleFullscreenChange() {
            setIsFullscreen(!!document.fullscreenElement);

            /*
             * Keep the speed menu closed whenever fullscreen
             * state changes to avoid stale positioning.
             */
            setShowSpeedMenu(false);
        }

        document.addEventListener(
            "fullscreenchange",
            handleFullscreenChange
        );

        return () => {
            document.removeEventListener(
                "fullscreenchange",
                handleFullscreenChange
            );
        };
    }, []);

    function formatTime(seconds: number) {
        if (!seconds || isNaN(seconds)) return "00:00";

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
            if (playing) {
                setShowControls(false);
                setShowSpeedMenu(false);
            }
        }, 3000);
    }

    /*
     * Keep the video element state and React state synchronized.
     */
    useEffect(() => {
        if (!playerRef.current) return;

        const video = playerRef.current;

        const update = () => {
            setPlaying(!video.paused);
            setCurrentTime(video.currentTime);
            setDuration(video.duration || 0);
            setPlaybackRate(video.playbackRate);
        };

        video.addEventListener("timeupdate", update);
        video.addEventListener("play", update);
        video.addEventListener("pause", update);
        video.addEventListener("loadedmetadata", update);
        video.addEventListener("ratechange", update);

        /*
         * Make sure the current playback rate is restored
         * whenever the video element is ready.
         */
        video.playbackRate = playbackRate;

        update();

        return () => {
            video.removeEventListener("timeupdate", update);
            video.removeEventListener("play", update);
            video.removeEventListener("pause", update);
            video.removeEventListener("loadedmetadata", update);
            video.removeEventListener("ratechange", update);
        };
    }, [videoUrl]);

    /*
     * Keyboard shortcuts.
     */
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (
                ["input", "textarea"].includes(
                    (e.target as HTMLElement).tagName.toLowerCase()
                )
            ) {
                return;
            }

            switch (e.key) {
                case " ":
                case "k":
                    e.preventDefault();
                    togglePlay();
                    break;

                case "ArrowLeft":
                case "j":
                    skip(-10);
                    break;

                case "ArrowRight":
                case "l":
                    skip(10);
                    break;

                case "f":
                case "F":
                    toggleFullscreen();
                    break;

                case "m":
                case "M":
                    toggleMute();
                    break;
            }
        }

        window.addEventListener("keydown", onKey);

        return () => {
            window.removeEventListener("keydown", onKey);
        };
    }, [playing, volume, muted]);

    /*
     * Close speed menu when clicking outside the player.
     */
    useEffect(() => {
        function handleDocumentClick(event: MouseEvent) {
            if (!containerRef.current) return;

            const target = event.target as Node;

            if (
                !containerRef.current.contains(target)
            ) {
                setShowSpeedMenu(false);
            }
        }

        document.addEventListener(
            "mousedown",
            handleDocumentClick
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleDocumentClick
            );
        };
    }, []);

    /*
     * Clean up timeout when component unmounts.
     */
    useEffect(() => {
        return () => {
            if (hideTimer.current) {
                clearTimeout(hideTimer.current);
            }
        };
    }, []);

    if (processing) {
        return (
            <Box
                sx={{
                    height: 600,
                    width: "100%",
                    borderRadius: 3,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    background: "rgba(15, 23, 42, 0.6)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(20, 184, 166, 0.15)",
                    color: "#f8fafc"
                }}
            >
                <CircularProgress
                    size={70}
                    sx={{
                        color: "#14b8a6",
                        mb: 3
                    }}
                />

                <Typography
                    variant="h5"
                    sx={{ fontWeight: 700 }}
                >
                    Processing Video...
                </Typography>

                <Typography
                    sx={{
                        mt: 1,
                        opacity: 0.7,
                        fontSize: 14
                    }}
                >
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
                    width: "100%",
                    borderRadius: 3,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    background: "rgba(15, 23, 42, 0.4)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    color: "#f8fafc"
                }}
            >
                <MovieIcon
                    sx={{
                        fontSize: 80,
                        opacity: 0.5,
                        mb: 2,
                        color: "#14b8a6"
                    }}
                />

                <Typography
                    variant="h5"
                    sx={{ fontWeight: 700 }}
                >
                    No Video Selected
                </Typography>

                <Typography
                    sx={{
                        mt: 1,
                        opacity: 0.6,
                        fontSize: 14
                    }}
                >
                    Upload or choose a video from your library to start learning.
                </Typography>
            </Box>
        );
    }

    return (
        <Box
            ref={containerRef}
            onMouseMove={showOverlay}
            onMouseLeave={() => {
                if (playing) {
                    setShowControls(false);
                    setShowSpeedMenu(false);
                }
            }}
            sx={{
                position: "relative",
                width: "100%",
                height: isFullscreen ? "100vh" : "620px",
                maxHeight: isFullscreen ? "100vh" : "620px",
                overflow: "hidden",
                borderRadius: isFullscreen ? 0 : 3,
                background: "#000",
                boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
                border: isFullscreen
                    ? "none"
                    : "1px solid rgba(20, 184, 166, 0.2)",
                cursor: showControls ? "default" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
            }}
        >
            <video
                ref={playerRef}
                src={videoUrl}
                onClick={togglePlay}
                onDoubleClick={toggleFullscreen}
                style={{
                    width: "100%",
                    height: "100%",
                    display: "block",
                    objectFit: "contain",
                    background: "#000"
                }}
            />

            {/* Overlay Container */}
            <Box
                sx={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    opacity: showControls ? 1 : 0,
                    transition: "opacity 0.3s ease-in-out",
                    pointerEvents: showControls ? "auto" : "none",
                    background:
                        "linear-gradient(to bottom, rgba(3,7,18,0.75) 0%, transparent 20%, transparent 75%, rgba(3,7,18,0.9) 100%)"
                }}
            >
                {/* Top Header Bar */}
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        px: 4,
                        py: 3
                    }}
                >
                    <Typography
                        sx={{
                            color: "#FFF",
                            fontWeight: 700,
                            fontSize: 22,
                            textShadow:
                                "0 2px 4px rgba(0,0,0,0.6)"
                        }}
                    >
                        🎬 {videoTitle || "Current Video"}
                    </Typography>

                    <Box
                        sx={{
                            px: 3,
                            py: 1,
                            borderRadius: 4,
                            bgcolor:
                                "rgba(20, 184, 166, 0.2)",
                            border:
                                "1px solid rgba(20, 184, 166, 0.4)",
                            backdropFilter: "blur(8px)"
                        }}
                    >
                        <Typography
                            sx={{
                                color: "#14b8a6",
                                fontSize: 14,
                                fontWeight: 700,
                                letterSpacing: 0.5
                            }}
                        >
                            AI PLAYER
                        </Typography>
                    </Box>
                </Box>

                {/* Center Big Play Button */}
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
                            width: 100,
                            height: 100,
                            bgcolor:
                                "rgba(20, 184, 166, 0.25)",
                            backdropFilter: "blur(16px)",
                            border:
                                "1px solid rgba(20, 184, 166, 0.5)",
                            color: "#FFF",
                            transition:
                                "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                            "&:hover": {
                                bgcolor:
                                    "rgba(20, 184, 166, 0.45)",
                                transform: "scale(1.1)"
                            }
                        }}
                    >
                        {playing ? (
                            <PauseRoundedIcon
                                sx={{ fontSize: 52 }}
                            />
                        ) : (
                            <PlayArrowRoundedIcon
                                sx={{
                                    fontSize: 52,
                                    ml: 0.5
                                }}
                            />
                        )}
                    </IconButton>
                </Box>

                {/* Bottom Control Bar */}
                <Box
                    sx={{
                        px: 3,
                        pb: 2.5,
                        display: "flex",
                        flexDirection: "column"
                    }}
                >
                    {/* Progress Slider */}
                    <Slider
                        min={0}
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleProgress}
                        size="small"
                        sx={{
                            color: "#14b8a6",
                            height: 7,
                            mb: 2,

                            "& .MuiSlider-thumb": {
                                width: 18,
                                height: 18,
                                transition:
                                    "transform 0.1s ease",

                                "&:hover, &.Mui-focusVisible": {
                                    boxShadow:
                                        "0px 0px 0px 8px rgba(20, 184, 166, 0.3)",
                                    transform: "scale(1.25)"
                                }
                            },

                            "& .MuiSlider-rail": {
                                opacity: 0.4,
                                backgroundColor: "#94a3b8"
                            }
                        }}
                    />

                    {/* Button Controls Row */}
                    <Stack
                        direction="row"
                        alignItems="center"
                        sx={{
                            width: "100%"
                        }}
                    >
                        {/* Left Side */}
                        <Stack
                            direction="row"
                            spacing={2}
                            alignItems="center"
                            sx={{
                                flex: 1,
                                justifyContent: "flex-start"
                            }}
                        >
                            {/* Volume */}
                            <Stack
                                direction="row"
                                spacing={1.5}
                                alignItems="center"
                                sx={{
                                    "&:hover .volume-slider": {
                                        width: 110,
                                        opacity: 1,
                                        ml: 1.5
                                    }
                                }}
                            >
                                <IconButton
                                    onClick={toggleMute}
                                    sx={{
                                        color: "#FFF",
                                        p: 1.5,
                                        "&:hover": {
                                            bgcolor:
                                                "rgba(255,255,255,0.12)"
                                        }
                                    }}
                                >
                                    {muted || volume === 0 ? (
                                        <VolumeOffRoundedIcon
                                            sx={{ fontSize: 32 }}
                                        />
                                    ) : (
                                        <VolumeUpRoundedIcon
                                            sx={{ fontSize: 32 }}
                                        />
                                    )}
                                </IconButton>

                                <Box
                                    className="volume-slider"
                                    sx={{
                                        width: 0,
                                        opacity: 0,
                                        overflow: "hidden",
                                        transition:
                                            "all 0.25s ease-in-out",
                                        display: "flex",
                                        alignItems: "center"
                                    }}
                                >
                                    <Slider
                                        value={
                                            muted ? 0 : volume
                                        }
                                        onChange={handleVolume}
                                        size="small"
                                        sx={{
                                            width: 100,
                                            color: "#14b8a6",
                                            "& .MuiSlider-thumb":
                                                {
                                                    width: 14,
                                                    height: 14
                                                }
                                        }}
                                    />
                                </Box>
                            </Stack>

                            <Typography
                                sx={{
                                    color: "#94a3b8",
                                    ml: 1,
                                    fontSize: 17,
                                    fontWeight: 500,
                                    userSelect: "none"
                                }}
                            >
                                <Box
                                    component="span"
                                    sx={{
                                        color: "#fff",
                                        fontWeight: 600
                                    }}
                                >
                                    {formatTime(currentTime)}
                                </Box>{" "}
                                / {formatTime(duration)}
                            </Typography>
                        </Stack>

                        {/* Center Controls */}
                        <Stack
                            direction="row"
                            spacing={1.5}
                            alignItems="center"
                            sx={{
                                flex: 1,
                                justifyContent: "center"
                            }}
                        >
                            <Tooltip
                                title="Rewind 10s (j)"
                                arrow
                            >
                                <IconButton
                                    onClick={() => skip(-10)}
                                    sx={{
                                        color: "#FFF",
                                        p: 1.5,
                                        "&:hover": {
                                            bgcolor:
                                                "rgba(255,255,255,0.12)"
                                        }
                                    }}
                                >
                                    <Replay10Icon
                                        sx={{ fontSize: 32 }}
                                    />
                                </IconButton>
                            </Tooltip>

                            <Tooltip
                                title={
                                    playing
                                        ? "Pause (k)"
                                        : "Play (k)"
                                }
                                arrow
                            >
                                <IconButton
                                    onClick={togglePlay}
                                    sx={{
                                        color: "#FFF",
                                        p: 1.5,
                                        bgcolor:
                                            "rgba(20, 184, 166, 0.3)",
                                        "&:hover": {
                                            bgcolor:
                                                "rgba(20, 184, 166, 0.5)"
                                        }
                                    }}
                                >
                                    {playing ? (
                                        <PauseRoundedIcon
                                            sx={{ fontSize: 34 }}
                                        />
                                    ) : (
                                        <PlayArrowRoundedIcon
                                            sx={{ fontSize: 34 }}
                                        />
                                    )}
                                </IconButton>
                            </Tooltip>

                            <Tooltip
                                title="Forward 10s (l)"
                                arrow
                            >
                                <IconButton
                                    onClick={() => skip(10)}
                                    sx={{
                                        color: "#FFF",
                                        p: 1.5,
                                        "&:hover": {
                                            bgcolor:
                                                "rgba(255,255,255,0.12)"
                                        }
                                    }}
                                >
                                    <Forward10Icon
                                        sx={{ fontSize: 32 }}
                                    />
                                </IconButton>
                            </Tooltip>
                        </Stack>

                        {/* Right Side */}
                        <Stack
                            direction="row"
                            spacing={1.5}
                            alignItems="center"
                            sx={{
                                flex: 1,
                                justifyContent: "flex-end"
                            }}
                        >
                            {/* Playback Speed */}
                            <Box
                                sx={{
                                    position: "relative"
                                }}
                            >
                                <Tooltip
                                    title="Playback Speed"
                                    arrow
                                >
                                    <IconButton
                                        onClick={toggleSpeedMenu}
                                        sx={{
                                            color: "#FFF",
                                            p: 1,
                                            gap: 0.6,
                                            borderRadius: 2,
                                            bgcolor:
                                                "rgba(15, 23, 42, 0.5)",
                                            border:
                                                "1px solid rgba(20, 184, 166, 0.3)",
                                            "&:hover": {
                                                bgcolor:
                                                    "rgba(20, 184, 166, 0.2)"
                                            }
                                        }}
                                    >
                                        <SpeedIcon
                                            sx={{
                                                fontSize: 22,
                                                color: "#14b8a6"
                                            }}
                                        />

                                        <Typography
                                            sx={{
                                                fontSize: 13,
                                                fontWeight: 700,
                                                color: "#ffffff",
                                                pr: 0.5
                                            }}
                                        >
                                            {playbackRate === 1
                                                ? "1x"
                                                : `${playbackRate}x`}
                                        </Typography>
                                    </IconButton>
                                </Tooltip>

                                {/* 
                                    Speed menu is rendered directly inside
                                    the player instead of using MUI Popover.
                                    This fixes positioning and interaction
                                    in normal and fullscreen modes.
                                */}
                                {showSpeedMenu && (
                                    <Box
                                        sx={{
                                            position: "absolute",
                                            bottom: "calc(100% + 12px)",
                                            right: 0,
                                            width: 140,
                                            bgcolor: "#0f172a",
                                            border:
                                                "1px solid rgba(20, 184, 166, 0.4)",
                                            color: "#ffffff",
                                            borderRadius: 2,
                                            boxShadow:
                                                "0 10px 25px rgba(0,0,0,0.8)",
                                            overflow: "hidden",
                                            zIndex: 1000
                                        }}
                                    >
                                        <List
                                            dense
                                            sx={{ py: 0.5 }}
                                        >
                                            {PLAYBACK_SPEEDS.map(
                                                (rate) => {
                                                    const isSelected =
                                                        rate ===
                                                        playbackRate;

                                                    return (
                                                        <ListItemButton
                                                            key={rate}
                                                            onClick={() =>
                                                                changePlaybackRate(
                                                                    rate
                                                                )
                                                            }
                                                            sx={{
                                                                py: 1,
                                                                px: 2,
                                                                bgcolor:
                                                                    isSelected
                                                                        ? "rgba(20, 184, 166, 0.25)"
                                                                        : "transparent",

                                                                "&:hover":
                                                                    {
                                                                        bgcolor:
                                                                            "rgba(20, 184, 166, 0.35)"
                                                                    }
                                                            }}
                                                        >
                                                            <Box
                                                                sx={{
                                                                    width: 18,
                                                                    display:
                                                                        "flex",
                                                                    alignItems:
                                                                        "center"
                                                                }}
                                                            >
                                                                {isSelected && (
                                                                    <CheckIcon
                                                                        sx={{
                                                                            fontSize: 14,
                                                                            color: "#14b8a6"
                                                                        }}
                                                                    />
                                                                )}
                                                            </Box>

                                                            <ListItemText
                                                                primary={
                                                                    rate ===
                                                                    1
                                                                        ? "Normal"
                                                                        : `${rate}x`
                                                                }
                                                                primaryTypographyProps={{
                                                                    sx: {
                                                                        fontSize: 13,
                                                                        fontWeight:
                                                                            isSelected
                                                                                ? 700
                                                                                : 400,
                                                                        color:
                                                                            isSelected
                                                                                ? "#14b8a6"
                                                                                : "#ffffff"
                                                                    }
                                                                }}
                                                            />
                                                        </ListItemButton>
                                                    );
                                                }
                                            )}
                                        </List>
                                    </Box>
                                )}
                            </Box>

                            {/* Fullscreen */}
                            <Tooltip
                                title={
                                    isFullscreen
                                        ? "Exit Fullscreen (f)"
                                        : "Fullscreen (f)"
                                }
                                arrow
                            >
                                <IconButton
                                    onClick={toggleFullscreen}
                                    sx={{
                                        color: "#FFF",
                                        p: 1.5,
                                        "&:hover": {
                                            bgcolor:
                                                "rgba(255,255,255,0.12)"
                                        }
                                    }}
                                >
                                    {isFullscreen ? (
                                        <FullscreenExitRoundedIcon
                                            sx={{
                                                fontSize: 34
                                            }}
                                        />
                                    ) : (
                                        <FullscreenRoundedIcon
                                            sx={{
                                                fontSize: 34
                                            }}
                                        />
                                    )}
                                </IconButton>
                            </Tooltip>
                        </Stack>
                    </Stack>
                </Box>
            </Box>
        </Box>
    );
}