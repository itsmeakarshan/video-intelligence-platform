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
    Avatar
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import QuizIcon from "@mui/icons-material/Quiz";
import SchoolIcon from "@mui/icons-material/School";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import KnowledgeProfileCard from "../components/quiz/KnowledgeProfileCard";
import { getKnowledgeProfile } from "../api/api";
import {
    AreaChart,
    Area,
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

interface ProfileData {
    has_data: boolean;
    total_quiz_attempts: number;
    total_questions_answered: number;
    overall_mastery_percentage: number;
    average_quiz_score_percentage: number;
    highest_quiz_score_percentage: number;
    strong_concepts: string[];
    weak_concepts: string[];
    concept_mastery: ConceptMastery[];
    difficulty_performance: DifficultyPerf[];
}

export default function Profile() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);

    const userStr = localStorage.getItem("user");
    let user = { name: "Learner", email: "learner@example.com" };
    if (userStr) {
        try {
            user = JSON.parse(userStr);
        } catch (e) {
            console.error(e);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const data = await getKnowledgeProfile();
            setProfile(data);
        } catch (err) {
            console.error("Failed to load knowledge profile", err);
        } finally {
            setLoading(false);
        }
    }

    const getInitials = (name: string) => {
        const parts = name.trim().split(" ");
        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        return name.slice(0, 2).toUpperCase();
    };

    // Prepare chart data for Score Progress Over Time
    const historyChartData = (profile?.concept_mastery || []).map((c, i) => ({
        attempt: `Concept ${i + 1}`,
        concept: c.concept,
        score: c.mastery_percentage
    }));

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

    const hasAttempts = (profile?.total_quiz_attempts ?? 0) > 0;

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "#0F172A", color: "#F8FAFC", pb: 8 }}>
            <Navbar />

            <Container maxWidth="xl" sx={{ pt: 4 }}>
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
                                            <Chip label="Student Learner" size="small" sx={{ bgcolor: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", fontWeight: 600 }} />
                                            <Chip label="Video Intelligence ML Platform" size="small" sx={{ bgcolor: "rgba(20, 184, 166, 0.15)", color: "#14b8a6", fontWeight: 600 }} />
                                        </Stack>
                                    </Box>
                                </Stack>
                            </Grid>

                            <Grid size={{ xs: 12, md: 6 }}>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 6, sm: 3 }}>
                                        <Paper sx={{ p: 2, textAlign: "center", bgcolor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 2 }}>
                                            <Typography sx={{ color: "#14b8a6", fontWeight: 800, fontSize: 24 }}>
                                                {profile?.total_quiz_attempts ?? 0}
                                            </Typography>
                                            <Typography sx={{ color: "#94a3b8", fontSize: 12 }}>Completed Quizzes</Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid size={{ xs: 6, sm: 3 }}>
                                        <Paper sx={{ p: 2, textAlign: "center", bgcolor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 2 }}>
                                            <Typography sx={{ color: "#38bdf8", fontWeight: 800, fontSize: 24 }}>
                                                {hasAttempts ? `${profile?.average_quiz_score_percentage}%` : "No data"}
                                            </Typography>
                                            <Typography sx={{ color: "#94a3b8", fontSize: 12 }}>Avg Score</Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid size={{ xs: 6, sm: 3 }}>
                                        <Paper sx={{ p: 2, textAlign: "center", bgcolor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 2 }}>
                                            <Typography sx={{ color: "#10b981", fontWeight: 800, fontSize: 24 }}>
                                                {hasAttempts ? `${profile?.overall_mastery_percentage}%` : "No data"}
                                            </Typography>
                                            <Typography sx={{ color: "#94a3b8", fontSize: 12 }}>Overall Mastery</Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid size={{ xs: 6, sm: 3 }}>
                                        <Paper sx={{ p: 2, textAlign: "center", bgcolor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 2 }}>
                                            <Typography sx={{ color: "#f59e0b", fontWeight: 800, fontSize: 24 }}>
                                                {hasAttempts ? `${profile?.highest_quiz_score_percentage}%` : "No data"}
                                            </Typography>
                                            <Typography sx={{ color: "#94a3b8", fontSize: 12 }}>High Score</Typography>
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
                    <Grid container spacing={4}>
                        {/* Left Column: Dedicated Learning Knowledge Profile Card */}
                        <Grid size={{ xs: 12, lg: 6 }}>
                            <KnowledgeProfileCard />
                        </Grid>

                        {/* Right Column: Interactive Charts & Topic Breakdown */}
                        <Grid size={{ xs: 12, lg: 6 }}>
                            <Stack spacing={4}>
                                {/* Difficulty Performance Breakdown Chart */}
                                <Card
                                    sx={{
                                        borderRadius: 3,
                                        bgcolor: "rgba(30, 41, 59, 0.7)",
                                        border: "1px solid rgba(20, 184, 166, 0.25)",
                                        boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
                                    }}
                                >
                                    <CardContent sx={{ p: 3 }}>
                                        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                                            <QuizIcon sx={{ color: "#14b8a6" }} />
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: "#F8FAFC" }}>
                                                Quiz Performance by Difficulty
                                            </Typography>
                                        </Stack>
                                        <Typography sx={{ color: "#94A3B8", fontSize: 13, mb: 3 }}>
                                            Average score percentage across quiz difficulty tiers.
                                        </Typography>

                                        <Box sx={{ height: 260, width: "100%" }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={difficultyChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                                                    <XAxis dataKey="difficulty" stroke="#94a3b8" />
                                                    <YAxis domain={[0, 100]} stroke="#94a3b8" />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #14b8a6", borderRadius: "8px", color: "#f8fafc" }}
                                                        formatter={(_val: any, _name: any, item: any) => [item.payload.displayText, "Average Score"]}
                                                    />
                                                    <Bar dataKey="avgScore" radius={[6, 6, 0, 0]}>
                                                        {difficultyChartData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={getDifficultyColor(entry.difficulty)} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </Box>
                                    </CardContent>
                                </Card>

                                {/* Concept Mastery Chart */}
                                <Card
                                    sx={{
                                        borderRadius: 3,
                                        bgcolor: "rgba(30, 41, 59, 0.7)",
                                        border: "1px solid rgba(20, 184, 166, 0.25)",
                                        boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
                                    }}
                                >
                                    <CardContent sx={{ p: 3 }}>
                                        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                                            <AutoGraphIcon sx={{ color: "#38bdf8" }} />
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: "#F8FAFC" }}>
                                                Topic Concept Mastery Breakdown
                                            </Typography>
                                        </Stack>
                                        <Typography sx={{ color: "#94A3B8", fontSize: 13, mb: 3 }}>
                                            Mastery scores dynamically calculated from your attempt history.
                                        </Typography>

                                        <Box sx={{ height: 260, width: "100%" }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={historyChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8} />
                                                            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                                                    <XAxis dataKey="concept" stroke="#94a3b8" />
                                                    <YAxis domain={[0, 100]} stroke="#94a3b8" />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #38bdf8", borderRadius: "8px", color: "#f8fafc" }}
                                                        formatter={(value: any) => [`${value}%`, "Mastery"]}
                                                    />
                                                    <Area type="monotone" dataKey="score" stroke="#38bdf8" fillOpacity={1} fill="url(#colorScore)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Stack>
                        </Grid>
                    </Grid>
                )}
            </Container>
        </Box>
    );
}
