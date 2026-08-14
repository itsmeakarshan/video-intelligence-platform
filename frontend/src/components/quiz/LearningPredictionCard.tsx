import { useEffect, useState } from "react";
import {
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Stack,
    Typography,
    Alert,
    Tooltip
} from "@mui/material";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { getLearningPrediction } from "../../api/api";

interface PredictionInterval {
    lower: number;
    upper: number;
    margin: number;
    coverage_level: number;
    empirical_coverage: number;
    method: string;
    description: string;
}

interface ExplanationFactor {
    feature_key: string;
    feature_name: string;
    shap_value: number;
    impact_direction: "positive" | "negative";
}

interface SHAPExplanation {
    base_value: number;
    top_positive: ExplanationFactor[];
    top_negative: ExplanationFactor[];
}

interface PredictionData {
    has_sufficient_history: boolean;
    predicted_percentage: number | null;
    raw_predicted_percentage?: number | null;
    attempt_count: number;
    historical_avg: number | null;
    target_difficulty: string | null;
    model_version: string | null;
    message: string | null;
    prediction_interval?: PredictionInterval | null;
    explanation?: SHAPExplanation | null;
}

interface SubmissionPrediction {
    available: boolean;
    predicted_score?: number | null;
    attempt_count?: number | null;
    target_difficulty?: string | null;
    regression_model?: string | null;
    reason?: string | null;
    message?: string | null;
    prediction_interval?: PredictionInterval | null;
    explanation?: SHAPExplanation | null;
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
            const regResult = await getLearningPrediction(difficulty);
            setData(regResult);
        } catch (err: any) {
            console.error("Unable to load learning predictions:", err);
            setError("Could not load performance forecast.");
        } finally {
            setLoading(false);
        }
    }

    const interval = predictionOverride ? predictionOverride.prediction_interval : data?.prediction_interval;
    const explanation = predictionOverride ? predictionOverride.explanation : data?.explanation;
    const predictedScore = predictionOverride ? predictionOverride.predicted_score : data?.predicted_percentage;
    const attemptCount = predictionOverride ? predictionOverride.attempt_count : data?.attempt_count;
    const modelName = (predictionOverride ? predictionOverride.regression_model : data?.model_version) || "Extra Trees Regressor_v4.0";

    if (predictionOverride && !predictionOverride.available) {
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

    if (!predictionOverride && (error || !data)) {
        return null;
    }

    const hasHistory = predictionOverride ? true : data?.has_sufficient_history;

    return (
        <Card
            sx={{
                mb: 3,
                borderRadius: 3,
                bgcolor: "rgba(15, 23, 42, 0.85)",
                border: "1px solid rgba(20, 184, 166, 0.30)",
                boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
                backdropFilter: "blur(14px)",
                overflow: "hidden"
            }}
        >
            <CardContent sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
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
                        <AutoGraphRoundedIcon sx={{ color: "#14b8a6", fontSize: 22 }} />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography sx={{ color: "#F8FAFC", fontWeight: 800, fontSize: 18, letterSpacing: "0.2px" }}>
                            PREDICTED NEXT SCORE
                        </Typography>
                        <Typography sx={{ color: "#94A3B8", fontSize: 13.5 }}>
                            Forecast based on your historical learning data
                        </Typography>
                    </Box>
                </Stack>

                {!hasHistory ? (
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
                        {/* Core Forecast Display */}
                        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} spacing={2} sx={{ mb: 2 }}>
                            <Typography sx={{ color: "#14B8A6", fontWeight: 900, fontSize: 40, lineHeight: 1 }}>
                                {predictedScore}%
                            </Typography>

                            {/* Conformal Prediction Interval Badge */}
                            {interval && (
                                <Tooltip title={interval.description} arrow placement="top">
                                    <Box
                                        sx={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 1,
                                            px: 2,
                                            py: 0.8,
                                            borderRadius: 2.5,
                                            bgcolor: "rgba(16, 185, 129, 0.12)",
                                            border: "1px solid rgba(16, 185, 129, 0.35)",
                                            cursor: "help"
                                        }}
                                    >
                                        <Typography sx={{ color: "#34D399", fontWeight: 700, fontSize: 14.5 }}>
                                            Expected range: {interval.lower}% – {interval.upper}%
                                        </Typography>
                                        <Chip
                                            label={`${interval.coverage_level}% Interval`}
                                            size="small"
                                            sx={{
                                                height: 22,
                                                fontSize: 11.5,
                                                fontWeight: 800,
                                                bgcolor: "rgba(16, 185, 129, 0.25)",
                                                color: "#6EE7B7"
                                            }}
                                        />
                                        <InfoOutlinedIcon sx={{ color: "#34D399", fontSize: 16 }} />
                                    </Box>
                                </Tooltip>
                            )}
                        </Stack>

                        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mb: 2.5 }}>
                            {data?.historical_avg !== undefined && data.historical_avg !== null && (
                                <Chip
                                    label={`Historical Avg: ${data.historical_avg}%`}
                                    size="small"
                                    sx={{
                                        bgcolor: "rgba(255, 255, 255, 0.08)",
                                        color: "#f8fafc",
                                        fontWeight: 700,
                                        fontSize: 13,
                                        height: 28,
                                        px: 0.5
                                    }}
                                />
                            )}

                            <Chip
                                label={`Target Difficulty: ${difficulty}`}
                                size="small"
                                sx={{
                                    bgcolor: "rgba(20, 184, 166, 0.18)",
                                    color: "#14b8a6",
                                    fontWeight: 700,
                                    fontSize: 13,
                                    height: 28,
                                    px: 0.5
                                }}
                            />

                            {attemptCount && (
                                <Chip
                                    label={`Completed Attempts: ${attemptCount}`}
                                    size="small"
                                    sx={{
                                        bgcolor: "rgba(255, 255, 255, 0.08)",
                                        color: "#cbd5e1",
                                        fontWeight: 600,
                                        fontSize: 13,
                                        height: 28,
                                        px: 0.5
                                    }}
                                />
                            )}
                        </Stack>

                        {/* SHAP Explainability Section: WHY THIS PREDICTION? */}
                        {explanation && (explanation.top_positive.length > 0 || explanation.top_negative.length > 0) && (
                            <Box
                                sx={{
                                    mt: 2.5,
                                    pt: 2.5,
                                    borderTop: "1px dashed rgba(255, 255, 255, 0.15)"
                                }}
                            >
                                <Typography sx={{ color: "#F8FAFC", fontWeight: 800, fontSize: 15, mb: 1.5, letterSpacing: "0.3px" }}>
                                    WHY THIS PREDICTION? <Typography component="span" sx={{ color: "#94A3B8", fontSize: 12.5, fontWeight: 500 }}>(SHAP Feature Contributions)</Typography>
                                </Typography>

                                <Stack spacing={1.2}>
                                    {/* Top Positive Drivers */}
                                    {explanation.top_positive.map((factor) => (
                                        <Stack
                                            key={factor.feature_key}
                                            direction="row"
                                            alignItems="center"
                                            spacing={1.5}
                                            sx={{
                                                bgcolor: "rgba(16, 185, 129, 0.10)",
                                                border: "1px solid rgba(16, 185, 129, 0.28)",
                                                borderRadius: 2,
                                                px: 2,
                                                py: 1
                                            }}
                                        >
                                            <TrendingUpRoundedIcon sx={{ color: "#34D399", fontSize: 18 }} />
                                            <Typography sx={{ color: "#F1F5F9", fontSize: 14, fontWeight: 600, flexGrow: 1 }}>
                                                {factor.feature_name}
                                            </Typography>
                                            <Typography sx={{ color: "#34D399", fontSize: 14.5, fontWeight: 800 }}>
                                                +{factor.shap_value}%
                                            </Typography>
                                        </Stack>
                                    ))}

                                    {/* Top Negative Drivers */}
                                    {explanation.top_negative.map((factor) => (
                                        <Stack
                                            key={factor.feature_key}
                                            direction="row"
                                            alignItems="center"
                                            spacing={1.5}
                                            sx={{
                                                bgcolor: "rgba(244, 63, 94, 0.10)",
                                                border: "1px solid rgba(244, 63, 94, 0.28)",
                                                borderRadius: 2,
                                                px: 2,
                                                py: 1
                                            }}
                                        >
                                            <TrendingDownRoundedIcon sx={{ color: "#F87171", fontSize: 18 }} />
                                            <Typography sx={{ color: "#F1F5F9", fontSize: 14, fontWeight: 600, flexGrow: 1 }}>
                                                {factor.feature_name}
                                            </Typography>
                                            <Typography sx={{ color: "#F87171", fontSize: 14.5, fontWeight: 800 }}>
                                                {factor.shap_value}%
                                            </Typography>
                                        </Stack>
                                    ))}
                                </Stack>
                            </Box>
                        )}

                        <Typography sx={{ color: "#64748B", fontSize: 12.5, mt: 2.5, fontStyle: "italic" }}>
                            Forecast powered by Machine Learning ({modelName})
                        </Typography>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
}
