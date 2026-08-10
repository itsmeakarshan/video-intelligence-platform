import { useRef, useState } from "react";
import { Box, Button, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import toast from "react-hot-toast";
import { getVideos } from "../../api/api";
import { upload } from "../../services/videoService";
import { useVideo } from "../../context/VideoContext";

export default function Upload() {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const { setVideos } = useVideo();

    async function uploadFiles(files: FileList | File[]) {
        setUploading(true);
        setProgress(0);

        const fileArray = Array.from(files);

        for (const file of fileArray) {
            try {
                await upload(file, p => setProgress(p));
            } catch {
                toast.error(`${file.name} failed`);
            }
        }

        const videos = await getVideos();
        setVideos(videos);
        setUploading(false);
        setProgress(0);
        toast.success("Upload complete.");
    }

    return (
        <>
            <input
                hidden
                multiple
                ref={inputRef}
                type="file"
                accept="video/*"
                onChange={e => {
                    if (!e.target.files?.length) return;
                    uploadFiles(e.target.files);
                    e.target.value = "";
                }}
            />

            <Paper
                elevation={0}
                sx={{
                    border: "2px dashed",
                    borderColor: "divider",
                    borderRadius: 4,
                    p: 4,
                    textAlign: "center",
                    transition: ".25s",
                    cursor: "pointer",
                    "&:hover": {
                        borderColor: "primary.main",
                        bgcolor: "action.hover"
                    }
                }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                    e.preventDefault();
                    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
                }}
            >
                <Stack spacing={2} alignItems="center">
                    <CloudUploadRoundedIcon sx={{ fontSize: 70 }} />
                    <Typography variant="h6" fontWeight={700}>
                        Drag & Drop Videos
                    </Typography>
                    <Typography color="text.secondary">
                        or
                    </Typography>
                    <Button
                        variant="contained"
                        disabled={uploading}
                        onClick={() => inputRef.current?.click()}
                    >
                        Browse Videos
                    </Button>
                </Stack>

                {uploading && (
                    <Box mt={4}>
                        <Typography mb={1}>Uploading...</Typography>
                        <LinearProgress
                            variant="determinate"
                            value={progress}
                            sx={{ height: 10, borderRadius: 10 }}
                        />
                        <Typography mt={1} fontWeight={700}>
                            {progress}%
                        </Typography>
                    </Box>
                )}
            </Paper>
        </>
    );
}