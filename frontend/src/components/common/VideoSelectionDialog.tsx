import { useEffect, useState } from "react";
import {
    Box,
    Button,
    Card,
    CardActionArea,
    CardContent,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Typography
} from "@mui/material";
import { getVideos } from "../../api/api";

interface Props {
    open: boolean;
    title: string;
    buttonText: string;
    loading?: boolean;
    onClose: () => void;
    onConfirm: (videoIds: number[]) => void;
    onUploadClick?: () => void;
    extraContent?: React.ReactNode;
}

export default function VideoSelectionDialog({
    open,
    title,
    buttonText,
    loading = false,
    onClose,
    onConfirm,
    onUploadClick,
    extraContent
}: Props) {
    const [videos, setVideos] = useState<any[]>([]);
    const [selected, setSelected] = useState<number[]>([]);

    useEffect(() => {
        if (open) {
            loadVideos();
        }
    }, [open]);

    async function loadVideos() {
        const result = await getVideos();
        const completed = result.filter(
            (video: any) => video.status === "completed"
        );
        setVideos(completed);
        setSelected(
            completed.map((video: any) => video.id)
        );
    }

    function toggleVideo(id: number) {
        if (selected.includes(id)) {
            setSelected(selected.filter(v => v !== id));
        } else {
            setSelected([...selected, id]);
        }
    }

    function toggleAll() {
        if (selected.length === videos.length) {
            setSelected([]);
        } else {
            setSelected(videos.map(v => v.id));
        }
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            PaperProps={{
                sx: {
                    background: "rgba(4,47,46,.96)",
                    border: "1px solid rgba(20,184,166,.25)",
                    backdropFilter: "blur(24px)",
                    borderRadius: 3,
                    color: "#F8FAFC"
                }
            }}
        >
            <DialogTitle sx={{ fontWeight: 700 }}>
                🎥 {title}
            </DialogTitle>
            <DialogContent>
                <Typography sx={{ color: "#94A3B8", mb: 3 }}>
                    Select one or more processed videos.
                </Typography>

                {extraContent && (
                    <Box sx={{ mb: 3 }}>
                        {extraContent}
                    </Box>
                )}

                {videos.length === 0 && (
                    <Box sx={{ py: 4, textAlign: "center" }}>
                        <Typography>😊</Typography>
                        <Typography sx={{ mt: 1, mb: 3, color: "#94A3B8" }}>
                            No processed videos available.
                        </Typography>
                        {onUploadClick && (
                            <Button
                                variant="contained"
                                onClick={onUploadClick}
                            >
                                Upload a Video
                            </Button>
                        )}
                    </Box>
                )}

                {videos.length > 0 && (
                    <>
                        <Button
                            size="small"
                            onClick={toggleAll}
                            sx={{ mb: 2 }}
                        >
                            {selected.length === videos.length
                                ? "Unselect All"
                                : "Select All"}
                        </Button>
                        {[...videos]
                            .sort((a, b) => a.id - b.id)
                            .map((video, index) => (
                            <Card
                                key={video.id}
                                sx={{
                                    mb: 2,
                                    background: selected.includes(video.id)
                                        ? "rgba(20,184,166,.10)"
                                        : "rgba(15,23,42,.55)",
                                    border: selected.includes(video.id)
                                        ? "2px solid #14B8A6"
                                        : "1px solid rgba(255,255,255,.08)"
                                }}
                            >
                                <CardActionArea onClick={() => toggleVideo(video.id)}>
                                    <CardContent>
                                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <Box>
                                                <Typography fontWeight={700} sx={{ color: "#14B8A6" }}>
                                                    Video #{index + 1}
                                                </Typography>
                                                <Typography fontWeight={600}>
                                                    {video.original_filename}
                                                </Typography>
                                                <Typography sx={{ color: "#94A3B8", fontSize: 13, mt: 0.5 }}>
                                                    ✅ Ready
                                                </Typography>
                                            </Box>
                                            <Checkbox checked={selected.includes(video.id)} />
                                        </Box>
                                    </CardContent>
                                </CardActionArea>
                            </Card>
                        ))}
                    </>
                )}
            </DialogContent>
            <Divider />
            <DialogActions>
                <Button onClick={onClose}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    disabled={loading || selected.length === 0}
                    onClick={() => onConfirm(selected)}
                >
                    {buttonText}
                </Button>
            </DialogActions>
        </Dialog>
    );
}