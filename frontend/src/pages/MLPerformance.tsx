import { useEffect, useState } from "react";
import {
    Box,
    Card,
    CardContent,
    Container,
    Chip,
    CircularProgress,
    Grid,
    Paper,
    Stack,
    Typography,
    Alert,
    Button,
    Tooltip as MuiTooltip
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ScienceIcon from "@mui/icons-material/Science";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LayersIcon from "@mui/icons-material/Layers";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import ShieldIcon from "@mui/icons-material/Shield";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import { getMLPerformance } from "../api/api";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from "recharts";

interface MetricCardProps {
    title: string;
    value: string | number;
    explanation: string;
    subtext?: string;
    badge?: string;
    color?: string;
    tooltip: string;
}

function MetricStatCard({ title, value, explanation, subtext, badge, color = "#14b8a6", tooltip }: MetricCardProps) {
    return (
        <Card
            sx={{
                borderRadius: 2.5,
                bgcolor: "rgba(30, 41, 59, 0.65)",
                border: `1px solid ${color}35`,
                backdropFilter: "blur(12px)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "all 0.25s ease-in-out",
                "&:hover": {
                    transform: "translateY(-3px)",
                    borderColor: color,
                    boxShadow: `0 10px 25px ${color}25`
                }
            }}
        >
            <CardContent sx={{ p: 2.2, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
                <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography sx={{ color: "#94A3B8", fontSize: 11, fontWeight: 700, letterSpacing: "0.5px" }}>
                            {title}
                        </Typography>
                        <MuiTooltip title={tooltip} arrow placement="top">
                            <Box sx={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                                <InfoOutlinedIcon sx={{ color: "#64748B", fontSize: 15, "&:hover": { color: color } }} />
                            </Box>
                        </MuiTooltip>
                    </Stack>

                    <Stack direction="row" alignItems="baseline" spacing={1} sx={{ my: 0.8 }}>
                        <Typography variant="h4" sx={{ color: color, fontWeight: 800, fontSize: { xs: "1.6rem", md: "1.9rem" } }}>
                            {value}
                        </Typography>
                        {badge && (
                            <Chip
                                label={badge}
                                size="small"
                                sx={{ bgcolor: `${color}20`, color: color, fontWeight: 700, fontSize: 10, height: 20 }}
                            />
                        )}
                    </Stack>

                    <Typography sx={{ color: "#F8FAFC", fontSize: 12.5, fontWeight: 600, lineHeight: 1.3 }}>
                        {explanation}
                    </Typography>
                </Box>

                {subtext && (
                    <Typography sx={{ color: "#64748B", fontSize: 11, mt: 1.2 }}>
                        {subtext}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
}

// Custom Tooltip for MAE & RMSE Error Charts
const CustomErrorTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <Paper
                elevation={0}
                sx={{
                    p: 1.5,
                    bgcolor: "rgba(15, 23, 42, 0.95)",
                    border: "1px solid rgba(20, 184, 166, 0.4)",
                    borderRadius: 2.5,
                    boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                    backdropFilter: "blur(12px)"
                }}
            >
                <Typography sx={{ fontWeight: 700, color: "#F8FAFC", fontSize: 12, mb: 0.8 }}>
                    {label}
                </Typography>
                <Stack spacing={0.5}>
                    {payload.map((entry: any, index: number) => (
                        <Stack key={`tooltip-err-${index}`} direction="row" alignItems="center" spacing={1}>
                            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: entry.color }} />
                            <Typography sx={{ color: "#94A3B8", fontSize: 11, fontWeight: 500 }}>
                                {entry.name}:
                            </Typography>
                            <Typography sx={{ color: "#F8FAFC", fontSize: 11, fontWeight: 700 }}>
                                {entry.value}%
                            </Typography>
                        </Stack>
                    ))}
                </Stack>
            </Paper>
        );
    }
    return null;
};

// Custom Tooltip for Model Comparison Chart
const CustomComparisonTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const itemData = payload[0].payload;
        const isProd = itemData.isProduction;
        return (
            <Paper
                elevation={0}
                sx={{
                    p: 1.5,
                    bgcolor: "rgba(15, 23, 42, 0.95)",
                    border: `1px solid ${isProd ? "#10b981" : "rgba(56, 189, 248, 0.4)"}`,
                    borderRadius: 2.5,
                    boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                    backdropFilter: "blur(12px)"
                }}
            >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.8 }}>
                    <Typography sx={{ fontWeight: 700, color: "#F8FAFC", fontSize: 12 }}>
                        {itemData.fullModelName || label}
                    </Typography>
                    {isProd && (
                        <Chip
                            label="Selected Production Model"
                            size="small"
                            sx={{ bgcolor: "rgba(16, 185, 129, 0.2)", color: "#10b981", fontWeight: 700, fontSize: 10, height: 18 }}
                        />
                    )}
                </Stack>
                <Stack spacing={0.5}>
                    {payload.map((entry: any, index: number) => (
                        <Stack key={`tooltip-comp-${index}`} direction="row" alignItems="center" spacing={1}>
                            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: isProd ? "#10b981" : "#38bdf8" }} />
                            <Typography sx={{ color: "#94A3B8", fontSize: 11, fontWeight: 500 }}>
                                {entry.name}:
                            </Typography>
                            <Typography sx={{ color: "#F8FAFC", fontSize: 11, fontWeight: 700 }}>
                                {entry.value}{entry.name.includes("R²") ? "" : "%"}
                            </Typography>
                        </Stack>
                    ))}
                </Stack>
            </Paper>
        );
    }
    return null;
};

