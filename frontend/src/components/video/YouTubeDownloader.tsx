import {
    Alert,
    Box,
    Button,
    CircularProgress,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography
} from "@mui/material";

import YouTubeIcon from "@mui/icons-material/YouTube";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";

import { useState } from "react";

import { downloadYouTubeVideo } from "../../api/api";


export default function YouTubeDownloader() {

    const [url, setUrl] = useState("");

    const [quality, setQuality] = useState("720");

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState("");

    const [success, setSuccess] = useState("");


    async function handleDownload() {

        setError("");
        setSuccess("");

        const trimmedUrl = url.trim();

        if (!trimmedUrl) {

            setError(
                "Please paste a YouTube video link."
            );

            return;
        }

        if (
            !trimmedUrl.includes("youtube.com/") &&
            !trimmedUrl.includes("youtu.be/")
        ) {

            setError(
                "Please enter a valid YouTube URL."
            );

            return;
        }

        setLoading(true);

        try {

            const result =
                await downloadYouTubeVideo(
                    trimmedUrl,
                    quality
                );

            setSuccess(
                result?.message ||
                "YouTube video downloaded successfully."
            );

            window.dispatchEvent(
                new Event("videosUpdated")
            );

            setUrl("");

        } catch (error: any) {

            setError(
                error?.message ||
                "Unable to download the YouTube video."
            );

        } finally {

            setLoading(false);

        }
    }


    return (

        <Box
            sx={{
                width: "100%",
                maxWidth: 900,
                mx: "auto"
            }}
        >

            {/* Header */}

            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    mb: 2
                }}
            >

                <Box
                    sx={{
                        width: 42,
                        height: 42,
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "rgba(20,184,166,.10)",
                        border:
                            "1px solid rgba(20,184,166,.22)"
                    }}
                >

                    <YouTubeIcon
                        sx={{
                            color: "#14B8A6",
                            fontSize: 25
                        }}
                    />

                </Box>

                <Box>

                    <Typography
                        sx={{
                            color: "#F8FAFC",
                            fontSize: "1.1rem",
                            fontWeight: 700
                        }}
                    >
                        Add YouTube Video
                    </Typography>

                    <Typography
                        sx={{
                            color: "#64748B",
                            fontSize: "0.85rem"
                        }}
                    >
                        Download a YouTube video and add it
                        to your video library.
                    </Typography>

                </Box>

            </Box>


            {/* Main Card */}

            <Box
                sx={{
                    p: { xs: 2.5, sm: 3 },
                    borderRadius: 2.5,
                    bgcolor: "rgba(15,23,42,.72)",
                    border:
                        "1px solid rgba(20,184,166,.14)",
                    boxShadow:
                        "0 12px 35px rgba(0,0,0,.22)",
                    backdropFilter: "blur(16px)"
                }}
            >

                {/* URL + Quality */}

                <Box
                    sx={{
                        display: "flex",
                        gap: 1.5,
                        alignItems: "stretch",
                        flexDirection: {
                            xs: "column",
                            sm: "row"
                        }
                    }}
                >

                    {/* URL */}

                    <TextField
                        fullWidth
                        value={url}
                        onChange={(event) => {
                            setUrl(event.target.value);
                            setError("");
                            setSuccess("");
                        }}
                        placeholder="Paste YouTube video link..."
                        disabled={loading}
                        InputProps={{
                            startAdornment: (
                                <LinkRoundedIcon
                                    sx={{
                                        color: "#64748B",
                                        mr: 1
                                    }}
                                />
                            )
                        }}
                        sx={{
                            "& .MuiOutlinedInput-root": {
                                minHeight: 52,
                                color: "#F8FAFC",
                                borderRadius: 2,

                                bgcolor:
                                    "rgba(2,6,23,.45)",

                                "& fieldset": {
                                    borderColor:
                                        "rgba(255,255,255,.10)"
                                },

                                "&:hover fieldset": {
                                    borderColor:
                                        "rgba(20,184,166,.45)"
                                },

                                "&.Mui-focused fieldset": {
                                    borderColor:
                                        "#14B8A6"
                                }
                            },

                            "& .MuiInputBase-input::placeholder": {
                                color: "#64748B",
                                opacity: 1
                            }
                        }}
                    />


                    {/* Quality */}

                    <FormControl
                        sx={{
                            minWidth: {
                                xs: "100%",
                                sm: 145
                            }
                        }}
                    >

                        <InputLabel
                            sx={{
                                color: "#94A3B8",
                                "&.Mui-focused": {
                                    color: "#14B8A6"
                                }
                            }}
                        >
                            Quality
                        </InputLabel>

                        <Select
                            value={quality}
                            label="Quality"
                            disabled={loading}
                            onChange={(event) =>
                                setQuality(
                                    event.target.value
                                )
                            }
                            sx={{
                                minHeight: 52,
                                color: "#F8FAFC",
                                borderRadius: 2,
                                bgcolor:
                                    "rgba(2,6,23,.45)",

                                "& .MuiOutlinedInput-notchedOutline": {
                                    borderColor:
                                        "rgba(255,255,255,.10)"
                                },

                                "&:hover .MuiOutlinedInput-notchedOutline": {
                                    borderColor:
                                        "rgba(20,184,166,.45)"
                                },

                                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                                    borderColor:
                                        "#14B8A6"
                                },

                                "& .MuiSvgIcon-root": {
                                    color: "#94A3B8"
                                }
                            }}

                            MenuProps={{
                                PaperProps: {
                                    sx: {
                                        bgcolor: "#0F172A",
                                        color: "#F8FAFC",
                                        border:
                                            "1px solid rgba(20,184,166,.15)",

                                        "& .MuiMenuItem-root:hover": {
                                            bgcolor:
                                                "rgba(20,184,166,.10)"
                                        },

                                        "& .Mui-selected": {
                                            bgcolor:
                                                "rgba(20,184,166,.14) !important"
                                        }
                                    }
                                }
                            }}
                        >

                            <MenuItem value="360">
                                360p
                            </MenuItem>

                            <MenuItem value="480">
                                480p
                            </MenuItem>

                            <MenuItem value="720">
                                720p HD
                            </MenuItem>

                            <MenuItem value="1080">
                                1080p Full HD
                            </MenuItem>

                        </Select>

                    </FormControl>


                    {/* Download */}

                    <Button
                        variant="contained"
                        onClick={handleDownload}
                        disabled={loading}
                        startIcon={
                            loading
                                ? undefined
                                : <DownloadRoundedIcon />
                        }
                        sx={{
                            minHeight: 52,
                            minWidth: {
                                xs: "100%",
                                sm: 165
                            },
                            borderRadius: 2,
                            bgcolor: "#14B8A6",
                            color: "#021617",
                            fontWeight: 800,
                            textTransform: "none",
                            boxShadow:
                                "0 4px 18px rgba(20,184,166,.20)",

                            "&:hover": {
                                bgcolor: "#10B981",
                                boxShadow:
                                    "0 6px 24px rgba(16,185,129,.28)"
                            },

                            "&.Mui-disabled": {
                                bgcolor:
                                    "rgba(20,184,166,.45)",
                                color:
                                    "rgba(2,22,23,.65)"
                            }
                        }}
                    >

                        {loading ? (
                            <CircularProgress
                                size={22}
                                sx={{
                                    color: "#021617"
                                }}
                            />
                        ) : (
                            "Download"
                        )}

                    </Button>

                </Box>


                {/* Quality information */}

                <Typography
                    sx={{
                        mt: 1.5,
                        color: "#64748B",
                        fontSize: "0.78rem"
                    }}
                >
                    Higher quality may require more time and
                    storage. If the selected quality isn't
                    available, the best available quality will
                    be downloaded.
                </Typography>


                {/* Error */}

                {error && (

                    <Alert
                        severity="error"
                        sx={{
                            mt: 2,
                            borderRadius: 2,
                            bgcolor:
                                "rgba(127,29,29,.20)",
                            border:
                                "1px solid rgba(248,113,113,.15)"
                        }}
                    >
                        {error}
                    </Alert>

                )}


                {/* Success */}

                {success && (

                    <Alert
                        icon={
                            <CheckCircleRoundedIcon
                                fontSize="inherit"
                            />
                        }
                        severity="success"
                        sx={{
                            mt: 2,
                            borderRadius: 2,
                            bgcolor:
                                "rgba(16,185,129,.08)",
                            border:
                                "1px solid rgba(16,185,129,.18)"
                        }}
                    >
                        {success}
                    </Alert>

                )}

            </Box>

        </Box>

    );
}