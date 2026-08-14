import { useEffect, useState } from "react";
import {
    Box,
    Card,
    CardContent,
    Container,
    Grid,
    Paper,
    Stack,
    Typography,
    Chip,
    CircularProgress,
    Button,
    Avatar,
    TextField,
    InputAdornment,
    LinearProgress
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SchoolIcon from "@mui/icons-material/School";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import { getKnowledgeProfile } from "../api/api";
import { useAuth } from "../context/AuthContext";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell
} from "recharts";

interface ConceptMastery {
    concept: string;
    mastery_percentage: number;
    level: string;
    attempts_count: number;
}

interface DifficultyPerf {
    difficulty: string;
    attempts_count: number;
    avg_percentage: number | null;
    has_data?: boolean;
}

interface UserProfileData {
    user_id?: string;
    user_name?: string;
    total_quiz_attempts: number;
    overall_average_percentage?: number | null;
    average_quiz_score_percentage?: number | null;
    highest_score_percentage?: number | null;
    highest_quiz_score_percentage?: number | null;
    passed_quizzes_count?: number;
    failed_quizzes_count?: number;
    concept_mastery: ConceptMastery[];
    difficulty_performance: DifficultyPerf[];
    attempt_history: Array<{
        attempt_id: string;
        quiz_id: string;
        timestamp: string;
        score_percentage: number;
        passed: boolean;
        difficulty: string;
        topic: string;
    }>;
}

