import { useState } from "react";

import {
    Box,
    Button,
    CircularProgress,
    LinearProgress,
    Typography
} from "@mui/material";

import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import toast from "react-hot-toast";

import { api, uploadVideo } from "../../api/api";
import { useVideo } from "../../context/VideoContext";

export default function Upload() {

    const {
        setVideoUrl,
        setVideoId,
        processing,
        setProcessing
    } = useVideo();

    const [loading, setLoading] = useState(false);

    async function handleUpload(
        e: React.ChangeEvent<HTMLInputElement>
    ) {

        const file = e.target.files?.[0];

        if (!file) return;

        setLoading(true);

        try {

            const result = await uploadVideo(file);

            setVideoId(result.id);

            setVideoUrl(
                `http://127.0.0.1:8000/uploads/${result.filename}`
            );

            setProcessing(true);

            await api.post(
                `/transcripts/${result.id}`
            );

            setProcessing(false);

            toast.success(
                "Video processed successfully."
            );

        }
        catch (error) {

            console.error(error);
            console.log(error.response);
            console.log(error.response?.data);

            setProcessing(false);

            toast.error(
                error.response?.data?.detail ??
                "Video upload failed."
            );

        }
        finally {

            setLoading(false);

        }

    }

    return (

        <Box
            sx={{
                border: "2px dashed #CBD5E1",
                borderRadius: 5,
                p: 6,
                textAlign: "center",
                background: "#FFFFFF",
                transition: "0.3s",
                cursor: "pointer",

                "&:hover": {
                    borderColor: "#2563EB",
                    transform: "translateY(-3px)",
                    boxShadow: "0 12px 40px rgba(0,0,0,0.08)"
                }
            }}
        >

            <CloudUploadIcon
                sx={{
                    fontSize: 70,
                    color: "#2563EB",
                    mb: 2
                }}
            />

            <Typography
                variant="h5"
                sx={{
                    fontWeight: 700,
                    mb: 2
                }}
            >
                Upload Video
            </Typography>

            <Typography
                sx={{
                    color: "#6B7280",
                    mb: 4
                }}
            >
                Drag & Drop your video here
                <br />
                or click below to browse
                <br />
                <br />
                Supported formats:
                <br />
                MP4 • MOV • AVI • MKV
            </Typography>

            <Button
                variant="contained"
                component="label"
                disabled={loading || processing}
                sx={{
                    px: 4,
                    py: 1.5,
                    borderRadius: 3
                }}
            >
                {
                    loading ? (
                        <CircularProgress
                            size={22}
                            color="inherit"
                        />
                    ) : processing ? (
                        "Processing..."
                    ) : (
                        "Choose Video"
                    )
                }

                <input
                    hidden
                    type="file"
                    accept="video/*"
                    onChange={handleUpload}
                />

            </Button>

            {
                processing && (

                    <Box sx={{ mt: 4 }}>

                        <LinearProgress />

                        <Typography
                            sx={{
                                mt: 2,
                                color: "#6B7280"
                            }}
                        >
                            Generating transcript and AI embeddings...
                        </Typography>

                    </Box>

                )
            }

        </Box>

    );

}