import {
    Button,
    Card,
    CardContent,
    Typography
} from "@mui/material";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { useVideo } from "../../context/VideoContext";

interface Props {
    videoId: number;
    start: number;
    end: number;
}

export default function SourceCard({
    videoId,
    start,
    end
}: Props) {
    const {
        videos,
        jumpToVideo
    } = useVideo();

    function handleJump() {
        const video = videos.find(
            v => v.id === videoId
        );

        if (!video) {
            return;
        }

        jumpToVideo(
            video,
            start
        );
    }

    function formatTime(seconds: number) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    }

    return (
        <Card
            sx={{
                mt: 2,
                borderRadius: 1.5,
                bgcolor: "#0f172a",
                border: "1px solid rgba(20,184,166,.25)"
            }}
        >
            <CardContent>
                <Typography
                    sx={{
                        fontWeight: 700,
                        color: "#14b8a6",
                        mb: 1
                    }}
                >
                    📹 Uploaded Video
                </Typography>

                <Typography>
                    Video #{videoId}
                </Typography>

                <Typography
                    sx={{
                        mt: .5,
                        mb: 2
                    }}
                >
                    {formatTime(start)} — {formatTime(end)}
                </Typography>

                <Button
                    variant="contained"
                    startIcon={<PlayArrowRoundedIcon />}
                    onClick={handleJump}
                    sx={{
                        borderRadius: 1.5
                    }}
                >
                    Jump to Timestamp
                </Button>
            </CardContent>
        </Card>
    );
}