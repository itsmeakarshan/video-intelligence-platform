import { useEffect, useRef, useState, type SyntheticEvent } from "react";

import {
    Box,
    IconButton,
    Slider,
    Stack,
    Typography,
    Tooltip,
    List,
    ListItemButton,
    ListItemText
} from "@mui/material";

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
import { Film, Sparkles, Loader2 } from "lucide-react";

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
            <div className="w-full h-[560px] bg-[#25272F] rounded-3xl border border-[#333642] p-8 text-center flex flex-col items-center justify-center shadow-xs space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-[#18191E] border border-[#333642] text-[#E5F842] flex items-center justify-center animate-pulse">
                    <Loader2 className="w-8 h-8 text-[#E5F842] animate-spin" />
                </div>
                <div>
                    <h3 className="text-xl font-extrabold text-white tracking-tight">
                        Processing Video Lesson...
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 max-w-sm mt-1 font-medium leading-relaxed">
                        Generating AI transcript, indexed chapters, and knowledge search index.
                    </p>
                </div>
            </div>
        );
    }

    if (!videoUrl) {
        return (
            <div className="w-full h-[560px] bg-[#25272F] rounded-3xl border-2 border-dashed border-[#333642] p-8 text-center flex flex-col items-center justify-center shadow-xs">
                <div className="w-16 h-16 rounded-3xl bg-[#18191E] border border-[#333642] text-[#E5F842] flex items-center justify-center mb-4 shadow-xs">
                    <Film className="w-8 h-8 text-[#E5F842]" />
                </div>
                <h3 className="text-xl font-extrabold text-white tracking-tight">
                    No Video Selected
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-sm mt-1.5 font-medium leading-relaxed">
                    Select a video lesson from the curriculum below to start watching and learning with AI.
                </p>
                <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#E5F842]/15 text-[#E5F842] text-xs font-extrabold border border-[#E5F842]/30 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-[#E5F842]" />
                    <span>Select any lesson to play</span>
                </div>
            </div>
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
                height: isFullscreen ? "100vh" : { xs: "480px", md: "520px", lg: "560px" },
                maxHeight: isFullscreen ? "100vh" : "560px",
                overflow: "hidden",
                borderRadius: isFullscreen ? 0 : "24px",
                background: "#0E0F12",
                boxShadow: "0 12px 36px rgba(0,0,0,0.6)",
                border: isFullscreen
                    ? "none"
                    : "1px solid #333642",
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
                    background: "#0E0F12"
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
                    transition: "opacity 0.25s ease-in-out",
                    pointerEvents: showControls ? "auto" : "none"
                }}
            >
                {/* Top Header Bar */}
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        px: 4,
                        py: 2.5,
                        background:
                            "linear-gradient(to bottom, rgba(14, 15, 18, 0.92) 0%, rgba(14, 15, 18, 0.4) 60%, transparent 100%)"
                    }}
                >
                    <Typography
                        sx={{
                            color: "#FFF",
                            fontWeight: 700,
                            fontSize: 18,
                            maxWidth: "75%",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            textShadow: "0 2px 4px rgba(0,0,0,0.6)"
                        }}
                    >
                        🎬 {videoTitle || "Current Lesson"}
                    </Typography>

                    <Box
                        sx={{
                            px: 2.5,
                            py: 0.6,
                            borderRadius: 3,
                            bgcolor: "rgba(229, 248, 66, 0.15)",
                            border: "1px solid rgba(229, 248, 66, 0.35)",
                            backdropFilter: "blur(8px)"
                        }}
                    >
                        <Typography
                            sx={{
                                color: "#E5F842",
                                fontSize: 12,
                                fontWeight: 800,
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
                            width: 84,
                            height: 84,
                            bgcolor: "rgba(229, 248, 66, 0.2)",
                            backdropFilter: "blur(14px)",
                            border: "1px solid rgba(229, 248, 66, 0.45)",
                            color: "#E5F842",
                            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                            "&:hover": {
                                bgcolor: "rgba(229, 248, 66, 0.35)",
                                transform: "scale(1.08)"
                            }
                        }}
                    >
                        {playing ? (
                            <PauseRoundedIcon
                                sx={{ fontSize: 44 }}
                            />
                        ) : (
                            <PlayArrowRoundedIcon
                                sx={{
                                    fontSize: 44,
                                    ml: 0.5
                                }}
                            />
                        )}
                    </IconButton>
                </Box>

                {/* Bottom Control Bar */}
                <Box
                    sx={{
                        px: 4,
                        pb: 3,
                        pt: 4,
                        display: "flex",
                        flexDirection: "column",
                        background:
                            "linear-gradient(to top, rgba(14, 15, 18, 0.98) 0%, rgba(14, 15, 18, 0.75) 50%, rgba(14, 15, 18, 0.2) 85%, transparent 100%)"
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
                            color: "#E5F842",
                            height: 4,
                            p: "6px 0",
                            mb: 1.5,
                            transition: "height 0.15s ease",
                            "&:hover": {
                                height: 6
                            },
                            "& .MuiSlider-thumb": {
                                width: 12,
                                height: 12,
                                backgroundColor: "#E5F842",
                                boxShadow: "none",
                                transition: "all 0.15s ease",
                                "&:hover, &.Mui-focusVisible, &.Mui-active": {
                                    boxShadow: "0 0 10px rgba(229, 248, 66, 0.8)",
                                    transform: "scale(1.3)"
                                }
                            },
                            "& .MuiSlider-track": {
                                border: "none",
                                backgroundColor: "#E5F842"
                            },
                            "& .MuiSlider-rail": {
                                opacity: 0.3,
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
                            spacing={1.5}
                            alignItems="center"
                            sx={{
                                flex: 1,
                                justifyContent: "flex-start"
                            }}
                        >
                            {/* Volume */}
                            <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                                sx={{
                                    "&:hover .volume-slider": {
                                        width: 100,
                                        opacity: 1,
                                        ml: 1
                                    }
                                }}
                            >
                                <IconButton
                                    onClick={toggleMute}
                                    sx={{
                                        color: "#FFF",
                                        p: 1,
                                        "&:hover": {
                                            bgcolor:
                                                "rgba(255,255,255,0.12)"
                                        }
                                    }}
                                >
                                    {muted || volume === 0 ? (
                                        <VolumeOffRoundedIcon
                                            sx={{ fontSize: 26 }}
                                        />
                                    ) : (
                                        <VolumeUpRoundedIcon
                                            sx={{ fontSize: 26 }}
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
                                            width: 90,
                                            color: "#E5F842",
                                            height: 4,
                                            "& .MuiSlider-thumb":
                                                {
                                                    width: 10,
                                                    height: 10,
                                                    boxShadow: "none"
                                                }
                                        }}
                                    />
                                </Box>
                            </Stack>

                            <Typography
                                sx={{
                                    color: "#94a3b8",
                                    ml: 0.5,
                                    fontSize: 13,
                                    fontFamily: "monospace",
                                    fontVariantNumeric: "tabular-nums",
                                    userSelect: "none"
                                }}
                            >
                                <Box
                                    component="span"
                                    sx={{
                                        color: "#fff",
                                        fontWeight: 700
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
                            spacing={1}
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
                                        p: 1,
                                        "&:hover": {
                                            bgcolor:
                                                "rgba(255,255,255,0.12)"
                                        }
                                    }}
                                >
                                    <Replay10Icon
                                        sx={{ fontSize: 24 }}
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
                                        color: "#121316",
                                        p: 1,
                                        bgcolor: "#E5F842",
                                        "&:hover": {
                                            bgcolor: "#D6EA35"
                                        }
                                    }}
                                >
                                    {playing ? (
                                        <PauseRoundedIcon
                                            sx={{ fontSize: 24 }}
                                        />
                                    ) : (
                                        <PlayArrowRoundedIcon
                                            sx={{ fontSize: 24 }}
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
                                        p: 1,
                                        "&:hover": {
                                            bgcolor:
                                                "rgba(255,255,255,0.12)"
                                        }
                                    }}
                                >
                                    <Forward10Icon
                                        sx={{ fontSize: 24 }}
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
                                            py: 0.6,
                                            px: 1.2,
                                            gap: 0.6,
                                            borderRadius: 2.5,
                                            bgcolor:
                                                "rgba(24, 25, 30, 0.85)",
                                            border:
                                                "1px solid #333642",
                                            "&:hover": {
                                                bgcolor:
                                                    "rgba(229, 248, 66, 0.15)",
                                                borderColor: "rgba(229, 248, 66, 0.4)"
                                            }
                                        }}
                                    >
                                        <SpeedIcon
                                            sx={{
                                                fontSize: 18,
                                                color: "#E5F842"
                                            }}
                                        />

                                        <Typography
                                            sx={{
                                                fontSize: 12,
                                                fontWeight: 800,
                                                color: "#ffffff"
                                            }}
                                        >
                                            {playbackRate === 1
                                                ? "1x"
                                                : `${playbackRate}x`}
                                        </Typography>
                                    </IconButton>
                                </Tooltip>

                                {showSpeedMenu && (
                                    <Box
                                        sx={{
                                            position: "absolute",
                                            bottom: "calc(100% + 12px)",
                                            right: 0,
                                            width: 140,
                                            bgcolor: "#25272F",
                                            border:
                                                "1px solid #333642",
                                            color: "#ffffff",
                                            borderRadius: 2.5,
                                            boxShadow:
                                                "0 12px 32px rgba(0,0,0,0.8)",
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
                                                                        ? "rgba(229, 248, 66, 0.2)"
                                                                        : "transparent",

                                                                "&:hover":
                                                                    {
                                                                        bgcolor:
                                                                            "rgba(229, 248, 66, 0.3)"
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
                                                                            color: "#E5F842"
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
                                                                                ? "#E5F842"
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
                                        p: 1,
                                        "&:hover": {
                                            bgcolor:
                                                "rgba(255,255,255,0.12)"
                                        }
                                    }}
                                >
                                    {isFullscreen ? (
                                        <FullscreenExitRoundedIcon
                                            sx={{
                                                fontSize: 26
                                            }}
                                        />
                                    ) : (
                                        <FullscreenRoundedIcon
                                            sx={{
                                                fontSize: 26
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