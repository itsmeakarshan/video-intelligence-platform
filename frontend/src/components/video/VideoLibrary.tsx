import { useEffect, useState } from "react";

import {
    Avatar,
    Box,
    Button,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    LinearProgress,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Tooltip,
    Typography
} from "@mui/material";

import MovieRoundedIcon from "@mui/icons-material/MovieRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";

import toast from "react-hot-toast";

import {
    deleteVideo,
    generateTranscript,
    getVideos
} from "../../api/api";

import { useVideo } from "../../context/VideoContext";
import { useChat } from "../../context/ChatContext";
import Upload from "../upload/Upload";

export default function VideoLibrary() {
    const {
        videos,
        setVideos,
        selectedVideo,
        setSelectedVideo,
        setVideoId,
        setVideoTitle,
        setVideoUrl,
        loadVideo,
        getVideoDisplayNumber
    } = useVideo();

    const {
        setSelectedVideos: setChatSelectedVideos
    } = useChat();

    const [selectedVideos, setSelectedVideos] = useState<number[]>([]);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [videoToDelete, setVideoToDelete] = useState<any>(null);
    const [isBulkDelete, setIsBulkDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        setChatSelectedVideos(selectedVideos);
    }, [selectedVideos, setChatSelectedVideos]);

    useEffect(() => {

        loadVideos();

        const handleVideosUpdated = () => {
            loadVideos();
        };

        window.addEventListener(
            "videosUpdated",
            handleVideosUpdated
        );

        return () => {
            window.removeEventListener(
                "videosUpdated",
                handleVideosUpdated
            );
        };

    }, []);

    useEffect(() => {
        const hasActive = videos.some(
            (video: any) =>
                video.status === "processing" ||
                video.status === "queued"
        );

        if (!hasActive) {
            return;
        }

        const interval = setInterval(() => {
            loadVideos();
        }, 3000);

        return () => clearInterval(interval);
    }, [videos]);

    async function loadVideos() {
        try {
            const data = await getVideos();
            setVideos(data);
        } catch (error) {
            console.error(error);
        }
    }

    async function processVideo(videoId: number) {
        try {
            await generateTranscript(videoId);

            toast.success("Processing started.");

            setSelectedVideos(prev =>
                prev.filter(id => id !== videoId)
            );

            await loadVideos();
        } catch {
            toast.error("Unable to start processing.");
        }
    }

    async function processSelected() {
        try {
            for (const id of selectedVideos) {
                await generateTranscript(id);
            }

            toast.success("Processing started.");

            setSelectedVideos([]);

            await loadVideos();
        } catch {
            toast.error("Unable to start processing.");
        }
    }

    const uploadedVideos = videos.filter(
        (v: any) => v.status === "uploaded"
    );

    const queuedVideos = videos.filter(
        (v: any) => v.status === "queued"
    );

    function handleToggleSelect(
        id: number,
        event: React.MouseEvent
    ) {
        event.stopPropagation();

        setSelectedVideos((prev) =>
            prev.includes(id)
                ? prev.filter((item) => item !== id)
                : [...prev, id]
        );
    }

    function handleSelectAll() {
        if (selectedVideos.length === uploadedVideos.length) {
            setSelectedVideos([]);
        } else {
            setSelectedVideos(
                uploadedVideos.map((v: any) => v.id)
            );
        }
    }

    function openDeleteDialog(video: any) {
        setVideoToDelete(video);
        setIsBulkDelete(false);
        setDeleteDialogOpen(true);
    }

    function openBulkDeleteDialog() {
        if (selectedVideos.length === 0) return;

        setIsBulkDelete(true);
        setDeleteDialogOpen(true);
    }

    async function confirmDelete() {
        try {
            setDeleting(true);

            if (isBulkDelete) {
                for (const id of selectedVideos) {
                    await deleteVideo(id);

                    if (selectedVideo?.id === id) {
                        setSelectedVideo(null);
                        setVideoId(undefined as any);
                        setVideoTitle("");
                        setVideoUrl("");
                    }
                }

                toast.success("Selected videos deleted.");

                setSelectedVideos([]);
            } else if (videoToDelete) {
                await deleteVideo(videoToDelete.id);

                toast.success("Video deleted.");

                if (selectedVideo?.id === videoToDelete.id) {
                    setSelectedVideo(null);
                    setVideoId(undefined as any);
                    setVideoTitle("");
                    setVideoUrl("");
                }
            }

            await loadVideos();
        } catch {
            toast.error("Unable to delete video(s).");
        } finally {
            setDeleting(false);
            setDeleteDialogOpen(false);
            setVideoToDelete(null);
            setIsBulkDelete(false);
        }
    }

    return (
        <>
            <Box
                sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    color: "#F8FAFC"
                }}
            >
                <Typography
                    variant="h5"
                    sx={{
                        fontWeight: 700,
                        mb: 1,
                        color: "#F8FAFC"
                    }}
                >
                    📂 Uploaded Videos
                </Typography>

                <Typography
                    sx={{
                        color: "#94A3B8",
                        mb: 2
                    }}
                >
                    Upload videos now and choose when to process them.
                </Typography>

                {uploadedVideos.length > 0 && (
                    <Box
                        sx={{
                            position: "sticky",
                            top: 0,
                            zIndex: 10,
                            background: "rgba(15,23,42,.85)",
                            backdropFilter: "blur(12px)",
                            border: "1px solid rgba(20,184,166,.2)",
                            borderRadius: 1.5,
                            p: 2,
                            mb: 2,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5
                            }}
                        >
                            <Checkbox
                                checked={
                                    uploadedVideos.length > 0 &&
                                    selectedVideos.length === uploadedVideos.length
                                }
                                indeterminate={
                                    selectedVideos.length > 0 &&
                                    selectedVideos.length < uploadedVideos.length
                                }
                                onChange={handleSelectAll}
                                disabled={uploadedVideos.length === 0}
                                sx={{
                                    color: "#14B8A6",
                                    "&.Mui-checked": {
                                        color: "#14B8A6"
                                    }
                                }}
                            />

                            <Typography
                                sx={{
                                    color: "#F8FAFC",
                                    fontWeight: 600,
                                    fontSize: 14
                                }}
                            >
                                Select All
                            </Typography>

                            <Typography
                                sx={{
                                    color: "#94A3B8",
                                    fontSize: 13,
                                    ml: 1
                                }}
                            >
                                Selected: {selectedVideos.length}
                            </Typography>
                        </Box>

                        <Box
                            sx={{
                                display: "flex",
                                gap: 1
                            }}
                        >
                            <Button
                                size="small"
                                variant="contained"
                                disabled={selectedVideos.length === 0}
                                onClick={processSelected}
                                sx={{
                                    bgcolor: "#14B8A6",
                                    color: "#021617",
                                    fontWeight: 700,
                                    borderRadius: 1,
                                    "&:hover": {
                                        bgcolor: "#10B981"
                                    },
                                    "&.Mui-disabled": {
                                        bgcolor: "rgba(20,184,166,.12)",
                                        color: "rgba(255,255,255,.3)"
                                    }
                                }}
                            >
                                Process Selected
                            </Button>

                            <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                disabled={
                                    selectedVideos.length === 0 ||
                                    deleting
                                }
                                onClick={openBulkDeleteDialog}
                                sx={{
                                    borderRadius: 1
                                }}
                            >
                                Delete Selected
                            </Button>
                        </Box>
                    </Box>
                )}

                <Divider
                    sx={{
                        mb: 2,
                        borderColor: "rgba(20,184,166,.2)"
                    }}
                />

                <List
                    sx={{
                        flex: 1,
                        overflowY: "auto",
                        maxHeight: 520,
                        pr: 1
                    }}
                >
                    {videos.length === 0 && (
                        <Box
                            sx={{
                                py: 6,
                                textAlign: "center"
                            }}
                        >
                            <MovieRoundedIcon
                                sx={{
                                    fontSize: 48,
                                    mb: 1,
                                    color: "#14B8A6",
                                    opacity: 0.8
                                }}
                            />

                            <Typography
                                variant="h6"
                                sx={{
                                    color: "#F8FAFC",
                                    fontWeight: 600,
                                    mb: 0.5
                                }}
                            >
                                No videos yet
                            </Typography>

                            <Typography
                                sx={{
                                    color: "#94A3B8",
                                    fontSize: 14
                                }}
                            >
                                Upload one or more videos to begin.
                            </Typography>
                        </Box>
                    )}

                    {[...videos]
                        .sort((a, b) => a.id - b.id)
                        .map((video: any, index: number) => {
                            const isSelected =
                                selectedVideos.includes(video.id);

                            const isUploaded =
                                video.status === "uploaded";

                            const isProcessing =
                                video.status === "processing";

                            const isQueued =
                                video.status === "queued";

                            const progressValue =
                                video.progress !== undefined
                                    ? video.progress
                                    : undefined;

                            return (
                                <Box
                                    key={video.id}
                                    sx={{
                                        mb: 2,
                                        borderRadius: 1.5,
                                        background: "rgba(15,23,42,.65)",
                                        border:
                                            selectedVideo?.id === video.id
                                                ? "2px solid #14B8A6"
                                                : "1px solid rgba(20,184,166,.15)",
                                        boxShadow:
                                            "0 4px 20px rgba(0,0,0,.2)",
                                        overflow: "hidden",
                                        transition: "all .25s ease",
                                        backdropFilter: "blur(12px)",
                                        "&:hover": {
                                            borderColor:
                                                "rgba(20,184,166,.4)",
                                            transform: "translateY(-1px)"
                                        }
                                    }}
                                >
                                    <ListItemButton
                                        onClick={() => loadVideo(video)}
                                        sx={{
                                            py: 1.5,
                                            "&:hover": {
                                                background:
                                                    "rgba(20,184,166,.08)"
                                            }
                                        }}
                                    >
                                        <Box
                                            onClick={(e) =>
                                                handleToggleSelect(
                                                    video.id,
                                                    e
                                                )
                                            }
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                mr: 1
                                            }}
                                        >
                                            <Checkbox
                                                size="small"
                                                checked={isSelected}
                                                disabled={!isUploaded}
                                                sx={{
                                                    color: "#14B8A6",
                                                    "&.Mui-checked": {
                                                        color: "#14B8A6"
                                                    }
                                                }}
                                            />
                                        </Box>

                                        <ListItemIcon
                                            sx={{
                                                minWidth: 44
                                            }}
                                        >
                                            <Avatar
                                                sx={{
                                                    bgcolor:
                                                        "rgba(20,184,166,.2)",
                                                    color: "#14B8A6",
                                                    border:
                                                        "1px solid rgba(20,184,166,.3)",
                                                    borderRadius: 1
                                                }}
                                            >
                                                <MovieRoundedIcon />
                                            </Avatar>
                                        </ListItemIcon>

                                        <ListItemText
                                            primary={
                                                <Box>
                                                    <Typography
                                                        sx={{
                                                            color: "#14B8A6",
                                                            fontWeight: 700,
                                                            fontSize: 14
                                                        }}
                                                    >
                                                        Video #{getVideoDisplayNumber ? getVideoDisplayNumber(video.id) : index + 1}
                                                    </Typography>

                                                    <Typography
                                                        sx={{
                                                            color: "#F8FAFC",
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        {video.original_filename}
                                                    </Typography>
                                                </Box>
                                            }
                                            secondary={
                                                <Box
                                                    sx={{
                                                        mt: 0.8,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 0.8
                                                    }}
                                                >
                                                    {isProcessing ? (
                                                        <Chip
                                                            size="small"
                                                            label="Processing"
                                                            color="warning"
                                                            sx={{
                                                                fontWeight: 700,
                                                                borderRadius: 0.75
                                                            }}
                                                        />
                                                    ) : isQueued ? (
                                                        <Chip
                                                            size="small"
                                                            label={`Queued #${
                                                                queuedVideos.findIndex(
                                                                    (v: any) =>
                                                                        v.id === video.id
                                                                ) + 1
                                                            }`}
                                                            sx={{
                                                                bgcolor: "#F97316",
                                                                color: "#fff",
                                                                fontWeight: 700,
                                                                borderRadius: 0.75
                                                            }}
                                                        />
                                                    ) : video.status === "completed" ? (
                                                        <Chip
                                                            size="small"
                                                            label="Ready"
                                                            sx={{
                                                                bgcolor: "#10B981",
                                                                color: "#fff",
                                                                fontWeight: 700,
                                                                borderRadius: 0.75
                                                            }}
                                                        />
                                                    ) : video.status === "failed" ? (
                                                        <Chip
                                                            size="small"
                                                            label="Failed"
                                                            color="error"
                                                            sx={{
                                                                fontWeight: 700,
                                                                borderRadius: 0.75
                                                            }}
                                                        />
                                                    ) : (
                                                        <Chip
                                                            size="small"
                                                            label="Uploaded"
                                                            sx={{
                                                                bgcolor:
                                                                    "rgba(255,255,255,.08)",
                                                                color: "#CBD5E1",
                                                                border:
                                                                    "1px solid rgba(255,255,255,.15)",
                                                                fontWeight: 700,
                                                                borderRadius: 0.75
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                            }
                                        />

                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 0.5
                                            }}
                                        >
                                            <Tooltip title="Delete Video">
                                                <IconButton
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        openDeleteDialog(video);
                                                    }}
                                                    sx={{
                                                        color: "#94A3B8",
                                                        "&:hover": {
                                                            color: "#EF4444",
                                                            background:
                                                                "rgba(239,68,68,.12)"
                                                        }
                                                    }}
                                                >
                                                    <DeleteOutlineRoundedIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </ListItemButton>

                                    {video.status === "uploaded" && (
                                        <Box
                                            sx={{
                                                px: 2,
                                                pb: 2
                                            }}
                                        >
                                            <Button
                                                fullWidth
                                                variant="contained"
                                                disabled={
                                                    video.status !== "uploaded"
                                                }
                                                startIcon={
                                                    <PlayArrowRoundedIcon />
                                                }
                                                onClick={() =>
                                                    processVideo(video.id)
                                                }
                                                sx={{
                                                    bgcolor: "#14B8A6",
                                                    color: "#021617",
                                                    fontWeight: 700,
                                                    borderRadius: 1,
                                                    "&:hover": {
                                                        bgcolor: "#10B981"
                                                    }
                                                }}
                                            >
                                                Process
                                            </Button>
                                        </Box>
                                    )}

                                    {(isProcessing || isQueued) && (
                                        <Box
                                            sx={{
                                                px: 2,
                                                pb: 2
                                            }}
                                        >
                                            <LinearProgress
                                                variant={
                                                    isProcessing &&
                                                    progressValue !== undefined
                                                        ? "determinate"
                                                        : "indeterminate"
                                                }
                                                value={progressValue}
                                                sx={{
                                                    height: 8,
                                                    borderRadius: 1,
                                                    bgcolor:
                                                        "rgba(20,184,166,.15)",
                                                    "& .MuiLinearProgress-bar": {
                                                        bgcolor: "#14B8A6"
                                                    }
                                                }}
                                            />

                                            <Typography
                                                sx={{
                                                    mt: 1,
                                                    color: "#94A3B8",
                                                    fontWeight: 500,
                                                    fontSize: 12
                                                }}
                                            >
                                                {isProcessing ? (
                                                    <>
                                                        {progressValue ?? 0}% •{" "}
                                                        {video.current_step ||
                                                            "Processing..."}
                                                    </>
                                                ) : (
                                                    <>
                                                        Waiting in queue...{" "}
                                                        Position #
                                                        {queuedVideos.findIndex(
                                                            (v: any) =>
                                                                v.id === video.id
                                                        ) + 1}
                                                    </>
                                                )}
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            );
                        })}
                </List>

                <Divider
                    sx={{
                        my: 2,
                        borderColor: "rgba(20,184,166,.2)"
                    }}
                />

                <Upload />
            </Box>

            <Dialog
                open={deleteDialogOpen}
                onClose={() =>
                    !deleting &&
                    setDeleteDialogOpen(false)
                }
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        background: "rgba(4,47,46,.95)",
                        border:
                            "1px solid rgba(239,68,68,.30)",
                        color: "#F8FAFC",
                        borderRadius: 1.5,
                        backdropFilter: "blur(18px)"
                    }
                }}
            >
                <DialogTitle
                    sx={{
                        color: "#F8FAFC",
                        fontWeight: 700
                    }}
                >
                    🗑 Delete{" "}
                    {isBulkDelete
                        ? `${selectedVideos.length} videos?`
                        : "Video"}
                </DialogTitle>

                <DialogContent>
                    <Typography>
                        {isBulkDelete
                            ? `Are you sure you want to permanently delete the ${selectedVideos.length} selected videos?`
                            : "Are you sure you want to permanently delete"}
                    </Typography>

                    {!isBulkDelete && (
                        <Typography
                            sx={{
                                mt: 2,
                                fontWeight: 700,
                                color: "#F87171"
                            }}
                        >
                            {videoToDelete?.original_filename}
                        </Typography>
                    )}

                    <Typography
                        sx={{
                            mt: 3,
                            color: "#94A3B8",
                            fontSize: 14
                        }}
                    >
                        This will permanently remove:
                    </Typography>

                    <Box
                        sx={{
                            mt: 1,
                            color: "#CBD5E1",
                            fontSize: 14
                        }}
                    >
                        • Uploaded video(s)
                        <br />
                        • Transcript
                        <br />
                        • Transcript segments
                        <br />
                        • Transcript chunks
                    </Box>
                </DialogContent>

                <DialogActions>
                    <Button
                        onClick={() =>
                            setDeleteDialogOpen(false)
                        }
                        sx={{
                            borderRadius: 1
                        }}
                    >
                        Cancel
                    </Button>

                    <Button
                        color="error"
                        variant="contained"
                        disabled={deleting}
                        onClick={confirmDelete}
                        sx={{
                            borderRadius: 1
                        }}
                    >
                        {deleting
                            ? "Deleting..."
                            : "Delete"}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}