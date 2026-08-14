import { useState } from "react";
import {
    AppBar, Avatar, Box, Button, Container, Divider, Menu, MenuItem, Stack, Toolbar, Typography, Dialog, DialogTitle, DialogContent, DialogActions
} from "@mui/material";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import ScienceIcon from "@mui/icons-material/Science";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import SettingsIcon from "@mui/icons-material/Settings";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import NotesRoundedIcon from "@mui/icons-material/NotesRounded";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useNavigate, useLocation } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

export default function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user: authUser, logout } = useAuth();

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);

    const user = authUser || { name: "Learner", email: "learner@example.com" };

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
        logout();
        navigate("/login", { replace: true });
    };

    const navItems = [
        { label: "Dashboard", path: "/", icon: <DashboardIcon sx={{ fontSize: 20 }} /> },
        { label: "Generate Summary", path: "/summary", icon: <DescriptionRoundedIcon sx={{ fontSize: 20 }} /> },
        { label: "Generate Notes", path: "/notes", icon: <NotesRoundedIcon sx={{ fontSize: 20 }} /> },
        { label: "ML Metrics Hub", path: "/ml-performance", icon: <ScienceIcon sx={{ fontSize: 20 }} /> }
    ];

    const isActive = (path: string) => {
        if (path === "/") return location.pathname === "/";
        return location.pathname.startsWith(path);
    };

    return (
        <AppBar
            position="sticky"
            sx={{
                bgcolor: "rgba(15, 23, 42, 0.92)",
                backdropFilter: "blur(16px)",
                borderBottom: "1px solid rgba(20, 184, 166, 0.25)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
                zIndex: (theme) => theme.zIndex.drawer + 1
            }}
        >
            <Container maxWidth={false} sx={{ maxWidth: "2560px", width: { xs: "96%", md: "88%", lg: "80%" }, mx: "auto", px: { xs: 2, sm: 3, md: 4 } }}>
                <Toolbar disableGutters sx={{ justifyContent: "space-between", py: 1.8 }}>
                    {/* Left Section: Brand Logo & Navigation Links */}
                    <Stack direction="row" alignItems="center" spacing={{ xs: 2, lg: 5 }}>
                        {/* Brand Logo & Title */}
                        <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1.8}
                            onClick={() => navigate("/")}
                            sx={{ cursor: "pointer", select: "none" }}
                        >
                            <Box
                                sx={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 2.5,
                                    background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    boxShadow: "0 0 18px rgba(20, 184, 166, 0.45)"
                                }}
                            >
                                <AutoGraphIcon sx={{ color: "#F8FAFC", fontSize: 26 }} />
                            </Box>
                            <Box>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            fontWeight: 800,
                                            color: "#F8FAFC",
                                            letterSpacing: "-0.5px",
                                            fontSize: { xs: 17, sm: 20 }
                                        }}
                                    >
                                        VIDEO INTELLIGENCE
                                    </Typography>
                                </Stack>
                                <Typography sx={{ color: "#94A3B8", fontSize: 12, display: { xs: "none", sm: "block" } }}>
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
                                        onClick={() => navigate(item.path)}
                                        sx={{
                                            color: active ? "#14B8A6" : "#94A3B8",
                                            bgcolor: active ? "rgba(20, 184, 166, 0.12)" : "transparent",
                                            fontWeight: active ? 700 : 600,
                                            fontSize: 15,
                                            px: 2.2,
                                            py: 1.1,
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
                    </Stack>

                    {/* User Profile Avatar & Dropdown */}
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Button
                            onClick={handleMenuOpen}
                            endIcon={<KeyboardArrowDownIcon sx={{ color: "#94A3B8", transition: "transform 0.2s", transform: anchorEl ? "rotate(180deg)" : "none" }} />}
                            sx={{
                                p: 0.8,
                                pr: 1.8,
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
                            <Stack direction="row" alignItems="center" spacing={1.4}>
                                <Avatar
                                    sx={{
                                        width: 38,
                                        height: 38,
                                        bgcolor: "#0f766e",
                                        color: "#F8FAFC",
                                        fontWeight: 700,
                                        fontSize: 15,
                                        border: "2px solid #14b8a6"
                                    }}
                                >
                                    {getInitials(user.name)}
                                </Avatar>
                                <Box sx={{ textAlign: "left", display: { xs: "none", sm: "block" } }}>
                                    <Typography sx={{ color: "#F8FAFC", fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
                                        {user.name}
                                    </Typography>
                                    <Typography sx={{ color: "#94A3B8", fontSize: 11 }}>
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
                                <Typography sx={{ color: "#94A3B8", fontSize: 12 }}>
                                    {user.email}
                                </Typography>
                            </Box>

                            <Divider sx={{ my: 1, borderColor: "rgba(255, 255, 255, 0.08)" }} />

                            <MenuItem
                                onClick={() => {
                                    handleMenuClose();
                                    navigate("/profile");
                                }}
                                sx={{ borderRadius: 2, py: 1, gap: 1.5 }}
                            >
                                <PersonIcon sx={{ fontSize: 18, color: "#38bdf8" }} />
                                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                                    My Learning Profile
                                </Typography>
                            </MenuItem>

                            <MenuItem
                                onClick={() => {
                                    handleMenuClose();
                                    setSettingsOpen(true);
                                }}
                                sx={{ borderRadius: 2, py: 1, gap: 1.5 }}
                            >
                                <SettingsIcon sx={{ fontSize: 18, color: "#14b8a6" }} />
                                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                                    System Settings & Audit
                                </Typography>
                            </MenuItem>

                            <Divider sx={{ my: 1, borderColor: "rgba(255, 255, 255, 0.08)" }} />

                            <MenuItem
                                onClick={handleLogout}
                                sx={{
                                    borderRadius: 2,
                                    py: 1,
                                    gap: 1.5,
                                    color: "#ef4444",
                                    "&:hover": { bgcolor: "rgba(239, 68, 68, 0.1)" }
                                }}
                            >
                                <LogoutIcon sx={{ fontSize: 18 }} />
                                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                                    Log Out
                                </Typography>
                            </MenuItem>
                        </Menu>
                    </Stack>
                </Toolbar>
            </Container>

            {/* System Settings Modal */}
            <Dialog
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                PaperProps={{
                    sx: {
                        bgcolor: "#0F172A",
                        color: "#F8FAFC",
                        borderRadius: 4,
                        p: 1,
                        border: "1px solid rgba(20, 184, 166, 0.3)",
                        maxWidth: 500,
                        width: "100%"
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: "#F8FAFC" }}>
                    System Architecture & Model Info
                </DialogTitle>
                <DialogContent dividers sx={{ borderColor: "rgba(255, 255, 255, 0.08)" }}>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Box>
                            <Typography sx={{ color: "#14b8a6", fontWeight: 700, fontSize: 12 }}>
                                PRODUCTION REGRESSOR
                            </Typography>
                            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                                Extra Trees Regressor_v4.0 (38 Features)
                            </Typography>
                        </Box>
                        <Box>
                            <Typography sx={{ color: "#10b981", fontWeight: 700, fontSize: 12 }}>
                                LEAK-FREE ISOLATION CONTRACT
                            </Typography>
                            <Typography sx={{ fontSize: 13, color: "#94a3b8" }}>
                                Users 1 and 2 excluded from training set. 100% temporal isolation verified.
                            </Typography>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button
                        onClick={() => setSettingsOpen(false)}
                        sx={{ color: "#14b8a6", fontWeight: 700 }}
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </AppBar>
    );
}
