import { useEffect, useState } from "react";
import {
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Stack,
    Typography,
    Alert
} from "@mui/material";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import HighlightOffRoundedIcon from "@mui/icons-material/HighlightOffRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { getLearningPrediction, getPassPrediction } from "../../api/api";

// Phase 10: Configurable Pass Probability Confidence Thresholds
export const PASS_CONFIDENCE_THRESHOLDS = {
    HIGH: 0.70,       // >= 70%: "Likely to Pass"
    MODERATE: 0.45    // 45%–69.99%: "Borderline / Moderate Confidence"
};

export function getConfidenceTier(prob: number | null | undefined) {
    if (prob === null || prob === undefined) return null;
    if (prob >= PASS_CONFIDENCE_THRESHOLDS.HIGH) {
        return {
            label: "Likely to Pass",
            color: "#10b981",
            bgColor: "rgba(16, 185, 129, 0.1)",
            borderColor: "rgba(16, 185, 129, 0.3)",
            tier: "HIGH"
        };
    } else if (prob >= PASS_CONFIDENCE_THRESHOLDS.MODERATE) {
        return {
            label: "Borderline / Moderate Confidence",
            color: "#f59e0b",
            bgColor: "rgba(245, 158, 11, 0.1)",
            borderColor: "rgba(245, 158, 11, 0.3)",
            tier: "MODERATE"
        };
    } else {
        return {
            label: "Unlikely to Pass / Needs Review",
            color: "#ef4444",
            bgColor: "rgba(239, 68, 68, 0.1)",
            borderColor: "rgba(239, 68, 68, 0.3)",
            tier: "LOW"
        };
    }
}

interface PredictionData {
    has_sufficient_history: boolean;
    predicted_percentage: number | null;
    raw_predicted_percentage?: number | null;
    attempt_count: number;
    historical_avg: number | null;
    recent_trend: number | null;
    target_difficulty: string | null;
    model_version: string | null;
    message: string | null;
}

interface PassPredictionData {
    has_sufficient_history: boolean;
    predicted_class: "pass" | "fail" | null;
    probability_of_pass: number | null;
    threshold: number | null;
    attempt_count: number;
    target_difficulty: string | null;
    model_version: string | null;
    message: string | null;
}

interface SubmissionPrediction {
    available: boolean;
    predicted_score?: number | null;
    pass_probability?: number | null;
    pass_threshold?: number | null;
    attempt_count?: number | null;
    target_difficulty?: string | null;
    regression_model?: string | null;
    classification_model?: string | null;
    reason?: string | null;
    message?: string | null;
}

interface Props {
    difficulty?: string;
    refreshKey?: number;
    predictionOverride?: SubmissionPrediction | null;
}