export default function Profile() {
    const navigate = useNavigate();
    const { user: authUser } = useAuth();
    const user = authUser || { name: "Learner", email: "learner@example.com" };

    const [profile, setProfile] = useState<UserProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterLevel, setFilterLevel] = useState<string>("ALL");

    useEffect(() => {
        loadProfileData();
    }, []);

    async function loadProfileData() {
        setLoading(true);
        try {
            const data = await getKnowledgeProfile();
            setProfile(data);
        } catch (err) {
            console.error("Failed to load profile analytics:", err);
        } finally {
            setLoading(false);
        }
    }

    const getInitials = (name: string) => {
        if (!name) return "U";
        const parts = name.trim().split(" ");
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    const CustomHistoryTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const item = payload[0].payload;
            return (
                <Paper
                    elevation={0}
                    sx={{
                        p: 1.5,
                        bgcolor: "rgba(15, 23, 42, 0.95)",
                        border: "1px solid rgba(20, 184, 166, 0.4)",
                        borderRadius: 2,
                        boxShadow: "0 10px 25px rgba(0,0,0,0.5)"
                    }}
                >
                    <Typography sx={{ fontWeight: 700, color: "#F8FAFC", fontSize: 13, mb: 0.5 }}>
                        {label}
                    </Typography>
                    <Typography sx={{ color: "#14b8a6", fontWeight: 800, fontSize: 14 }}>
                        Score: {item.score}%
                    </Typography>
                </Paper>
            );
        }
        return null;
    };

    const CustomDifficultyTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const item = payload[0].payload;
            return (
                <Paper
                    elevation={0}
                    sx={{
                        p: 1.5,
                        bgcolor: "rgba(15, 23, 42, 0.95)",
                        border: "1px solid rgba(20, 184, 166, 0.4)",
                        borderRadius: 2,
                        boxShadow: "0 10px 25px rgba(0,0,0,0.5)"
                    }}
                >
                    <Typography sx={{ fontWeight: 700, color: "#F8FAFC", fontSize: 13, mb: 0.5 }}>
                        {label} Difficulty
                    </Typography>
                    <Typography sx={{ color: "#14b8a6", fontWeight: 800, fontSize: 14 }}>
                        Average Score: {item.avgScore}%
                    </Typography>
                    <Typography sx={{ color: "#94A3B8", fontSize: 11, mt: 0.5 }}>
                        Quizzes Attempted: {item.attempts}
                    </Typography>
                </Paper>
            );
        }
        return null;
    };

    const rawHistory = profile?.attempt_history || [];
    const totalCount = rawHistory.length;
    const recentHistory = rawHistory.slice(-10);

    const historyChartData = recentHistory.map((item, idx) => {
        const realIndex = totalCount - recentHistory.length + idx + 1;
        return {
            attemptNum: `Quiz #${realIndex}`,
            score: item.score_percentage,
            date: item.timestamp ? new Date(item.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "",
            topic: item.topic || item.difficulty || "Quiz"
        };
    });

    const allConcepts = profile?.concept_mastery || [];
    const strongCount = allConcepts.filter((c) => c.mastery_percentage >= 75).length;
    const improvingCount = allConcepts.filter((c) => c.mastery_percentage >= 60 && c.mastery_percentage < 75).length;
    const needsReviewCount = allConcepts.filter((c) => c.mastery_percentage < 60).length;

    const filteredConcepts = allConcepts.filter((c) => {
        const matchesSearch = c.concept.toLowerCase().includes(searchTerm.toLowerCase());
        const pct = c.mastery_percentage;
        const matchesLevel =
            filterLevel === "ALL"
                ? true
                : filterLevel === "STRONG"
                ? pct >= 75
                : filterLevel === "IMPROVING"
                ? pct >= 60 && pct < 75
                : pct < 60;
        return matchesSearch && matchesLevel;
    });

    const difficultyChartData = (profile?.difficulty_performance || []).map((d) => ({
        difficulty: d.difficulty,
        avgScore: d.avg_percentage !== null ? d.avg_percentage : 0,
        displayText: d.avg_percentage !== null ? `${d.avg_percentage}%` : "No data",
        attempts: d.attempts_count
    }));

    const getDifficultyColor = (diff: string) => {
        if (diff === "Easy") return "#10b981";
        if (diff === "Medium") return "#f59e0b";
        return "#ef4444";
    };

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "#0F172A", color: "#F8FAFC", pb: 8 }}>
            <Navbar />

            <Container maxWidth={false} sx={{ maxWidth: "2560px", width: { xs: "96%", md: "88%", lg: "80%" }, mx: "auto", px: { xs: 2, sm: 3, md: 4 }, pt: 4 }}>
                {/* Back Button & Header */}
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 4 }}>
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate("/")}
                        sx={{ color: "#94A3B8", borderColor: "rgba(148, 163, 184, 0.2)", "&:hover": { color: "#F8FAFC" } }}
                        variant="outlined"
                    >
                        Back to Dashboard
                    </Button>
                    <Chip
                        icon={<SchoolIcon sx={{ fontSize: 16, color: "#14b8a6" }} />}
                        label="PERSONAL LEARNING PROFILE & ANALYTICS"
                        sx={{ bgcolor: "rgba(20, 184, 166, 0.12)", color: "#14b8a6", fontWeight: 700 }}
                    />
                </Stack>

                {/* User Header Profile Card */}
                <Card
                    sx={{
                        mb: 4,
                        borderRadius: 3,
                        bgcolor: "rgba(30, 41, 59, 0.7)",
                        border: "1px solid rgba(20, 184, 166, 0.25)",
                        backdropFilter: "blur(12px)",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.4)"
                    }}
                >
                    <CardContent sx={{ p: 4 }}>
                        <Grid container spacing={3} alignItems="center">
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Stack direction="row" spacing={3} alignItems="center">
                                    <Avatar
                                        sx={{
                                            width: 72,
                                            height: 72,
                                            bgcolor: "#0f766e",
                                            color: "#F8FAFC",
                                            fontSize: 28,
                                            fontWeight: 800,
                                            border: "2px solid #14b8a6"
                                        }}
                                    >
                                        {getInitials(user.name)}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="h4" sx={{ fontWeight: 800, color: "#F8FAFC", mb: 0.5 }}>
                                            {user.name}
                                        </Typography>
                                        <Typography sx={{ color: "#94A3B8", fontSize: 14 }}>
                                            {user.email}
                                        </Typography>
                                        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                                            <Chip
                                                label="Learner Account"
                                                size="small"
                                                sx={{ bgcolor: "rgba(20, 184, 166, 0.15)", color: "#14b8a6", fontWeight: 700 }}
                                            />
                                            <Chip
                                                label={`Total Quizzes: ${profile?.total_quiz_attempts || 0}`}
                                                size="small"
                                                sx={{ bgcolor: "rgba(255, 255, 255, 0.08)", color: "#94A3B8" }}
                                            />
                                        </Stack>
                                    </Box>
                                </Stack>
                            </Grid>

                            {/* Key Performance Metric Stat Cards */}
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 6 }}>
                                        <Paper sx={{ p: 2, bgcolor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 2 }}>
                                            <Typography sx={{ color: "#94A3B8", fontSize: 11, fontWeight: 700 }}>
                                                HISTORICAL AVERAGE
                                            </Typography>
                                            <Typography variant="h4" sx={{ color: "#14b8a6", fontWeight: 800, mt: 0.5 }}>
                                                {(() => {
                                                    const val = profile?.overall_average_percentage ?? profile?.average_quiz_score_percentage;
                                                    return val !== null && val !== undefined ? `${val}%` : "--";
                                                })()}
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <Paper sx={{ p: 2, bgcolor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 2 }}>
                                            <Typography sx={{ color: "#94A3B8", fontSize: 11, fontWeight: 700 }}>
                                                HIGHEST SCORE
                                            </Typography>
                                            <Typography variant="h4" sx={{ color: "#38bdf8", fontWeight: 800, mt: 0.5 }}>
                                                {(() => {
                                                    const val = profile?.highest_score_percentage ?? profile?.highest_quiz_score_percentage;
                                                    return val !== null && val !== undefined ? `${val}%` : "--";
                                                })()}
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>

                {loading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", my: 10 }}>
                        <CircularProgress sx={{ color: "#14b8a6" }} />
                    </Box>
                ) : (
                    <Stack spacing={4}>
                        {/* Quiz Score History & Trend Line Chart */}
                        <Card
                            sx={{
                                borderRadius: 3,
                                bgcolor: "rgba(30, 41, 59, 0.7)",
                                border: "1px solid rgba(20, 184, 166, 0.25)",
                                boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
                            }}
                        >
                            <CardContent sx={{ p: 3 }}>
                                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                                    <AutoGraphIcon sx={{ color: "#14b8a6" }} />
                                    <Typography variant="h6" sx={{ fontWeight: 700, color: "#F8FAFC" }}>
                                        Quiz Score History & Trend (Recent 10 Quizzes)
                                    </Typography>
                                </Stack>
                                <Typography sx={{ color: "#94A3B8", fontSize: 13, mb: 3 }}>
                                    Track your score percentages chronologically across your 10 most recent quiz sessions.
                                </Typography>

                                {historyChartData.length > 0 ? (
                                    <Box sx={{ height: 320, width: "100%" }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={historyChartData} margin={{ top: 15, right: 30, left: -10, bottom: 10 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                                                <XAxis dataKey="attemptNum" stroke="#94a3b8" fontSize={11} tickMargin={8} />
                                                <YAxis stroke="#94a3b8" domain={[0, 100]} unit="%" fontSize={11} />
                                                <Tooltip content={<CustomHistoryTooltip />} />
                                                <Line
                                                    type="monotone"
                                                    dataKey="score"
                                                    name="Quiz Score (%)"
                                                    stroke="#14b8a6"
                                                    strokeWidth={3.5}
                                                    dot={{ fill: "#14b8a6", r: 5, stroke: "#0f172a", strokeWidth: 2 }}
                                                    activeDot={{ r: 8, fill: "#38bdf8", stroke: "#F8FAFC", strokeWidth: 2 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </Box>
                                ) : (
                                    <Box
                                        sx={{
                                            height: 180,
                                            width: "100%",
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            border: "1px dashed rgba(20, 184, 166, 0.3)",
                                            borderRadius: 2,
                                            bgcolor: "rgba(15, 23, 42, 0.4)",
                                            p: 3
                                        }}
                                    >
                                        <AutoGraphIcon sx={{ color: "rgba(20, 184, 166, 0.4)", fontSize: 44, mb: 1 }} />
                                        <Typography sx={{ color: "#F8FAFC", fontWeight: 700, fontSize: 15 }}>
                                            No Quiz Score History Yet
                                        </Typography>
                                        <Typography sx={{ color: "#94A3B8", fontSize: 13, mt: 0.5, textAlign: "center" }}>
                                            Complete your first quiz session to start building your live performance trend line!
                                        </Typography>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>

                        {/* Concept Mastery & Difficulty Breakdown */}
                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12, md: 6 }}>
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
                                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: "#F8FAFC" }}>
                                                Topic & Concept Mastery (%)
                                            </Typography>
                                            <Chip
                                                label={`${allConcepts.length} Topics`}
                                                size="small"
                                                sx={{ bgcolor: "rgba(20, 184, 166, 0.12)", color: "#14b8a6", fontWeight: 700 }}
                                            />
                                        </Stack>

                                        {/* Search Bar & Level Filter Chips */}
                                        <Stack spacing={1.5} sx={{ mb: 2 }}>
                                            <TextField
                                                placeholder="Search topic or concept..."
                                                size="small"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                slotProps={{
                                                    input: {
                                                        startAdornment: (
                                                            <InputAdornment position="start">
                                                                <SearchIcon sx={{ color: "#94A3B8", fontSize: 18 }} />
                                                            </InputAdornment>
                                                        )
                                                    }
                                                }}
                                                sx={{
                                                    bgcolor: "rgba(15, 23, 42, 0.6)",
                                                    borderRadius: 2,
                                                    "& .MuiOutlinedInput-root": {
                                                        color: "#F8FAFC",
                                                        fontSize: 13,
                                                        "& fieldset": { borderColor: "rgba(255, 255, 255, 0.1)" },
                                                        "&:hover fieldset": { borderColor: "rgba(20, 184, 166, 0.4)" },
                                                        "&.Mui-focused fieldset": { borderColor: "#14b8a6" }
                                                    }
                                                }}
                                            />

                                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                                <Chip
                                                    label={`All (${allConcepts.length})`}
                                                    size="small"
                                                    onClick={() => setFilterLevel("ALL")}
                                                    sx={{
                                                        cursor: "pointer",
                                                        bgcolor: filterLevel === "ALL" ? "#14b8a6" : "rgba(255, 255, 255, 0.06)",
                                                        color: filterLevel === "ALL" ? "#0F172A" : "#94A3B8",
                                                        fontWeight: 700,
                                                        fontSize: 11
                                                    }}
                                                />
                                                <Chip
                                                    label={`Strong (${strongCount})`}
                                                    size="small"
                                                    onClick={() => setFilterLevel("STRONG")}
                                                    sx={{
                                                        cursor: "pointer",
                                                        bgcolor: filterLevel === "STRONG" ? "#10b981" : "rgba(16, 185, 129, 0.12)",
                                                        color: filterLevel === "STRONG" ? "#0F172A" : "#10b981",
                                                        fontWeight: 700,
                                                        fontSize: 11
                                                    }}
                                                />
                                                <Chip
                                                    label={`Improving (${improvingCount})`}
                                                    size="small"
                                                    onClick={() => setFilterLevel("IMPROVING")}
                                                    sx={{
                                                        cursor: "pointer",
                                                        bgcolor: filterLevel === "IMPROVING" ? "#f59e0b" : "rgba(245, 158, 11, 0.12)",
                                                        color: filterLevel === "IMPROVING" ? "#0F172A" : "#f59e0b",
                                                        fontWeight: 700,
                                                        fontSize: 11
                                                    }}
                                                />
                                                <Chip
                                                    label={`Needs Review (${needsReviewCount})`}
                                                    size="small"
                                                    onClick={() => setFilterLevel("NEEDS_REVIEW")}
                                                    sx={{
                                                        cursor: "pointer",
                                                        bgcolor: filterLevel === "NEEDS_REVIEW" ? "#ef4444" : "rgba(239, 68, 68, 0.12)",
                                                        color: filterLevel === "NEEDS_REVIEW" ? "#0F172A" : "#ef4444",
                                                        fontWeight: 700,
                                                        fontSize: 11
                                                    }}
                                                />
                                            </Stack>
                                        </Stack>

                                        {/* Scrollable Concept Cards List */}
                                        {allConcepts.length > 0 ? (
                                            <Box
                                                sx={{
                                                    maxHeight: 460,
                                                    overflowY: "auto",
                                                    pr: 1,
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: 1.5,
                                                    "&::-webkit-scrollbar": { width: 6 },
                                                    "&::-webkit-scrollbar-track": { bgcolor: "rgba(15, 23, 42, 0.4)", borderRadius: 3 },
                                                    "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(20, 184, 166, 0.3)", borderRadius: 3 }
                                                }}
                                            >
                                                {filteredConcepts.length > 0 ? (
                                                    filteredConcepts.map((item, index) => {
                                                        const pct = item.mastery_percentage;
                                                        const color = pct >= 75 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";
                                                        const levelLabel = pct >= 75 ? "Strong" : pct >= 60 ? "Improving" : "Needs Review";

                                                        return (
                                                            <Paper
                                                                key={index}
                                                                elevation={0}
                                                                sx={{
                                                                    p: 2,
                                                                    bgcolor: "rgba(15, 23, 42, 0.6)",
                                                                    border: `1px solid ${color}30`,
                                                                    borderRadius: 2,
                                                                    transition: "all 0.2s ease-in-out",
                                                                    "&:hover": {
                                                                        bgcolor: "rgba(15, 23, 42, 0.9)",
                                                                        borderColor: color,
                                                                        boxShadow: `0 4px 14px ${color}20`
                                                                    }
                                                                }}
                                                            >
                                                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.2 }}>
                                                                    <Typography sx={{ fontWeight: 700, color: "#F8FAFC", fontSize: 13.5, pr: 2, wordBreak: "break-word" }}>
                                                                        {item.concept}
                                                                    </Typography>
                                                                    <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
                                                                        <Chip
                                                                            label={levelLabel}
                                                                            size="small"
                                                                            sx={{
                                                                                bgcolor: `${color}18`,
                                                                                color: color,
                                                                                fontWeight: 700,
                                                                                fontSize: 10.5,
                                                                                height: 20,
                                                                                border: `1px solid ${color}40`
                                                                            }}
                                                                        />
                                                                        <Typography sx={{ color: color, fontWeight: 800, fontSize: 14.5, minWidth: 42, textAlign: "right" }}>
                                                                            {pct}%
                                                                        </Typography>
                                                                    </Stack>
                                                                </Stack>

                                                                <LinearProgress
                                                                    variant="determinate"
                                                                    value={pct}
                                                                    sx={{
                                                                        height: 7,
                                                                        borderRadius: 4,
                                                                        bgcolor: "rgba(255, 255, 255, 0.08)",
                                                                        "& .MuiLinearProgress-bar": {
                                                                            borderRadius: 4,
                                                                            bgcolor: color,
                                                                            boxShadow: `0 0 8px ${color}80`
                                                                        }
                                                                    }}
                                                                />
                                                            </Paper>
                                                        );
                                                    })
                                                ) : (
                                                    <Typography sx={{ color: "#94A3B8", py: 6, textAlign: "center", fontSize: 13 }}>
                                                        No matching topics found.
                                                    </Typography>
                                                )}
                                            </Box>
                                        ) : (
                                            <Typography sx={{ color: "#94A3B8", py: 6, textAlign: "center" }}>
                                                Complete quizzes to unlock detailed topic mastery scores.
                                            </Typography>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid size={{ xs: 12, md: 6 }}>
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
                                        <Typography variant="h6" sx={{ fontWeight: 700, color: "#F8FAFC", mb: 2 }}>
                                            Performance by Difficulty Level
                                        </Typography>
                                        <Box sx={{ height: 520, width: "100%" }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={difficultyChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                                                    <XAxis dataKey="difficulty" stroke="#94a3b8" />
                                                    <YAxis domain={[0, 100]} stroke="#94a3b8" />
                                                    <Tooltip
                                                        content={<CustomDifficultyTooltip />}
                                                        cursor={{ fill: "rgba(255, 255, 255, 0.04)", rx: 6, ry: 6 }}
                                                    />
                                                    <Bar dataKey="avgScore" name="Avg Score (%)" radius={[4, 4, 0, 0]} activeBar={{ stroke: "#F8FAFC", strokeWidth: 2 }}>
                                                        {difficultyChartData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={getDifficultyColor(entry.difficulty)} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    </Stack>
                )}
            </Container>
        </Box>
    );
}
