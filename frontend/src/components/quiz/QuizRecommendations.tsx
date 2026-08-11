import { useEffect, useState } from "react";
import {
    Box,
    Card,
    CardContent,
    CardMedia,
    Chip,
    CircularProgress,
    Stack,
    Typography,
    Button,
    Alert
} from "@mui/material";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { getQuizAttemptRecommendations } from "../../api/api";

interface WeakTopic {
    topic: string;
    incorrect_count: number;
}

interface YouTubeRecommendation {
    topic: string;
    title: string;
    youtube_video_id: string;
    thumbnail_url: string;
    channel_name: string;
    description: string;
    url: string;
}

interface RecommendationResponse {
    attempt_id: number;
    weak_topics: WeakTopic[];
    recommendations: YouTubeRecommendation[];
    message: string | null;
}

interface Props {
    attemptId: number | null;
}

export default function QuizRecommendations({ attemptId }: Props) {
    const [data, setData] = useState<RecommendationResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (attemptId) {
            fetchRecommendations(attemptId);
        }
    }, [attemptId]);

    async function fetchRecommendations(id: number) {
        setLoading(true);
        setError("");
        try {
            const res = await getQuizAttemptRecommendations(id);
            setData(res);
        } catch (err: any) {
            console.error("Unable to load recommendations:", err);
            setError("Recommendations are temporarily unavailable. Your quiz result has still been saved.");
        } finally {
            setLoading(false);
        }
    }

    if (!attemptId) return null;

    if (loading) {
        return (
            <Card
                sx={{
                    mt: 3,
                    borderRadius: 3,
                    bgcolor: "rgba(15, 23, 42, 0.95)",
                    border: "1px solid rgba(20, 184, 166, 0.3)",
                    p: 3,
                    textAlign: "center"
                }}
            >
                <CircularProgress size={28} sx={{ color: "#14b8a6", mb: 1.5 }} />
                <Typography sx={{ color: "#94a3b8", fontSize: 14, fontWeight: 500 }}>
                    Finding personalised educational videos for your weak areas...
                </Typography>
            </Card>
        );
    }

    if (error) {
        return (
            <Alert
                severity="info"
                sx={{
                    mt: 3,
                    borderRadius: 2,
                    bgcolor: "rgba(14, 165, 233, 0.1)",
                    border: "1px solid rgba(14, 165, 233, 0.25)",
                    color: "#38bdf8"
                }}
            >
                {error}
            </Alert>
        );
    }

    if (!data) return null;

    if (data.weak_topics.length === 0) {
        return (
            <Card
                sx={{
                    mt: 3,
                    borderRadius: 3,
                    bgcolor: "rgba(15, 23, 42, 0.95)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    p: 3
                }}
            >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <CheckCircleRoundedIcon sx={{ color: "#10b981", fontSize: 28 }} />
                    <Typography sx={{ color: "#F8FAFC", fontWeight: 700, fontSize: 16 }}>
                        {data.message || "Great work! You didn't have any clear weak areas in this quiz."}
                    </Typography>
                </Stack>
            </Card>
        );
    }

    return (
        <Card
            sx={{
                mt: 3,
                borderRadius: 3,
                bgcolor: "rgba(15, 23, 42, 0.95)",
                border: "1px solid rgba(20, 184, 166, 0.4)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                p: 3
            }}
        >
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                <Box
                    sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "rgba(20, 184, 166, 0.15)",
                        border: "1px solid rgba(20, 184, 166, 0.3)"
                    }}
                >
                    <MenuBookRoundedIcon sx={{ color: "#14b8a6", fontSize: 22 }} />
                </Box>
                <Box>
                    <Typography sx={{ color: "#F8FAFC", fontWeight: 700, fontSize: 18 }}>
                        📚 RECOMMENDED FOR YOU
                    </Typography>
                    <Typography sx={{ color: "#94a3b8", fontSize: 12 }}>
                        Personalised educational videos based on the concepts you found challenging
                    </Typography>
                </Box>
            </Stack>

            <Box sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <Typography sx={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, mb: 1 }}>
                    Concepts to review:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {data.weak_topics.map((item, idx) => (
                        <Chip
                            key={idx}
                            label={`${item.topic} (${item.incorrect_count} ${item.incorrect_count === 1 ? "question" : "questions"} missed)`}
                            size="small"
                            sx={{
                                bgcolor: "rgba(239, 68, 68, 0.15)",
                                color: "#f87171",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                fontWeight: 600,
                                my: 0.5
                            }}
                        />
                    ))}
                </Stack>
            </Box>

            {data.recommendations.length > 0 ? (
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
                        gap: 2
                    }}
                >
                    {data.recommendations.map((rec, idx) => (
                        <Card
                            key={idx}
                            sx={{
                                height: "100%",
                                display: "flex",
                                flexDirection: "column",
                                bgcolor: "rgba(30, 41, 59, 0.7)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                borderRadius: 2,
                                transition: "transform 0.2s, border-color 0.2s",
                                "&:hover": {
                                    transform: "translateY(-4px)",
                                    borderColor: "rgba(20, 184, 166, 0.6)"
                                }
                            }}
                        >
                            <CardMedia
                                component="img"
                                height="130"
                                image={rec.thumbnail_url}
                                alt={rec.title}
                                sx={{ objectFit: "cover" }}
                            />
                            <CardContent sx={{ p: 2, flexGrow: 1, display: "flex", flexDirection: "column" }}>
                                <Chip
                                    label={rec.topic}
                                    size="small"
                                    sx={{
                                        alignSelf: "flex-start",
                                        mb: 1,
                                        fontSize: 10,
                                        bgcolor: "rgba(20, 184, 166, 0.15)",
                                        color: "#14b8a6",
                                        fontWeight: 700
                                    }}
                                />
                                <Typography
                                    sx={{
                                        color: "#F8FAFC",
                                        fontWeight: 700,
                                        fontSize: 14,
                                        lineHeight: 1.3,
                                        mb: 1,
                                        display: "-webkit-box",
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: "vertical",
                                        overflow: "hidden"
                                    }}
                                >
                                    {rec.title}
                                </Typography>
                                <Typography
                                    sx={{
                                        color: "#94a3b8",
                                        fontSize: 11,
                                        mb: 1.5,
                                        display: "-webkit-box",
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: "vertical",
                                        overflow: "hidden",
                                        flexGrow: 1
                                    }}
                                >
                                    {rec.description}
                                </Typography>
                                <Typography sx={{ color: "#64748b", fontSize: 11, fontWeight: 600, mb: 1.5 }}>
                                    Channel: {rec.channel_name}
                                </Typography>

                                <Button
                                    component="a"
                                    href={rec.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    variant="outlined"
                                    size="small"
                                    endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 14 }} />}
                                    sx={{
                                        mt: "auto",
                                        borderRadius: 1.5,
                                        borderColor: "rgba(20, 184, 166, 0.5)",
                                        color: "#14b8a6",
                                        fontSize: 12,
                                        fontWeight: 700,
                                        "&:hover": {
                                            bgcolor: "rgba(20, 184, 166, 0.1)",
                                            borderColor: "#14b8a6"
                                        }
                                    }}
                                >
                                    Watch on YouTube
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            ) : (
                <Typography sx={{ color: "#94a3b8", fontSize: 13, fontStyle: "italic" }}>
                    No matching video recommendations found for these specific topics.
                </Typography>
            )}
        </Card>
    );
}