export default function LearningPredictionCard({
    difficulty = "Medium",
    refreshKey = 0,
    predictionOverride = null
}: Props) {
    const [data, setData] = useState<PredictionData | null>(null);
    const [passData, setPassData] = useState<PassPredictionData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!predictionOverride) {
            loadPredictions();
        }
    }, [difficulty, refreshKey, predictionOverride]);

    async function loadPredictions() {
        setLoading(true);
        setError("");
        try {
            const [regResult, clfResult] = await Promise.all([
                getLearningPrediction(difficulty),
                getPassPrediction(difficulty)
            ]);
            setData(regResult);
            setPassData(clfResult);
        } catch (err: any) {
            console.error("Unable to load learning predictions:", err);
            setError("Could not load performance forecast.");
        } finally {
            setLoading(false);
        }
    }

    if (predictionOverride) {
        if (!predictionOverride.available) {
            return (
                <Card
                    sx={{
                        mb: 3,
                        borderRadius: 3,
                        bgcolor: "rgba(15, 23, 42, 0.75)",
                        border: "1px solid rgba(20, 184, 166, 0.25)",
                        p: 2.5
                    }}
                >
                    <Alert
                        severity="info"
                        sx={{
                            bgcolor: "rgba(14, 165, 233, 0.1)",
                            border: "1px solid rgba(14, 165, 233, 0.25)",
                            color: "#38bdf8",
                            borderRadius: 2
                        }}
                    >
                        {predictionOverride.message || "Complete another quiz to unlock your personalized prediction."}
                    </Alert>
                </Card>
            );
        }

        const tierInfo = getConfidenceTier(predictionOverride.pass_probability);
        const passProbPct = predictionOverride.pass_probability !== undefined && predictionOverride.pass_probability !== null
            ? Math.round(predictionOverride.pass_probability * 100)
            : null;

        return (
            <Card
                sx={{
                    mb: 3,
                    borderRadius: 3,
                    bgcolor: "rgba(15, 23, 42, 0.85)",
                    border: "1px solid rgba(20, 184, 166, 0.35)",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
                    backdropFilter: "blur(12px)",
                    overflow: "hidden"
                }}
            >
                <CardContent sx={{ p: 3 }}>
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
                            <AutoGraphRoundedIcon sx={{ color: "#14b8a6", fontSize: 22 }} />
                        </Box>
                        <Box>
                            <Typography sx={{ color: "#F8FAFC", fontWeight: 700, fontSize: 16 }}>
                                YOUR NEXT QUIZ FORECAST
                            </Typography>
                            <Typography sx={{ color: "#94A3B8", fontSize: 12 }}>
                                Based on your updated learning performance
                            </Typography>
                        </Box>
                    </Stack>

                    <Box>
                        <Stack direction={{ xs: "column", sm: "row" }} alignItems="baseline" spacing={2} sx={{ mb: 1.5 }}>
                            <Typography sx={{ color: "#14B8A6", fontWeight: 800, fontSize: 28 }}>
                                Predicted Next Score: {predictionOverride.predicted_score}%
                            </Typography>
                        </Stack>

                        {tierInfo && passProbPct !== null && (
                            <Box
                                sx={{
                                    p: 1.5,
                                    mb: 2,
                                    borderRadius: 2,
                                    bgcolor: tierInfo.bgColor,
                                    border: `1px solid ${tierInfo.borderColor}`,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1.5
                                }}
                            >
                                {tierInfo.tier === "HIGH" && <CheckCircleOutlineRoundedIcon sx={{ color: tierInfo.color, fontSize: 22 }} />}
                                {tierInfo.tier === "MODERATE" && <WarningAmberRoundedIcon sx={{ color: tierInfo.color, fontSize: 22 }} />}
                                {tierInfo.tier === "LOW" && <HighlightOffRoundedIcon sx={{ color: tierInfo.color, fontSize: 22 }} />}
                                <Box>
                                    <Typography sx={{ color: tierInfo.color, fontWeight: 700, fontSize: 14 }}>
                                        {tierInfo.label}
                                    </Typography>
                                    <Typography sx={{ color: "#94a3b8", fontSize: 12 }}>
                                        Pass Probability (&ge;70% threshold): {passProbPct}%
                                    </Typography>
                                </Box>
                            </Box>
                        )}

                        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                            <Chip
                                label={`Target Difficulty: ${difficulty}`}
                                size="small"
                                sx={{
                                    bgcolor: "rgba(20, 184, 166, 0.15)",
                                    color: "#14b8a6",
                                    fontWeight: 600
                                }}
                            />

                            {predictionOverride.attempt_count && (
                                <Chip
                                    label={`Completed Attempts: ${predictionOverride.attempt_count}`}
                                    size="small"
                                    sx={{
                                        bgcolor: "rgba(255, 255, 255, 0.08)",
                                        color: "#94a3b8"
                                    }}
                                />
                            )}
                        </Stack>

                        <Typography sx={{ color: "#64748B", fontSize: 11, mt: 2, fontStyle: "italic" }}>
                            Forecast powered by Machine Learning ({predictionOverride.regression_model || "Extra Trees Regressor_v4.0"})
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        );
    }

    if (loading) {
        return (
            <Card
                sx={{
                    mb: 3,
                    borderRadius: 3,
                    bgcolor: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(20, 184, 166, 0.2)",
                    backdropFilter: "blur(12px)",
                    p: 2,
                    textAlign: "center"
                }}
            >
                <CircularProgress size={24} sx={{ color: "#14b8a6", my: 1 }} />
                <Typography sx={{ color: "#94a3b8", fontSize: 13 }}>
                    Calculating performance forecast...
                </Typography>
            </Card>
        );
    }

    if (error || !data) {
        return null;
    }

    const tierInfo = getConfidenceTier(passData?.probability_of_pass);

    return (
        <Card
            sx={{
                mb: 3,
                borderRadius: 3,
                bgcolor: "rgba(15, 23, 42, 0.75)",
                border: "1px solid rgba(20, 184, 166, 0.25)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                backdropFilter: "blur(12px)",
                overflow: "hidden"
            }}
        >
            <CardContent sx={{ p: 3 }}>
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
                        <AutoGraphRoundedIcon sx={{ color: "#14b8a6", fontSize: 22 }} />
                    </Box>
                    <Box>
                        <Typography sx={{ color: "#F8FAFC", fontWeight: 700, fontSize: 16 }}>
                            Learning Performance Forecast
                        </Typography>
                        <Typography sx={{ color: "#94A3B8", fontSize: 12 }}>
                            Based on your recent quiz performance
                        </Typography>
                    </Box>
                </Stack>

                {!data.has_sufficient_history ? (
                    <Alert
                        severity="info"
                        sx={{
                            bgcolor: "rgba(14, 165, 233, 0.1)",
                            border: "1px solid rgba(14, 165, 233, 0.25)",
                            color: "#38bdf8",
                            borderRadius: 2
                        }}
                    >
                        Complete at least 1 quiz to receive a personalized learning prediction.
                    </Alert>
                ) : (
                    <Box>
                        <Stack direction={{ xs: "column", sm: "row" }} alignItems="baseline" spacing={2} sx={{ mb: 1.5 }}>
                            <Typography sx={{ color: "#14B8A6", fontWeight: 800, fontSize: 28 }}>
                                Predicted Next Score: {data.predicted_percentage}%
                            </Typography>
                        </Stack>

                        {tierInfo && passData && passData.probability_of_pass !== null && (
                            <Box
                                sx={{
                                    p: 1.5,
                                    mb: 2,
                                    borderRadius: 2,
                                    bgcolor: tierInfo.bgColor,
                                    border: `1px solid ${tierInfo.borderColor}`,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1.5
                                }}
                            >
                                {tierInfo.tier === "HIGH" && <CheckCircleOutlineRoundedIcon sx={{ color: tierInfo.color, fontSize: 22 }} />}
                                {tierInfo.tier === "MODERATE" && <WarningAmberRoundedIcon sx={{ color: tierInfo.color, fontSize: 22 }} />}
                                {tierInfo.tier === "LOW" && <HighlightOffRoundedIcon sx={{ color: tierInfo.color, fontSize: 22 }} />}
                                <Box>
                                    <Typography sx={{ color: tierInfo.color, fontWeight: 700, fontSize: 14 }}>
                                        {tierInfo.label}
                                    </Typography>
                                    <Typography sx={{ color: "#94a3b8", fontSize: 12 }}>
                                        Pass Probability (&ge;70% threshold): {Math.round(passData.probability_of_pass * 100)}%
                                    </Typography>
                                </Box>
                            </Box>
                        )}

                        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                            {data.historical_avg !== null && (
                                <Chip
                                    label={`Historical Avg: ${data.historical_avg}%`}
                                    size="small"
                                    sx={{
                                        bgcolor: "rgba(255, 255, 255, 0.08)",
                                        color: "#f8fafc",
                                        fontWeight: 600
                                    }}
                                />
                            )}

                            <Chip
                                label={`Target Difficulty: ${difficulty}`}
                                size="small"
                                sx={{
                                    bgcolor: "rgba(20, 184, 166, 0.15)",
                                    color: "#14b8a6",
                                    fontWeight: 600
                                }}
                            />

                            <Chip
                                label={`Completed Attempts: ${data.attempt_count}`}
                                size="small"
                                sx={{
                                    bgcolor: "rgba(255, 255, 255, 0.08)",
                                    color: "#94a3b8"
                                }}
                            />
                        </Stack>

                        <Typography sx={{ color: "#64748B", fontSize: 11, mt: 2, fontStyle: "italic" }}>
                            Forecast powered by Machine Learning ({data.model_version || "Extra Trees Regressor_v4.0"})
                        </Typography>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
}
