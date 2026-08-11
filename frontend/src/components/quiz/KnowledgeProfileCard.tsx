import { useEffect, useState } from "react";
import {
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    LinearProgress,
    Stack,
    Typography,
    Grid
} from "@mui/material";
import PsychologyRoundedIcon from "@mui/icons-material/PsychologyRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { getKnowledgeProfile } from "../../api/api";

interface TopicMastery {
    topic: string;
    mastery_percentage: number;
    correct_count: number;
    total_count: number;
    confidence?: string;
}

interface KnowledgeProfileData {
    has_data: boolean;
    total_questions_answered: number;
    topics_breakdown: TopicMastery[];
    strong_areas: TopicMastery[];
    improving_areas: TopicMastery[];
    weak_areas: TopicMastery[];
    summary?: {
        strong_count: number;
        improving_count: number;
        needs_review_count: number;
    };
    message: string | null;
}

export default function KnowledgeProfileCard() {
    const [data, setData] = useState<KnowledgeProfileData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadKnowledgeProfile();
    }, []);

    async function loadKnowledgeProfile() {
        setLoading(true);
        try {
            const res = await getKnowledgeProfile();
            setData(res);
        } catch (err) {
            console.error("Failed to load Knowledge Profile:", err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <Card sx={{ mb: 3, borderRadius: 3, bgcolor: "rgba(15, 23, 42, 0.75)", p: 2, textAlign: "center" }}>
                <CircularProgress size={24} sx={{ color: "#14b8a6", my: 1 }} />
                <Typography sx={{ color: "#94a3b8", fontSize: 13 }}>Building Knowledge Profile...</Typography>
            </Card>
        );
    }

    if (!data || !data.has_data) {
        return null;
    }

    const strongCount = data.strong_areas.length;
    const improvingCount = data.improving_areas.length;
    const weakCount = data.weak_areas.length;
    const totalConcepts = data.topics_breakdown.length;

    return (
        <Card
            sx={{
                mb: 3,
                borderRadius: 3,
                bgcolor: "rgba(15, 23, 42, 0.85)",
                border: "1px solid rgba(20, 184, 166, 0.3)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
                p: 3
            }}
        >
            <CardContent sx={{ p: 0 }}>
                {/* Header */}
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
                    <Box
                        sx={{
                            width: 38,
                            height: 38,
                            borderRadius: 2,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: "rgba(20, 184, 166, 0.15)",
                            border: "1px solid rgba(20, 184, 166, 0.3)"
                        }}
                    >
                        <PsychologyRoundedIcon sx={{ color: "#14b8a6", fontSize: 24 }} />
                    </Box>
                    <Box>
                        <Typography sx={{ color: "#F8FAFC", fontWeight: 700, fontSize: 16 }}>
                            LEARNING KNOWLEDGE PROFILE
                        </Typography>
                        <Typography sx={{ color: "#94A3B8", fontSize: 12 }}>
                            Concept mastery breakdown derived from {data.total_questions_answered} answered questions across {totalConcepts} concepts
                        </Typography>
                    </Box>
                </Stack>

                {/* Category Summary Cards */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Box
                            sx={{
                                p: 2,
                                borderRadius: 2.5,
                                bgcolor: "rgba(16, 185, 129, 0.08)",
                                border: "1px solid rgba(16, 185, 129, 0.25)"
                            }}
                        >
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                <CheckCircleRoundedIcon sx={{ color: "#10b981", fontSize: 18 }} />
                                <Typography sx={{ color: "#10b981", fontWeight: 700, fontSize: 13 }}>
                                    STRONG
                                </Typography>
                            </Stack>
                            <Typography sx={{ color: "#F8FAFC", fontWeight: 800, fontSize: 20 }}>
                                {strongCount} Concepts
                            </Typography>
                            <Typography sx={{ color: "#94A3B8", fontSize: 11, mt: 0.5 }}>
                                Mastery ≥ 75%
                            </Typography>
                        </Box>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Box
                            sx={{
                                p: 2,
                                borderRadius: 2.5,
                                bgcolor: "rgba(14, 165, 233, 0.08)",
                                border: "1px solid rgba(14, 165, 233, 0.25)"
                            }}
                        >
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                <TrendingUpRoundedIcon sx={{ color: "#38bdf8", fontSize: 18 }} />
                                <Typography sx={{ color: "#38bdf8", fontWeight: 700, fontSize: 13 }}>
                                    IMPROVING
                                </Typography>
                            </Stack>
                            <Typography sx={{ color: "#F8FAFC", fontWeight: 800, fontSize: 20 }}>
                                {improvingCount} Concepts
                            </Typography>
                            <Typography sx={{ color: "#94A3B8", fontSize: 11, mt: 0.5 }}>
                                Mastery 60% – 74%
                            </Typography>
                        </Box>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Box
                            sx={{
                                p: 2,
                                borderRadius: 2.5,
                                bgcolor: "rgba(239, 68, 68, 0.08)",
                                border: "1px solid rgba(239, 68, 68, 0.25)"
                            }}
                        >
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                <WarningAmberRoundedIcon sx={{ color: "#f87171", fontSize: 18 }} />
                                <Typography sx={{ color: "#f87171", fontWeight: 700, fontSize: 13 }}>
                                    NEEDS REVIEW
                                </Typography>
                            </Stack>
                            <Typography sx={{ color: "#F8FAFC", fontWeight: 800, fontSize: 20 }}>
                                {weakCount} Concepts
                            </Typography>
                            <Typography sx={{ color: "#94A3B8", fontSize: 11, mt: 0.5 }}>
                                Mastery &lt; 60%
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>

                {/* Concept Mastery List */}
                <Typography sx={{ color: "#94A3B8", fontWeight: 700, fontSize: 12, mb: 1.5, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Detailed Concept Breakdown
                </Typography>

                <Stack spacing={2}>
                    {data.topics_breakdown.map((item, idx) => {
                        const color = item.mastery_percentage >= 75 ? "#10b981" : item.mastery_percentage >= 60 ? "#38bdf8" : "#f87171";
                        return (
                            <Box
                                key={idx}
                                sx={{
                                    p: 1.75,
                                    borderRadius: 2,
                                    bgcolor: "rgba(30, 41, 59, 0.5)",
                                    border: "1px solid rgba(255, 255, 255, 0.06)"
                                }}
                            >
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                    <Box>
                                        <Typography sx={{ color: "#F8FAFC", fontSize: 14, fontWeight: 600 }}>
                                            {item.topic}
                                        </Typography>
                                    </Box>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Chip
                                            label={`${item.correct_count}/${item.total_count} correct`}
                                            size="small"
                                            sx={{
                                                bgcolor: "rgba(255, 255, 255, 0.08)",
                                                color: "#94a3b8",
                                                fontSize: 11,
                                                fontWeight: 600
                                            }}
                                        />
                                        <Typography sx={{ color: color, fontSize: 14, fontWeight: 800, minWidth: 48, textAlign: "right" }}>
                                            {item.mastery_percentage}%
                                        </Typography>
                                    </Stack>
                                </Stack>

                                <LinearProgress
                                    variant="determinate"
                                    value={item.mastery_percentage}
                                    sx={{
                                        height: 6,
                                        borderRadius: 3,
                                        bgcolor: "rgba(255, 255, 255, 0.08)",
                                        "& .MuiLinearProgress-bar": {
                                            bgcolor: color,
                                            borderRadius: 3
                                        }
                                    }}
                                />
                            </Box>
                        );
                    })}
                </Stack>
            </CardContent>
        </Card>
    );
}
