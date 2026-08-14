import { useState } from "react";

import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Paper,
    TextField,
    Typography,
    IconButton,
    InputAdornment,
    Divider,
    LinearProgress
} from "@mui/material";

import PersonAddRoundedIcon from "@mui/icons-material/PersonAddRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";

import { Link, useNavigate } from "react-router-dom";
import { registerUser, loginUser } from "../api/api";
import { useAuth } from "../context/AuthContext";

// Custom Google SVG Icon
function GoogleIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24">
            <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
        </svg>
    );
}

export default function Register() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Email validation rules
    const emailRules = {
        hasUser: /^[^\s@]+/.test(email),
        hasAt: /@/.test(email),
        hasDomain: /@[^\s@]+\.[^\s@]+$/.test(email)
    };

    const isEmailValid = emailRules.hasUser && emailRules.hasAt && emailRules.hasDomain;

    // Password validation rules
    const passwordRules = {
        minChar: password.length >= 8,
        hasUpper: /[A-Z]/.test(password),
        hasLower: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    const passedPasswordRulesCount = Object.values(passwordRules).filter(Boolean).length;
    const strengthProgress = (passedPasswordRulesCount / 5) * 100;

    const getStrengthColor = () => {
        if (passedPasswordRulesCount <= 2) return "#f43f5e";
        if (passedPasswordRulesCount <= 4) return "#f59e0b";
        return "#10b981";
    };

    const getStrengthLabel = () => {
        if (password.length === 0) return "";
        if (passedPasswordRulesCount <= 2) return "Weak";
        if (passedPasswordRulesCount <= 4) return "Moderate";
        return "Strong";
    };

    async function handleRegister(event: React.FormEvent) {
        event.preventDefault();

        setError("");

        if (!name.trim() || !email.trim() || !password || !confirmPassword) {
            setError("Please complete all required fields.");
            return;
        }

        if (!isEmailValid) {
            setError("Please enter a valid email address.");
            return;
        }

        if (passedPasswordRulesCount < 5) {
            setError("Please satisfy all password complexity rules.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            // Create the account
            await registerUser(
                name.trim(),
                email.trim().toLowerCase(),
                password
            );

            // Immediately log the new user in
            const loginResult = await loginUser(
                email.trim().toLowerCase(),
                password
            );

            // Save JWT token and user state
            login(loginResult.access_token, loginResult.user);

            // Go directly to dashboard
            navigate("/", { replace: true });

        } catch (error: any) {
            if (error.response?.status === 400) {
                setError(
                    error.response?.data?.detail ||
                    "An account with this email already exists."
                );
            } else if (error.code === "ERR_NETWORK") {
                setError("Cannot connect to the backend.");
            } else {
                setError(
                    error.response?.data?.detail ||
                    "Unable to create your account. Please try again."
                );
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                px: 2,
                py: 5,
                background: "radial-gradient(circle at top, #064e3b 0%, #020617 55%, #020617 100%)"
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    width: "100%",
                    maxWidth: 480,
                    p: { xs: 3, sm: 5 },
                    borderRadius: 3,
                    bgcolor: "rgba(15,23,42,.88)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(20,184,166,.18)",
                    boxShadow: "0 25px 60px rgba(0,0,0,.45)"
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        mb: 3
                    }}
                >
                    <Box
                        sx={{
                            width: 64,
                            height: 64,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 2,
                            bgcolor: "rgba(20,184,166,.12)",
                            border: "1px solid rgba(20,184,166,.25)"
                        }}
                    >
                        <PersonAddRoundedIcon
                            sx={{
                                fontSize: 32,
                                color: "#14B8A6"
                            }}
                        />
                    </Box>
                </Box>

                <Typography
                    variant="h4"
                    sx={{
                        textAlign: "center",
                        color: "#F8FAFC",
                        fontWeight: 800,
                        mb: 1
                    }}
                >
                    Create Account
                </Typography>

                <Typography
                    sx={{
                        textAlign: "center",
                        color: "#94A3B8",
                        mb: 4
                    }}
                >
                    Create your personal learning workspace.
                </Typography>

                {error && (
                    <Alert
                        severity="error"
                        sx={{
                            mb: 3,
                            borderRadius: 2
                        }}
                    >
                        {error}
                    </Alert>
                )}

                <Box component="form" onSubmit={handleRegister}>
                    {/* Full Name */}
                    <TextField
                        fullWidth
                        label="Full Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoComplete="name"
                        sx={{
                            mb: 2.5,
                            "& .MuiOutlinedInput-root": {
                                color: "#F8FAFC",
                                borderRadius: 2,
                                "& fieldset": { borderColor: "rgba(255,255,255,.15)" },
                                "&:hover fieldset": { borderColor: "rgba(20,184,166,.5)" },
                                "&.Mui-focused fieldset": { borderColor: "#14B8A6" }
                            },
                            "& .MuiInputLabel-root": { color: "#94A3B8" },
                            "& .MuiInputLabel-root.Mui-focused": { color: "#14B8A6" }
                        }}
                        InputProps={{
                            startAdornment: (
                                <PersonRoundedIcon sx={{ color: "#64748B", mr: 1 }} />
                            )
                        }}
                    />

                    {/* Email */}
                    <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        sx={{
                            mb: email.length > 0 ? 1 : 2.5,
                            "& .MuiOutlinedInput-root": {
                                color: "#F8FAFC",
                                borderRadius: 2,
                                "& fieldset": { borderColor: "rgba(255,255,255,.15)" },
                                "&:hover fieldset": { borderColor: "rgba(20,184,166,.5)" },
                                "&.Mui-focused fieldset": { borderColor: "#14B8A6" }
                            },
                            "& .MuiInputLabel-root": { color: "#94A3B8" },
                            "& .MuiInputLabel-root.Mui-focused": { color: "#14B8A6" }
                        }}
                        InputProps={{
                            startAdornment: (
                                <EmailRoundedIcon sx={{ color: "#64748B", mr: 1 }} />
                            )
                        }}
                    />

                    {/* Email Live Feedback */}
                    {email.length > 0 && (
                        <Box sx={{ mb: 2.5, px: 0.5, display: "flex", gap: 2 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                                {isEmailValid ? (
                                    <CheckCircleRoundedIcon sx={{ fontSize: 14, color: "#10b981" }} />
                                ) : (
                                    <CancelRoundedIcon sx={{ fontSize: 14, color: "#64748b" }} />
                                )}
                                <Typography
                                    variant="caption"
                                    sx={{ color: isEmailValid ? "#10b981" : "#64748b", fontSize: "0.75rem" }}
                                >
                                    {isEmailValid ? "Valid email format" : "Invalid email format"}
                                </Typography>
                            </Box>
                        </Box>
                    )}

                    {/* Password */}
                    <TextField
                        fullWidth
                        label="Password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        sx={{
                            mb: 1.5,
                            "& .MuiOutlinedInput-root": {
                                color: "#F8FAFC",
                                borderRadius: 2,
                                "& fieldset": { borderColor: "rgba(255,255,255,.15)" },
                                "&:hover fieldset": { borderColor: "rgba(20,184,166,.5)" },
                                "&.Mui-focused fieldset": { borderColor: "#14B8A6" }
                            },
                            "& .MuiInputLabel-root": { color: "#94A3B8" },
                            "& .MuiInputLabel-root.Mui-focused": { color: "#14B8A6" }
                        }}
                        InputProps={{
                            startAdornment: (
                                <LockRoundedIcon sx={{ color: "#64748B", mr: 1 }} />
                            ),
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        aria-label="toggle password visibility"
                                        onClick={() => setShowPassword(!showPassword)}
                                        edge="end"
                                        sx={{ color: "#94A3B8" }}
                                    >
                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                    />

                    {/* Password Strength Meter & Guidelines */}
                    {password.length > 0 && (
                        <Box sx={{ mb: 2.5, px: 0.5 }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.8 }}>
                                <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                                    Password Strength
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{ color: getStrengthColor(), fontWeight: 700 }}
                                >
                                    {getStrengthLabel()}
                                </Typography>
                            </Box>

                            <LinearProgress
                                variant="determinate"
                                value={strengthProgress}
                                sx={{
                                    height: 6,
                                    borderRadius: 3,
                                    bgcolor: "rgba(255, 255, 255, 0.1)",
                                    "& .MuiLinearProgress-bar": {
                                        bgcolor: getStrengthColor(),
                                        borderRadius: 3,
                                        transition: "all 0.3s ease"
                                    }
                                }}
                            />

                            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.8, mt: 1.5 }}>
                                {[
                                    { key: "minChar", label: "8+ Characters" },
                                    { key: "hasUpper", label: "Uppercase letter" },
                                    { key: "hasLower", label: "Lowercase letter" },
                                    { key: "hasNumber", label: "At least 1 number" },
                                    { key: "hasSpecial", label: "Special symbol" }
                                ].map((item) => {
                                    const isValid = passwordRules[item.key as keyof typeof passwordRules];
                                    return (
                                        <Box key={item.key} sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                                            {isValid ? (
                                                <CheckCircleRoundedIcon sx={{ fontSize: 14, color: "#10b981" }} />
                                            ) : (
                                                <CancelRoundedIcon sx={{ fontSize: 14, color: "#64748b" }} />
                                            )}
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: isValid ? "#f8fafc" : "#64748b",
                                                    fontSize: "0.75rem",
                                                    transition: "color 0.2s ease"
                                                }}
                                            >
                                                {item.label}
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>
                    )}

                    {/* Confirm Password */}
                    <TextField
                        fullWidth
                        label="Confirm Password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        sx={{
                            mb: 3,
                            "& .MuiOutlinedInput-root": {
                                color: "#F8FAFC",
                                borderRadius: 2,
                                "& fieldset": { borderColor: "rgba(255,255,255,.15)" },
                                "&:hover fieldset": { borderColor: "rgba(20,184,166,.5)" },
                                "&.Mui-focused fieldset": { borderColor: "#14B8A6" }
                            },
                            "& .MuiInputLabel-root": { color: "#94A3B8" },
                            "& .MuiInputLabel-root.Mui-focused": { color: "#14B8A6" }
                        }}
                        InputProps={{
                            startAdornment: (
                                <LockRoundedIcon sx={{ color: "#64748B", mr: 1 }} />
                            ),
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        aria-label="toggle confirm password visibility"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        edge="end"
                                        sx={{ color: "#94A3B8" }}
                                    >
                                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                    />

                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        disabled={loading}
                        startIcon={loading ? undefined : <PersonAddRoundedIcon />}
                        sx={{
                            height: 52,
                            borderRadius: 2,
                            bgcolor: "#14B8A6",
                            color: "#021617",
                            fontWeight: 800,
                            boxShadow: "0 4px 20px rgba(20, 184, 166, 0.3)",
                            "&:hover": {
                                bgcolor: "#10B981",
                                boxShadow: "0 6px 24px rgba(16, 185, 129, 0.4)"
                            }
                        }}
                    >
                        {loading ? (
                            <CircularProgress size={24} sx={{ color: "#021617" }} />
                        ) : (
                            "Create Account"
                        )}
                    </Button>
                </Box>

                <Divider
                    sx={{
                        my: 3,
                        borderColor: "rgba(255, 255, 255, 0.12)",
                        color: "#64748B",
                        fontSize: "0.85rem",
                        fontWeight: 500
                    }}
                >
                    OR
                </Divider>

                {/* Google Sign Up */}
                <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<GoogleIcon />}
                    onClick={() => {
                        /* Hook up Google Auth logic here */
                    }}
                    sx={{
                        height: 48,
                        borderRadius: 2,
                        color: "#F8FAFC",
                        borderColor: "rgba(255, 255, 255, 0.15)",
                        bgcolor: "rgba(255, 255, 255, 0.03)",
                        backdropFilter: "blur(10px)",
                        textTransform: "none",
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        transition: "all 0.2s ease",
                        "&:hover": {
                            borderColor: "rgba(20, 184, 166, 0.5)",
                            bgcolor: "rgba(20, 184, 166, 0.08)",
                            boxShadow: "0 0 20px rgba(20, 184, 166, 0.15)",
                            transform: "translateY(-1px)"
                        }
                    }}
                >
                    Sign up with Google
                </Button>

                <Typography
                    sx={{
                        textAlign: "center",
                        color: "#94A3B8",
                        mt: 3.5
                    }}
                >
                    Already have an account?{" "}
                    <Box
                        component={Link}
                        to="/login"
                        sx={{
                            color: "#14B8A6",
                            fontWeight: 700,
                            textDecoration: "none",
                            "&:hover": {
                                color: "#10B981"
                            }
                        }}
                    >
                        Sign in
                    </Box>
                </Typography>
            </Paper>
        </Box>
    );
}