// Clean, Responsive Custom Legend for Model Comparison Charts
const CustomComparisonLegend = ({ primaryColor = "#38bdf8", prodColor = "#14b8a6", prodLabel = "Extra Trees (Production)" }) => (
    <Stack direction="row" spacing={3} justifyContent="center" alignItems="center" sx={{ pt: 2, pb: 0.5 }}>
        <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 12, height: 12, borderRadius: "2px", bgcolor: primaryColor }} />
            <Typography sx={{ color: "#94A3B8", fontSize: 12, fontWeight: 600 }}>
                Alternative / Baseline Models
            </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 12, height: 12, borderRadius: "2px", bgcolor: prodColor, border: `1px solid ${prodColor}` }} />
            <Typography sx={{ color: "#F8FAFC", fontSize: 12, fontWeight: 700 }}>
                {prodLabel}
            </Typography>
        </Stack>
    </Stack>
);

export default function MLPerformance() {
    const navigate = useNavigate();

    const [data, setData] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const res = await getMLPerformance();
            setData(res);
        } catch (err: any) {
            console.error("Failed to load ML Performance data:", err);
            setError("Failed to fetch ML performance metrics from backend API.");
        } finally {
            setLoading(false);
        }
    }

    const regModel = data?.selected_regression_model || {
        group_kfold_mae: 3.80,
        group_kfold_rmse: 4.96,
        group_kfold_r2: 0.861,
        unseen_user_mae: 3.13,
        unseen_user_rmse: 3.89,
        unseen_user_r2: 0.912,
        temporal_mae: 3.60,
        temporal_rmse: 4.57,
        temporal_r2: 0.908
    };

    const meta = data?.system_metadata || {
        total_users: 95,
        total_attempts: 636,
        total_features: 38,
        regression_model: "Extra Trees Regressor_v4.0"
    };

    const datasetSummary = data?.dataset_summary || {
        raw_learners_count: 101,
        clean_modeling_learners_count: 95,
        total_clean_attempts: 636
    };

    // Real Baseline Comparison Data (from authoritative report)
    const rawComparison = data?.regression_comparison || [
        { model: "Historical Mean Baseline", group_kfold_mae: 11.187, group_kfold_r2: -0.0258 },
        { model: "Recent 3-Attempt Avg Baseline", group_kfold_mae: 7.002, group_kfold_r2: 0.5868 },
        { model: "Most Recent Score Baseline", group_kfold_mae: 5.275, group_kfold_r2: 0.7385 },
        { model: "Random Forest Regressor", group_kfold_mae: 3.847, group_kfold_r2: 0.8569 },
        { model: "HistGradientBoosting Regressor", group_kfold_mae: 3.829, group_kfold_r2: 0.8573 },
        { model: "Extra Trees Regressor", group_kfold_mae: 3.800, group_kfold_r2: 0.8606 },
        { model: "Gradient Boosting Regressor", group_kfold_mae: 3.762, group_kfold_r2: 0.8593 },
        { model: "Ridge Regression", group_kfold_mae: 3.559, group_kfold_r2: 0.8717 }
    ];

    const baselineMaeData = rawComparison.map((item: any) => {
        let shortName = item.model;
        if (item.model.includes("Historical Mean")) shortName = "Mean Baseline";
        else if (item.model.includes("3-Attempt")) shortName = "3-Attempt Avg";
        else if (item.model.includes("Most Recent")) shortName = "Recent Score";
        else if (item.model.includes("Random Forest")) shortName = "Random Forest";
        else if (item.model.includes("Gradient Boosting")) shortName = "Gradient Boost";
        else if (item.model.includes("Extra Trees")) shortName = "Extra Trees (Prod)";
        else if (item.model.includes("HistGradientBoosting")) shortName = "HistGradientBoost";
        else if (item.model.includes("Ridge")) shortName = "Ridge Regressor";

        return {
            name: shortName,
            fullModelName: item.model,
            isProduction: item.model.includes("Extra Trees"),
            "GroupKFold MAE (%)": Math.round(item.group_kfold_mae * 100) / 100
        };
    });

    const baselineR2Data = rawComparison.map((item: any) => {
        let shortName = item.model;
        if (item.model.includes("Historical Mean")) shortName = "Mean Baseline";
        else if (item.model.includes("3-Attempt")) shortName = "3-Attempt Avg";
        else if (item.model.includes("Most Recent")) shortName = "Recent Score";
        else if (item.model.includes("Random Forest")) shortName = "Random Forest";
        else if (item.model.includes("Gradient Boosting")) shortName = "Gradient Boost";
        else if (item.model.includes("Extra Trees")) shortName = "Extra Trees (Prod)";
        else if (item.model.includes("HistGradientBoosting")) shortName = "HistGradientBoost";
        else if (item.model.includes("Ridge")) shortName = "Ridge Regressor";

        return {
            name: shortName,
            fullModelName: item.model,
            isProduction: item.model.includes("Extra Trees"),
            "R² Score": Math.round(item.group_kfold_r2 * 1000) / 1000
        };
    });

    // Generalisation Strategy comparison chart data (Grouped MAE & RMSE %)
    const validationStrategyData = [
        {
            strategy: "GroupKFold (k=5)",
            "MAE (%)": regModel.group_kfold_mae,
            "RMSE (%)": regModel.group_kfold_rmse || 4.96,
            r2: regModel.group_kfold_r2 || 0.861
        },
        {
            strategy: "Unseen-User (Holdout)",
            "MAE (%)": regModel.unseen_user_mae || 3.13,
            "RMSE (%)": regModel.unseen_user_rmse || 3.89,
            r2: regModel.unseen_user_r2 || 0.912
        },
        {
            strategy: "Global Temporal (80/20)",
            "MAE (%)": regModel.temporal_mae || 3.60,
            "RMSE (%)": regModel.temporal_rmse || 4.57,
            r2: regModel.temporal_r2 || 0.908
        }
    ];

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "#0F172A", color: "#F8FAFC", pb: 8 }}>
            <Navbar />

            <Container maxWidth={false} sx={{ maxWidth: "2560px", width: { xs: "96%", md: "88%", lg: "80%" }, mx: "auto", px: { xs: 2, sm: 3, md: 4 }, pt: 4 }}>
                {/* Header Navigation */}
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 4 }} flexWrap="wrap" gap={2}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Button
                            startIcon={<ArrowBackIcon />}
                            onClick={() => navigate("/")}
                            sx={{ color: "#94A3B8", borderColor: "rgba(148, 163, 184, 0.2)", "&:hover": { color: "#F8FAFC" } }}
                            variant="outlined"
                        >
                            Back to Dashboard
                        </Button>
                        <Chip
                            icon={<ScienceIcon sx={{ fontSize: 16, color: "#38BDF8" }} />}
                            label="MACHINE LEARNING EVALUATION REPORT"
                            sx={{ bgcolor: "rgba(56, 189, 248, 0.12)", color: "#38BDF8", fontWeight: 700, px: 1 }}
                        />
                    </Stack>
                    <Chip
                        icon={<CheckCircleOutlineIcon sx={{ fontSize: 16, color: "#10B981" }} />}
                        label="v4.0 PRODUCTION MODEL EVALUATION"
                        sx={{ bgcolor: "rgba(16, 185, 129, 0.12)", color: "#10B981", fontWeight: 700 }}
                    />
                </Stack>

                {loading && (
                    <Box sx={{ display: "flex", justifyContent: "center", my: 10 }}>
                        <CircularProgress sx={{ color: "#38BDF8" }} />
                    </Box>
                )}

                {error && (
                    <Alert severity="error" sx={{ mb: 4 }}>
                        {error}
                    </Alert>
                )}

                {!loading && data && (
                    <Stack spacing={4}>
                        {/* 1. MODEL OVERVIEW */}
                        <Card
                            sx={{
                                borderRadius: 3,
                                bgcolor: "rgba(30, 41, 59, 0.8)",
                                border: "1px solid rgba(56, 189, 248, 0.3)",
                                backdropFilter: "blur(12px)",
                                boxShadow: "0 10px 30px rgba(0,0,0,0.4)"
                            }}
                        >
                            <CardContent sx={{ p: 4 }}>
                                <Grid container spacing={3} alignItems="center">
                                    <Grid size={{ xs: 12, md: 7 }}>
                                        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
                                            <Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: "rgba(56, 189, 248, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <AutoGraphIcon sx={{ color: "#38BDF8", fontSize: 26 }} />
                                            </Box>
                                            <Box>
                                                <Typography variant="h4" sx={{ fontWeight: 800, color: "#F8FAFC" }}>
                                                    Extra Trees Regressor
                                                </Typography>
                                                <Typography sx={{ color: "#94A3B8", fontSize: 16 }}>
                                                    Selected Production Next-Quiz Score Forecast Model
                                                </Typography>
                                            </Box>
                                        </Stack>
                                        <Typography sx={{ color: "#CBD5E1", fontSize: 16, mb: 2 }}>
                                            Trained on clean learner data.
                                        </Typography>
                                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                            <Chip label={`Algorithm: Extra Trees Regressor`} size="small" sx={{ bgcolor: "rgba(20, 184, 166, 0.15)", color: "#14b8a6", fontWeight: 700 }} />
                                            <Chip label={`Feature Set: D_CORE_LEARNING (${meta.total_features || 38} Features)`} size="small" sx={{ bgcolor: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", fontWeight: 700 }} />
                                            <Chip label={`Clean Learners: ${meta.total_users || 95}`} size="small" sx={{ bgcolor: "rgba(255, 255, 255, 0.08)", color: "#94a3b8" }} />
                                            <Chip label={`Modelling Instances: ${datasetSummary.total_clean_attempts || meta.total_attempts || 636}`} size="small" sx={{ bgcolor: "rgba(255, 255, 255, 0.08)", color: "#94a3b8" }} />
                                            <Chip label={`User 1 & 2 Excluded: YES`} size="small" sx={{ bgcolor: "rgba(16, 185, 129, 0.15)", color: "#10b981", fontWeight: 700 }} />
                                        </Stack>
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 5 }}>
                                        <MuiTooltip title="Final modelling cohort after data-quality screening." arrow placement="top">
                                            <Paper sx={{ p: 2.5, bgcolor: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(20, 184, 166, 0.25)", borderRadius: 2.5, cursor: "pointer" }}>
                                                <Typography sx={{ fontWeight: 700, fontSize: 13, color: "#14b8a6", mb: 1, letterSpacing: "0.5px" }}>
                                                    DATA & EVALUATION COHORT
                                                </Typography>
                                                <Stack spacing={1}>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <CheckCircleOutlineIcon sx={{ color: "#10b981", fontSize: 16 }} />
                                                        <Typography sx={{ color: "#f8fafc", fontSize: 12, fontWeight: 500 }}>
                                                            {datasetSummary.raw_learners_count || 101} raw learners → {datasetSummary.clean_modeling_learners_count || 95} clean learners after data-quality screening
                                                        </Typography>
                                                    </Stack>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <CheckCircleOutlineIcon sx={{ color: "#10b981", fontSize: 16 }} />
                                                        <Typography sx={{ color: "#f8fafc", fontSize: 12, fontWeight: 500 }}>
                                                            {datasetSummary.total_clean_attempts || 636} leak-free modelling instances
                                                        </Typography>
                                                    </Stack>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <CheckCircleOutlineIcon sx={{ color: "#10b981", fontSize: 16 }} />
                                                        <Typography sx={{ color: "#f8fafc", fontSize: 12, fontWeight: 500 }}>
                                                            Evaluation includes GroupKFold, unseen-user and temporal validation
                                                        </Typography>
                                                    </Stack>
                                                </Stack>
                                            </Paper>
                                        </MuiTooltip>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>

                        {/* 2. EXECUTIVE PERFORMANCE MATRIX (3 EQUAL-WIDTH COLUMNS) */}
                        <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#38BDF8", mb: 2, letterSpacing: "0.5px" }}>
                                EXECUTIVE PERFORMANCE MATRIX
                            </Typography>
                            <Grid container spacing={3} alignItems="stretch">
                                {/* COLUMN 1: MODEL ACCURACY */}
                                <Grid size={{ xs: 12, md: 4 }}>
                                    <Paper
                                        sx={{
                                            p: 2.5,
                                            height: "100%",
                                            bgcolor: "rgba(30, 41, 59, 0.5)",
                                            border: "1px solid rgba(20, 184, 166, 0.25)",
                                            borderRadius: 3,
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 2
                                        }}
                                    >
                                        <Typography sx={{ color: "#14b8a6", fontSize: 18, fontWeight: 800, letterSpacing: "1px" }}>
                                            1. MODEL ACCURACY
                                        </Typography>

                                        <MetricStatCard
                                            title="GROUPKFOLD MAE"
                                            value={`${regModel.group_kfold_mae}%`}
                                            explanation="Mean Absolute Error across 5 folds"
                                            subtext="Average percentage error on score predictions"
                                            badge="Cross-Val"
                                            color="#14b8a6"
                                            tooltip="GroupKFold ensures no user's attempts appear in both train and test splits during cross-validation."
                                        />

                                        <MetricStatCard
                                            title="GROUPKFOLD RMSE"
                                            value={`${regModel.group_kfold_rmse}%`}
                                            explanation="Root Mean Squared Error"
                                            subtext="Penalizes larger forecast errors"
                                            badge="Variance"
                                            color="#38bdf8"
                                            tooltip="RMSE penalizes larger forecast errors more heavily than MAE."
                                        />

                                        <MetricStatCard
                                            title="EXPLAINED VARIANCE (R²)"
                                            value={`${regModel.group_kfold_r2}`}
                                            explanation="Proportion of score variance explained"
                                            subtext="86.1% variance explained vs baseline"
                                            badge="R² Score"
                                            color="#10b981"
                                            tooltip="R² indicates how well the model predicts variations in student quiz scores compared to mean guessing."
                                        />
                                    </Paper>
                                </Grid>

                                {/* COLUMN 2: PIPELINE RELIABILITY & SAFETY */}
                                <Grid size={{ xs: 12, md: 4 }}>
                                    <Paper
                                        sx={{
                                            p: 2.5,
                                            height: "100%",
                                            bgcolor: "rgba(30, 41, 59, 0.5)",
                                            border: "1px solid rgba(56, 189, 248, 0.25)",
                                            borderRadius: 3,
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 2
                                        }}
                                    >
                                        <Typography sx={{ color: "#38bdf8", fontSize: 18, fontWeight: 800, letterSpacing: "1px" }}>
                                            2. PIPELINE RELIABILITY & SAFETY
                                        </Typography>

                                        <MetricStatCard
                                            title="PREDICTION BOUNDS"
                                            value="PASS"
                                            explanation="Predictions constrained to the valid 0–100% score range."
                                            subtext="Zero out-of-bounds score forecasts"
                                            badge="Bounded"
                                            color="#10b981"
                                            tooltip="Validates that score forecasts are strictly clipped to [0, 100] percentage bounds under extreme synthetic feature inputs."
                                        />

                                        <MetricStatCard
                                            title="FEATURE CONTRACT"
                                            value={`${meta.total_features || 38} Features`}
                                            explanation="D_CORE_LEARNING domain feature set"
                                            subtext="Frequency-free & leak-free domain subset"
                                            badge="D_CORE"
                                            color="#38bdf8"
                                            tooltip="Model feature set selected via ablation to prevent synthetic frequency artifacts and ensure real-world generalization."
                                        />

                                        <MetricStatCard
                                            title="LEAKAGE TESTS"
                                            value="PASS"
                                            explanation="Leak-free feature construction and learner-level validation checks."
                                            subtext="Strict temporal & user isolation contract"
                                            badge="Leak-Free"
                                            color="#14b8a6"
                                            tooltip="Verifies zero contamination between historical feature calculations and target quiz scores."
                                        />
                                    </Paper>
                                </Grid>

                                {/* COLUMN 3: GENERALISATION & HOLDOUT */}
                                <Grid size={{ xs: 12, md: 4 }}>
                                    <Paper
                                        sx={{
                                            p: 2.5,
                                            height: "100%",
                                            bgcolor: "rgba(30, 41, 59, 0.5)",
                                            border: "1px solid rgba(245, 158, 11, 0.25)",
                                            borderRadius: 3,
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 2
                                        }}
                                    >
                                        <Typography sx={{ color: "#f59e0b", fontSize: 18, fontWeight: 800, letterSpacing: "1px" }}>
                                            3. GENERALISATION & HOLDOUT
                                        </Typography>

                                        <MetricStatCard
                                            title="UNSEEN-USER MAE"
                                            value={`${regModel.unseen_user_mae}%`}
                                            explanation="MAE evaluated on learners that were not used for training."
                                            subtext="Zero user overlap validation"
                                            badge="Holdout"
                                            color="#f59e0b"
                                            tooltip="Evaluated strictly on learners completely absent from the training set."
                                        />

                                        <MetricStatCard
                                            title="GLOBAL TEMPORAL MAE"
                                            value={`${regModel.temporal_mae}%`}
                                            explanation="MAE evaluated on chronologically future attempts."
                                            subtext="80% earliest train / 20% latest test split"
                                            badge="Chronological"
                                            color="#8b5cf6"
                                            tooltip="Verifies model accuracy when predicting future attempts in natural temporal order."
                                        />

                                        <MetricStatCard
                                            title="LEARNER ISOLATION"
                                            value="PASS"
                                            explanation="Users 1 & 2 excluded from model training set"
                                            subtext="Preserves real user test isolation contract"
                                            badge="Isolated"
                                            color="#10b981"
                                            tooltip="Ensures real user test accounts remain strictly unexposed during training phase."
                                        />
                                    </Paper>
                                </Grid>
                            </Grid>
                        </Box>

                        {/* 3. MODEL COMPARISON */}
                        <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#14B8A6", mb: 1.5, letterSpacing: "0.5px" }}>
                                MODEL COMPARISON
                            </Typography>
                            <Grid container spacing={3} alignItems="stretch">
                                {/* CARD A: Prediction Error vs Baselines & Alternative Models */}
                                <Grid size={{ xs: 12, lg: 6 }}>
                                    <Card
                                        sx={{
                                            borderRadius: 3,
                                            bgcolor: "rgba(30, 41, 59, 0.7)",
                                            border: "1px solid rgba(20, 184, 166, 0.25)",
                                            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                                            height: "100%"
                                        }}
                                    >
                                        <CardContent sx={{ p: 3 }}>
                                            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
                                                <AssessmentIcon sx={{ color: "#14b8a6" }} />
                                                <Typography variant="h6" sx={{ fontWeight: 700, color: "#F8FAFC" }}>
                                                    Prediction Error vs Baselines & Alternative Models
                                                </Typography>
                                            </Stack>
                                            <Typography sx={{ color: "#94A3B8", fontSize: 13, mb: 3 }}>
                                                GroupKFold Mean Absolute Error (MAE %) across evaluated models. Lower is better.
                                            </Typography>

                                            <Box sx={{ height: 440, width: "100%" }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={baselineMaeData} margin={{ top: 15, right: 20, left: -10, bottom: 65 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                                        <XAxis
                                                            dataKey="name"
                                                            stroke="#94a3b8"
                                                            fontSize={10.5}
                                                            interval={0}
                                                            angle={-32}
                                                            textAnchor="end"
                                                            tickMargin={6}
                                                        />
                                                        <YAxis stroke="#94a3b8" domain={[0, 12]} fontSize={11} unit="%" />
                                                        <RechartsTooltip content={<CustomComparisonTooltip />} />
                                                        <Bar dataKey="GroupKFold MAE (%)" radius={[6, 6, 0, 0]}>
                                                            {baselineMaeData.map((entry: any, index: number) => (
                                                                <Cell
                                                                    key={`cell-mae-${index}`}
                                                                    fill={entry.isProduction ? "#10b981" : "#38bdf8"}
                                                                />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </Box>
                                            <CustomComparisonLegend primaryColor="#38bdf8" prodColor="#10b981" prodLabel="Extra Trees (Production)" />
                                        </CardContent>
                                    </Card>
                                </Grid>

                                {/* CARD B: Explained Variance (R²) vs Baselines & Alternative Models */}
                                <Grid size={{ xs: 12, lg: 6 }}>
                                    <Card
                                        sx={{
                                            borderRadius: 3,
                                            bgcolor: "rgba(30, 41, 59, 0.7)",
                                            border: "1px solid rgba(16, 185, 129, 0.25)",
                                            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                                            height: "100%"
                                        }}
                                    >
                                        <CardContent sx={{ p: 3 }}>
                                            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
                                                <ShowChartIcon sx={{ color: "#10b981" }} />
                                                <Typography variant="h6" sx={{ fontWeight: 700, color: "#F8FAFC" }}>
                                                    Explained Variance (R²) vs Baselines & Alternative Models
                                                </Typography>
                                            </Stack>
                                            <Typography sx={{ color: "#94A3B8", fontSize: 13, mb: 3 }}>
                                                Proportion of score variance explained by model (R² on 0.0 to 1.0 scale). Higher is better.
                                            </Typography>

                                            <Box sx={{ height: 440, width: "100%" }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={baselineR2Data} margin={{ top: 15, right: 20, left: -10, bottom: 65 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                                        <XAxis
                                                            dataKey="name"
                                                            stroke="#94a3b8"
                                                            fontSize={10.5}
                                                            interval={0}
                                                            angle={-32}
                                                            textAnchor="end"
                                                            tickMargin={6}
                                                        />
                                                        <YAxis stroke="#94a3b8" domain={[-0.1, 1.0]} fontSize={11} />
                                                        <RechartsTooltip content={<CustomComparisonTooltip />} />
                                                        <Bar dataKey="R² Score" radius={[6, 6, 0, 0]}>
                                                            {baselineR2Data.map((entry: any, index: number) => (
                                                                <Cell
                                                                    key={`cell-r2-${index}`}
                                                                    fill={entry.isProduction ? "#10b981" : "#38bdf8"}
                                                                />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </Box>
                                            <CustomComparisonLegend primaryColor="#38bdf8" prodColor="#10b981" prodLabel="Extra Trees (Production)" />
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        </Box>

                        {/* 4. GENERALISATION */}
                        <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#8B5CF6", mb: 1.5, letterSpacing: "0.5px" }}>
                                GENERALISATION
                            </Typography>
                            <Card
                                sx={{
                                    borderRadius: 3,
                                    bgcolor: "rgba(30, 41, 59, 0.7)",
                                    border: "1px solid rgba(139, 92, 246, 0.25)",
                                    boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
                                }}
                            >
                                <CardContent sx={{ p: 3 }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} sx={{ mb: 1 }}>
                                        <Stack direction="row" alignItems="center" spacing={1.5}>
                                            <LayersIcon sx={{ color: "#8b5cf6" }} />
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: "#F8FAFC" }}>
                                                Generalisation Across Validation Strategies
                                            </Typography>
                                        </Stack>
                                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                            <Chip label={`GroupKFold R²: ${regModel.group_kfold_r2 || 0.861}`} size="small" sx={{ bgcolor: "rgba(16, 185, 129, 0.15)", color: "#10b981", fontWeight: 700 }} />
                                            <Chip label={`Unseen-User R²: ${regModel.unseen_user_r2 || 0.912}`} size="small" sx={{ bgcolor: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", fontWeight: 700 }} />
                                            <Chip label={`Global Temporal R²: ${regModel.temporal_r2 || 0.908}`} size="small" sx={{ bgcolor: "rgba(139, 92, 246, 0.15)", color: "#8b5cf6", fontWeight: 700 }} />
                                        </Stack>
                                    </Stack>
                                    <Typography sx={{ color: "#94A3B8", fontSize: 13, mb: 3 }}>
                                        Evaluated using multiple validation strategies (GroupKFold cross-validation, unseen-user holdout, and global temporal split) rather than relying on one random split.
                                    </Typography>

                                    <Box sx={{ height: 700, width: "100%" }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={validationStrategyData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                                <XAxis dataKey="strategy" stroke="#94a3b8" fontSize={12} interval={0} />
                                                <YAxis stroke="#94a3b8" domain={[0, 8]} fontSize={11} unit="%" />
                                                <RechartsTooltip content={<CustomErrorTooltip />} />
                                                <Legend wrapperStyle={{ paddingTop: "10px" }} />
                                                <Bar dataKey="MAE (%)" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                                                <Bar dataKey="RMSE (%)" fill="#818cf8" radius={[6, 6, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Box>

                        {/* 5. MODEL EXPLAINABILITY & PREDICTION UNCERTAINTY */}
                        <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#10B981", mb: 1.5, letterSpacing: "0.5px" }}>
                                MODEL EXPLAINABILITY & PREDICTION UNCERTAINTY
                            </Typography>
                            <Grid container spacing={3} alignItems="stretch">

                                {/* CARD 5A: Global Model Explainability (SHAP) */}
                                <Grid size={{ xs: 12, lg: 6 }}>
                                    <Card
                                        sx={{
                                            borderRadius: 3,
                                            bgcolor: "rgba(30, 41, 59, 0.7)",
                                            border: "1px solid rgba(16, 185, 129, 0.25)",
                                            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                                            height: "100%"
                                        }}
                                    >
                                        <CardContent sx={{ p: 3 }}>
                                            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
                                                <AutoGraphIcon sx={{ color: "#10b981" }} />
                                                <Typography variant="h4" sx={{ fontWeight: 700, color: "#F8FAFC" }}>
                                                    Global Model Explainability (SHAP)
                                                </Typography>
                                            </Stack>
                                            <Typography sx={{ color: "#94A3B8", fontSize: 16, mb: 2.5 }}>
                                                Top features with the greatest average absolute influence on model predictions (|SHAP value|).
                                            </Typography>

                                            {data?.shap_global_importance ? (
                                                <Box sx={{ height: 600, width: "100%" }}>
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart
                                                            layout="vertical"
                                                            data={data.shap_global_importance.slice(0, 10).reverse()}
                                                            margin={{ top: 10, right: 25, left: -25, bottom: 10 }}
                                                        >
                                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />

                                                            <XAxis
                                                                type="number"
                                                                stroke="#94a3b8"
                                                                fontSize={11}
                                                                unit="%"
                                                            />

                                                            <YAxis
                                                                type="category"
                                                                dataKey="feature_name"
                                                                stroke="#cbd5e1"
                                                                fontSize={12}
                                                                width={145}
                                                                tick={{ fill: "#cbd5e1", fontSize: 12, fontWeight: 600 }}
                                                            />

                                                            <RechartsTooltip
                                                                formatter={(value: any) => [`${value}% impact`, "Mean |SHAP| Value"]}
                                                                contentStyle={{
                                                                    backgroundColor: "#0f172a",
                                                                    borderColor: "rgba(16,185,129,0.3)",
                                                                    borderRadius: "8px"
                                                                }}
                                                            />

                                                            <Bar
                                                                dataKey="mean_abs_shap"
                                                                fill="#10b981"
                                                                radius={[0, 4, 4, 0]}
                                                            />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </Box>
                                            ) : (
                                                <Typography sx={{ color: "#64748B", fontSize: 13 }}>
                                                    SHAP global importance metrics loading...
                                                </Typography>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>

                                {/* CARD 5B: Conformal Prediction Uncertainty Calibration */}
                                <Grid size={{ xs: 12, lg: 6 }}>
                                    <Card
                                        sx={{
                                            borderRadius: 3,
                                            bgcolor: "rgba(30, 41, 59, 0.7)",
                                            border: "1px solid rgba(56, 189, 248, 0.25)",
                                            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                                            height: "100%"
                                        }}
                                    >
                                        <CardContent sx={{ p: 3, display: "flex", flexDirection: "column", height: "100%" }}>
                                            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
                                                <ShieldIcon sx={{ color: "#38bdf8" }} />
                                                <Typography variant="h4" sx={{ fontWeight: 700, color: "#F8FAFC" }}>
                                                    Prediction Uncertainty Calibration
                                                </Typography>
                                            </Stack>
                                            <Typography sx={{ color: "#94A3B8", fontSize: 16, mb: 2.5 }}>
                                                Conformal prediction bounds calibrated on out-of-fold historical model residuals.
                                            </Typography>

                                            <Stack spacing={2.5} sx={{ flexGrow: 1, justifyContent: "space-between" }}>
                                                 <Box sx={{ p: 3, borderRadius: 2.5, bgcolor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(56, 189, 248, 0.2)", flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                                     <Typography sx={{ color: "#64748B", fontSize: 12, fontWeight: 700, letterSpacing: "0.5px" }}>
                                                         CALIBRATION METHODOLOGY
                                                     </Typography>
                                                     <Typography sx={{ color: "#38bdf8", fontWeight: 700, fontSize: 19, mt: 0.8 }}>
                                                         Split Conformal Prediction (5-Fold GroupKFold OOF)
                                                     </Typography>
                                                     <Typography sx={{ color: "#94a3b8", fontSize: 14.5, mt: 0.8 }}>
                                                         Zero target leakage; learner group isolation on 636 clean evaluation instances.
                                                     </Typography>
                                                 </Box>

                                                 <Grid container spacing={2}>
                                                     <Grid size={6}>
                                                         <Box sx={{ p: 3.5, borderRadius: 2.5, bgcolor: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", textAlign: "center", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                                             <Typography sx={{ color: "#34D399", fontSize: 32, fontWeight: 800 }}>
                                                                 90.0%
                                                             </Typography>
                                                             <Typography sx={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, mt: 0.5 }}>
                                                                 Target Coverage
                                                             </Typography>
                                                         </Box>
                                                     </Grid>
                                                     <Grid size={6}>
                                                         <Box sx={{ p: 3.5, borderRadius: 2.5, bgcolor: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.25)", textAlign: "center", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                                             <Typography sx={{ color: "#38BDF8", fontSize: 32, fontWeight: 800 }}>
                                                                 89.9%
                                                             </Typography>
                                                             <Typography sx={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, mt: 0.5 }}>
                                                                 Empirical OOF Coverage
                                                             </Typography>
                                                         </Box>
                                                     </Grid>
                                                 </Grid>

                                                 <Box sx={{ p: 3, borderRadius: 2.5, bgcolor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                                     <Typography sx={{ color: "#64748B", fontSize: 12, fontWeight: 700, letterSpacing: "0.5px" }}>
                                                         CONFORMAL MARGIN & INTERVAL FORMULA
                                                     </Typography>
                                                     <Typography sx={{ color: "#F8FAFC", fontWeight: 700, fontSize: 19, mt: 0.8 }}>
                                                         Margin: ±7.8% score points
                                                     </Typography>
                                                     <Typography sx={{ color: "#94a3b8", fontSize: 15, mt: 0.8, fontFamily: "monospace" }}>
                                                         Range = [ max(0, Score - 7.8%), min(100, Score + 7.8%) ]
                                                     </Typography>
                                                 </Box>
                                             </Stack>
                                        </CardContent>
                                    </Card>
                                </Grid>

                            </Grid>
                        </Box>
                    </Stack>
                )}
            </Container>
        </Box>
    );
}