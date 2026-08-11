import { useState } from "react";
import {
    AppBar,
    Avatar,
    Box,
    Button,
    Container,
    Divider,
    Menu,
    MenuItem,
    Stack,
    Toolbar,
    Typography,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from "@mui/material";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import ScienceIcon from "@mui/icons-material/Science";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import SettingsIcon from "@mui/icons-material/Settings";
import QuizIcon from "@mui/icons-material/Quiz";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import NotesRoundedIcon from "@mui/icons-material/NotesRounded";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useNavigate, useLocation } from "react-router-dom";

export default function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);

    // Load logged in user from localStorage
    const userStr = localStorage.getItem("user");
    let user = { name: "Learner", email: "learner@example.com" };
    if (userStr) {
        try {
            user = JSON.parse(userStr);
        } catch (e) {
            console.error("Failed to parse user from localStorage", e);
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

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        handleMenuClose();
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        navigate("/login");
    };

    const navItems = [
        { label: "Dashboard", path: "/", icon: <DashboardIcon sx={{ fontSize: 18 }} /> },
        { label: "Summary", path: "/summary", icon: <DescriptionRoundedIcon sx={{ fontSize: 18 }} /> },
        { label: "Notes", path: "/notes", icon: <NotesRoundedIcon sx={{ fontSize: 18 }} /> },
        { label: "Quizzes", path: "/quiz", icon: <QuizIcon sx={{ fontSize: 18 }} /> },
        { label: "ML Metrics Hub", path: "/ml-performance", icon: <ScienceIcon sx={{ fontSize: 18 }} /> }
    ];

    const isActive = (path: string) => {
        if (path === "/") return location.pathname === "/";
        return location.pathname.startsWith(path);
    };

    return (
        <AppBar
            position="sticky"
            sx={{
                bgcolor: "rgba(15, 23, 42, 0.9)",
                backdropFilter: "blur(16px)",
                borderBottom: "1px solid rgba(20, 184, 166, 0.2)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
                zIndex: (theme) => theme.zIndex.drawer + 1
            }}
        >
            <Container maxWidth="xl">
                <Toolbar disableGutters sx={{ justifyContent: "space-between", py: 1 }}>
                    {/* Brand Logo & Title */}
                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1.5}
                        onClick={() => navigate("/")}
                        sx={{ cursor: "pointer", select: "none" }}
                    >
                        <Box
                            sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 2.5,
                                background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "0 0 15px rgba(20, 184, 166, 0.4)"
                            }}
                        >
                            <AutoGraphIcon sx={{ color: "#F8FAFC", fontSize: 24 }} />
                        </Box>
                        <Box>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography
                                    variant="h6"
                                    sx={{
                                        fontWeight: 800,
                                        color: "#F8FAFC",
                                        letterSpacing: "-0.5px",
                                        fontSize: { xs: 16, sm: 19 }
                                    }}
                                >
                                    VIDEO INTELLIGENCE
                                </Typography>
                                <Chip
                                    label="ML v4.0"
                                    size="small"
                                    sx={{
                                        bgcolor: "rgba(20, 184, 166, 0.15)",
                                        color: "#14b8a6",
                                        fontWeight: 700,
                                        fontSize: 10,
                                        height: 20
                                    }}
                                />
                            </Stack>
                            <Typography sx={{ color: "#94A3B8", fontSize: 11, display: { xs: "none", sm: "block" } }}>
                                Adaptive Learning & Performance Forecasting Platform
                            </Typography>
                        </Box>
                    </Stack>

                    {/* Navigation Links (Desktop) */}
                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{ display: { xs: "none", md: "flex" }, alignItems: "center" }}
                    >
                        {navItems.map((item) => {
                            const active = isActive(item.path);
                            return (
                                <Button
                                    key={item.label}
                                    startIcon={item.icon}
                                    onClick={() => {
                                        if (item.path.includes("#")) {
                                            if (location.pathname !== "/") {
                                                navigate("/");
                                                setTimeout(() => {
                                                    const el = document.getElementById("recommendations-section");
                                                    el?.scrollIntoView({ behavior: "smooth" });
                                                }, 300);
                                            } else {
                                                const el = document.getElementById("recommendations-section");
                                                el?.scrollIntoView({ behavior: "smooth" });
                                            }
                                        } else {
                                            navigate(item.path);
                                        }
                                    }}
                                    sx={{
                                        color: active ? "#14B8A6" : "#94A3B8",
                                        bgcolor: active ? "rgba(20, 184, 166, 0.12)" : "transparent",
                                        fontWeight: active ? 700 : 500,
                                        px: 2,
                                        py: 1,
                                        borderRadius: 2,
                                        transition: "all 0.2s ease",
                                        "&:hover": {
                                            color: "#F8FAFC",
                                            bgcolor: "rgba(255, 255, 255, 0.06)"
                                        }
                                    }}
                                >
                                    {item.label}
                                </Button>
                            );
                        })}
                    </Stack>

                    {/* User Profile Avatar & Dropdown */}
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Button
                            onClick={handleMenuOpen}
                            endIcon={<KeyboardArrowDownIcon sx={{ color: "#94A3B8", transition: "transform 0.2s", transform: anchorEl ? "rotate(180deg)" : "none" }} />}
                            sx={{
                                p: 0.5,
                                pr: 1.5,
                                borderRadius: 3,
                                bgcolor: "rgba(30, 41, 59, 0.7)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                transition: "all 0.2s ease",
                                "&:hover": {
                                    bgcolor: "rgba(30, 41, 59, 0.95)",
                                    borderColor: "rgba(20, 184, 166, 0.4)"
                                }
                            }}
                        >
                            <Stack direction="row" alignItems="center" spacing={1.2}>
                                <Avatar
                                    sx={{
                                        width: 34,
                                        height: 34,
                                        bgcolor: "#0f766e",
                                        color: "#F8FAFC",
                                        fontWeight: 700,
                                        fontSize: 14,
                                        border: "1.5px solid #14b8a6"
                                    }}
                                >
                                    {getInitials(user.name)}
                                </Avatar>
                                <Box sx={{ textAlign: "left", display: { xs: "none", sm: "block" } }}>
                                    <Typography sx={{ color: "#F8FAFC", fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>
                                        {user.name}
                                    </Typography>
                                    <Typography sx={{ color: "#94A3B8", fontSize: 10 }}>
                                        Learner Account
                                    </Typography>
                                </Box>
                            </Stack>
                        </Button>

                        {/* Dropdown Menu */}
                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={handleMenuClose}
                            PaperProps={{
                                sx: {
                                    bgcolor: "#0F172A",
                                    color: "#F8FAFC",
                                    border: "1px solid rgba(20, 184, 166, 0.3)",
                                    boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
                                    borderRadius: 3,
                                    mt: 1.5,
                                    minWidth: 240,
                                    p: 1
                                }
                            }}
                            transformOrigin={{ horizontal: "right", vertical: "top" }}
                            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                        >
                            <Box sx={{ px: 2, py: 1.5 }}>
                                <Typography sx={{ fontWeight: 700, fontSize: 14, color: "#F8FAFC" }}>
                                    {user.name}
                                </Typography>
                                <Typography sx={{ color: "#94A3B8", fontSize: 12, wordBreak: "break-all" }}>
                                    {user.email}
                                </Typography>
                                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1 }}>
                                    <CheckCircleIcon sx={{ fontSize: 14, color: "#10b981" }} />
                                    <Typography sx={{ color: "#10b981", fontSize: 11, fontWeight: 600 }}>
                                        Active Learning Session
                                    </Typography>
                                </Stack>
                            </Box>

                            <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", my: 1 }} />

                            <MenuItem
                                onClick={() => {
                                    handleMenuClose();
                                    navigate("/profile");
                                }}
                                sx={{
                                    borderRadius: 2,
                                    py: 1,
                                    color: "#F8FAFC",
                                    "&:hover": { bgcolor: "rgba(20, 184, 166, 0.12)", color: "#14b8a6" }
                                }}
                            >
                                <PersonIcon sx={{ mr: 1.5, fontSize: 18, color: "#14b8a6" }} />
                                Profile & Analytics
                            </MenuItem>

                            <MenuItem
                                onClick={() => {
                                    handleMenuClose();
                                    navigate("/ml-performance");
                                }}
                                sx={{
                                    borderRadius: 2,
                                    py: 1,
                                    color: "#F8FAFC",
                                    "&:hover": { bgcolor: "rgba(20, 184, 166, 0.12)", color: "#14b8a6" }
                                }}
                            >
                                <ScienceIcon sx={{ mr: 1.5, fontSize: 18, color: "#38bdf8" }} />
                                ML Model Metrics Hub
                            </MenuItem>

                            <MenuItem
                                onClick={() => {
                                    handleMenuClose();
                                    setSettingsOpen(true);
                                }}
                                sx={{
                                    borderRadius: 2,
                                    py: 1,
                                    color: "#F8FAFC",
                                    "&:hover": { bgcolor: "rgba(255, 255, 255, 0.08)" }
                                }}
                            >
                                <SettingsIcon sx={{ mr: 1.5, fontSize: 18, color: "#94a3b8" }} />
                                Settings
                            </MenuItem>

                            <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", my: 1 }} />

                            <MenuItem
                                onClick={handleLogout}
                                sx={{
                                    borderRadius: 2,
                                    py: 1,
                                    color: "#ef4444",
                                    "&:hover": { bgcolor: "rgba(239, 68, 68, 0.12)" }
                                }}
                            >
                                <LogoutIcon sx={{ mr: 1.5, fontSize: 18 }} />
                                Sign Out
                            </MenuItem>
                        </Menu>
                    </Stack>
                </Toolbar>
            </Container>

            {/* Settings Modal */}
            <Dialog
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                PaperProps={{
                    sx: {
                        bgcolor: "#0F172A",
                        color: "#F8FAFC",
                        borderRadius: 3,
                        border: "1px solid rgba(20, 184, 166, 0.3)",
                        p: 1
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800 }}>Platform Settings</DialogTitle>
                <DialogContent>
                    <Typography sx={{ color: "#94A3B8", fontSize: 14, mb: 2 }}>
                        Configured Machine Learning & Platform Preferences:
                    </Typography>
                    <Stack spacing={1.5}>
                        <Box sx={{ p: 1.5, bgcolor: "rgba(30, 41, 59, 0.6)", borderRadius: 2, border: "1px solid rgba(255,255,255,0.08)" }}>
                            <Typography sx={{ fontWeight: 700, fontSize: 13, color: "#14b8a6" }}>ML Prediction Pipeline</Typography>
                            <Typography sx={{ fontSize: 12, color: "#94a3b8" }}>Extra Trees Regressor_v4.0 (38 Domain Features)</Typography>
                        </Box>
                        <Box sx={{ p: 1.5, bgcolor: "rgba(30, 41, 59, 0.6)", borderRadius: 2, border: "1px solid rgba(255,255,255,0.08)" }}>
                            <Typography sx={{ fontWeight: 700, fontSize: 13, color: "#38bdf8" }}>Pass Classifier Threshold</Typography>
                            <Typography sx={{ fontSize: 12, color: "#94a3b8" }}>70.0% Pass Threshold (High: &ge;70%, Moderate: 45%-69.9%, Unlikely: &lt;45%)</Typography>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSettingsOpen(false)} sx={{ color: "#14b8a6" }}>Close</Button>
                </DialogActions>
            </Dialog>
        </AppBar>
    );
}
