import { useState, useRef, useEffect } from "react";

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
    Divider
} from "@mui/material";

import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

import { Link, useNavigate } from "react-router-dom";

import { loginUser } from "../api/api";
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


export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [email, setEmail] = useState("");

    const [password, setPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState("");


    // --------------------------------------------------
    // Creature animation (Full 360° Global Cursor Tracking)
    // --------------------------------------------------

    const sceneRef = useRef<HTMLDivElement>(null);
    const targetOffset = useRef({ x: 0, y: 0 });
    const [currentOffset, setCurrentOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleGlobalMouseMove = (event: MouseEvent) => {
            if (!sceneRef.current) return;
            const rect = sceneRef.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const deltaX = event.clientX - centerX;
            const deltaY = event.clientY - centerY;
            const angle = Math.atan2(deltaY, deltaX);
            const dist = Math.hypot(deltaX, deltaY);

            // Dynamic tracking distance up to 24px in all 360 degrees
            const eyeDistance = Math.min(dist / 16, 24);

            targetOffset.current = {
                x: Math.cos(angle) * eyeDistance,
                y: Math.sin(angle) * eyeDistance
            };
        };

        window.addEventListener("mousemove", handleGlobalMouseMove);
        return () => window.removeEventListener("mousemove", handleGlobalMouseMove);
    }, []);

    useEffect(() => {
        let animationFrameId: number;

        const animate = () => {
            setCurrentOffset((prev) => ({
                x: prev.x + (targetOffset.current.x - prev.x) * 0.14,
                y: prev.y + (targetOffset.current.y - prev.y) * 0.14
            }));

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    const getBodyTransform = (
        tiltSensitivity: number = 1,
        skewSensitivity: number = 1
    ) => {
        if (showPassword) {
            return `rotate(-18deg) skewX(-14deg) translateY(10px)`;
        }

        const bodyX = currentOffset.x * 0.7 * tiltSensitivity;
        const bodyY = currentOffset.y * 0.85 * tiltSensitivity;
        const rotate = (currentOffset.x / 24) * 15 * skewSensitivity;

        return `translate(${bodyX}px, ${bodyY}px) rotate(${rotate}deg)`;
    };

    const getEyeTransform = (multiplier: number = 1) => {
        if (showPassword) {
            return `translate(-15px, -14px)`; // Shyly look away to top-left when password is visible
        }

        const eyeX = currentOffset.x * 1.2 * multiplier;
        const eyeY = currentOffset.y * 1.3 * multiplier;

        return `translate(${eyeX}px, ${eyeY}px)`;
    };


    // --------------------------------------------------
    // REAL LOGIN
    // --------------------------------------------------

    async function handleLogin(
        event: React.FormEvent
    ) {

        event.preventDefault();

        if (loading) return;

        setError("");

        if (
            !email.trim() ||
            !password
        ) {

            setError(
                "Please enter your email and password."
            );

            return;
        }

        setLoading(true);

        try {

            const result =
                await loginUser(
                    email
                        .trim()
                        .toLowerCase(),

                    password
                );


            // --------------------------------------------------
            // Save authentication information & update state
            // --------------------------------------------------

            login(result.access_token, result.user);


            // --------------------------------------------------
            // Go to dashboard
            // --------------------------------------------------

            navigate("/", { replace: true });

        } catch (error: any) {

            if (error.response?.status === 401) {
                setError(
                    error.response?.data?.detail ||
                    "Invalid email or password."
                );
            } else if (error.response?.status === 404) {
                setError("API endpoint not found. Please check backend server status.");
            } else if (error.response?.status === 422) {
                setError("Please enter a valid email and password.");
            } else if (error.code === "ERR_NETWORK") {
                setError("Cannot connect to the backend server.");
            } else {
                setError(
                    error.response?.data?.detail ||
                    "Unable to sign in. Please try again."
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
                background: "radial-gradient(circle at top, #064e3b 0%, #020617 55%, #020617 100%)"
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    width: "100%",
                    maxWidth: 500,
                    p: { xs: 4, sm: 6 },
                    borderRadius: 4,
                    bgcolor: "rgba(15,23,42,.88)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(20,184,166,.18)",
                    boxShadow: "0 25px 60px rgba(0,0,0,.45)",
                    position: "relative",
                    overflow: "hidden"
                }}
            >

                {/* Interactive Animated Creatures */}

                <Box
                    ref={sceneRef}
                    sx={{
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "center",
                        height: 180,
                        position: "relative",
                        mb: 3
                    }}
                >

                    <Box
                        sx={{
                            position: "relative",
                            width: "280px",
                            height: "100%",
                            display: "flex",
                            alignItems: "flex-end",
                            justifyContent: "center"
                        }}
                    >

                        {/* Orange Blob */}

                        <Box
                            sx={{
                                position: "absolute",
                                left: 0,
                                bottom: 0,
                                width: 135,
                                height: 115,
                                bgcolor: "#f97316",
                                borderTopLeftRadius: 120,
                                borderTopRightRadius: 100,
                                display: "flex",
                                alignItems: "flex-start",
                                pl: 3.5,
                                pt: 4,
                                transformOrigin:
                                    "bottom center",
                                transform:
                                    getBodyTransform(
                                        0.7,
                                        0.8
                                    ),
                                willChange:
                                    "transform"
                            }}
                        >

                            <Box
                                sx={{
                                    display: "flex",
                                    gap: "9px",
                                    transform:
                                        getEyeTransform(
                                            1.1
                                        )
                                }}
                            >

                                <Box
                                    sx={{
                                        width: 7,
                                        height: 7,
                                        bgcolor:
                                            "#0f172a",
                                        borderRadius:
                                            "50%"
                                    }}
                                />

                                <Box
                                    sx={{
                                        width: 7,
                                        height: 7,
                                        bgcolor:
                                            "#0f172a",
                                        borderRadius:
                                            "50%"
                                    }}
                                />

                                <Box
                                    sx={{
                                        width: 9,
                                        height: 7,
                                        bgcolor:
                                            "#0f172a",
                                        borderRadius:
                                            "50%"
                                    }}
                                />

                            </Box>

                        </Box>


                        {/* Purple Creature */}

                        <Box
                            sx={{
                                position: "absolute",
                                left: 85,
                                bottom: 0,
                                width: 70,
                                height: 165,
                                bgcolor: "#8b5cf6",
                                borderTopLeftRadius: 20,
                                borderTopRightRadius: 20,
                                display: "flex",
                                flexDirection:
                                    "column",
                                alignItems:
                                    "center",
                                pt: 3,
                                transformOrigin:
                                    "bottom center",
                                transform:
                                    getBodyTransform(
                                        1.2,
                                        1.4
                                    ),
                                willChange:
                                    "transform"
                            }}
                        >

                            <Box
                                sx={{
                                    display: "flex",
                                    gap: "12px",
                                    transform:
                                        getEyeTransform(
                                            1.0
                                        )
                                }}
                            >

                                <Box
                                    sx={{
                                        width: 7,
                                        height: 7,
                                        bgcolor:
                                            "#f8fafc",
                                        borderRadius:
                                            "50%",
                                        display: "flex",
                                        alignItems:
                                            "center",
                                        justifyContent:
                                            "center"
                                    }}
                                >

                                    <Box
                                        sx={{
                                            width: 3,
                                            height: 3,
                                            bgcolor:
                                                "#0f172a",
                                            borderRadius:
                                                "50%"
                                        }}
                                    />

                                </Box>

                                <Box
                                    sx={{
                                        width: 7,
                                        height: 7,
                                        bgcolor:
                                            "#f8fafc",
                                        borderRadius:
                                            "50%",
                                        display: "flex",
                                        alignItems:
                                            "center",
                                        justifyContent:
                                            "center"
                                    }}
                                >

                                    <Box
                                        sx={{
                                            width: 3,
                                            height: 3,
                                            bgcolor:
                                                "#0f172a",
                                            borderRadius:
                                                "50%"
                                        }}
                                    />

                                </Box>

                            </Box>

                        </Box>


                        {/* Black Creature */}

                        <Box
                            sx={{
                                position: "absolute",
                                left: 160,
                                bottom: 0,
                                width: 60,
                                height: 140,
                                bgcolor: "#09090b",
                                borderTopLeftRadius: 14,
                                borderTopRightRadius: 14,
                                display: "flex",
                                pt: 3,
                                pl: 2,
                                transformOrigin:
                                    "bottom center",
                                transform:
                                    getBodyTransform(
                                        0.9,
                                        1.1
                                    ),
                                willChange:
                                    "transform"
                            }}
                        >

                            <Box
                                sx={{
                                    display: "flex",
                                    gap: "9px",
                                    transform:
                                        getEyeTransform(
                                            1.0
                                        )
                                }}
                            >

                                <Box
                                    sx={{
                                        width: 8,
                                        height: 8,
                                        bgcolor:
                                            "#f8fafc",
                                        borderRadius:
                                            "50%",
                                        display: "flex",
                                        alignItems:
                                            "center",
                                        justifyContent:
                                            "center"
                                    }}
                                >

                                    <Box
                                        sx={{
                                            width: 3.5,
                                            height: 3.5,
                                            bgcolor:
                                                "#0f172a",
                                            borderRadius:
                                                "50%"
                                        }}
                                    />

                                </Box>

                                <Box
                                    sx={{
                                        width: 8,
                                        height: 8,
                                        bgcolor:
                                            "#f8fafc",
                                        borderRadius:
                                            "50%",
                                        display: "flex",
                                        alignItems:
                                            "center",
                                        justifyContent:
                                            "center"
                                    }}
                                >

                                    <Box
                                        sx={{
                                            width: 3.5,
                                            height: 3.5,
                                            bgcolor:
                                                "#0f172a",
                                            borderRadius:
                                                "50%"
                                        }}
                                    />

                                </Box>

                            </Box>

                        </Box>


                        {/* Yellow Creature */}

                        <Box
                            sx={{
                                position: "absolute",
                                right: 0,
                                bottom: 0,
                                width: 85,
                                height: 105,
                                bgcolor: "#eab308",
                                borderTopLeftRadius: 70,
                                borderTopRightRadius: 70,
                                display: "flex",
                                alignItems:
                                    "flex-start",
                                pt: 3.5,
                                pl: 3,
                                transformOrigin:
                                    "bottom center",
                                transform:
                                    getBodyTransform(
                                        0.8,
                                        0.9
                                    ),
                                willChange:
                                    "transform"
                            }}
                        >

                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems:
                                        "center",
                                    gap: 1.5,
                                    transform:
                                        getEyeTransform(
                                            1.1
                                        )
                                }}
                            >

                                <Box
                                    sx={{
                                        width: 7,
                                        height: 7,
                                        bgcolor:
                                            "#0f172a",
                                        borderRadius:
                                            "50%"
                                    }}
                                />

                                <Box
                                    sx={{
                                        width: 14,
                                        height: 4,
                                        bgcolor:
                                            "#0f172a",
                                        borderRadius: 1
                                    }}
                                />

                            </Box>

                        </Box>

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
                    Welcome Back
                </Typography>


                <Typography
                    sx={{
                        textAlign: "center",
                        color: "#94A3B8",
                        mb: 2
                    }}
                >
                    Sign in to your Video Intelligence account.
                </Typography>


                <Box
                    onClick={() => {
                        setEmail("user@ex.com");
                        setPassword("password");
                    }}
                    sx={{
                        mb: 3,
                        p: 1.75,
                        borderRadius: 2,
                        bgcolor: "rgba(20, 184, 166, 0.08)",
                        border: "1px dashed rgba(20, 184, 166, 0.3)",
                        textAlign: "center",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        "&:hover": {
                            bgcolor: "rgba(20, 184, 166, 0.14)",
                            borderColor: "#14B8A6"
                        }
                    }}
                >
                    <Typography variant="body2" sx={{ color: "#94A3B8", fontSize: "0.875rem", fontFamily: "monospace" }}>
                        for quick check, use id: <Box component="span" sx={{ color: "#14B8A6", fontWeight: 700 }}>user@ex.com</Box>
                        <br />
                        pass: <Box component="span" sx={{ color: "#14B8A6", fontWeight: 700 }}>password</Box>
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748B", display: "block", mt: 0.5, fontStyle: "italic" }}>
                        (it is preprocessed on vidoes)
                    </Typography>
                </Box>


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


                <Box
                    component="form"
                    onSubmit={handleLogin}
                >

                    {/* Email */}

                    <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) =>
                            setEmail(
                                e.target.value
                            )
                        }
                        autoComplete="email"
                        sx={{
                            mb: 2.5,

                            "& .MuiOutlinedInput-root": {
                                color: "#F8FAFC",
                                borderRadius: 2,

                                "& fieldset": {
                                    borderColor:
                                        "rgba(255,255,255,.15)"
                                },

                                "&:hover fieldset": {
                                    borderColor:
                                        "rgba(20,184,166,.5)"
                                },

                                "&.Mui-focused fieldset": {
                                    borderColor:
                                        "#14B8A6"
                                }
                            },

                            "& .MuiInputLabel-root": {
                                color: "#94A3B8"
                            },

                            "& .MuiInputLabel-root.Mui-focused": {
                                color: "#14B8A6"
                            }
                        }}

                        InputProps={{
                            startAdornment: (

                                <PersonRoundedIcon
                                    sx={{
                                        color:
                                            "#64748B",
                                        mr: 1
                                    }}
                                />

                            )
                        }}
                    />


                    {/* Password */}

                    <TextField
                        fullWidth
                        label="Password"
                        type={
                            showPassword
                                ? "text"
                                : "password"
                        }
                        value={password}
                        onChange={(e) =>
                            setPassword(
                                e.target.value
                            )
                        }
                        autoComplete="current-password"
                        sx={{
                            mb: 3,

                            "& .MuiOutlinedInput-root": {
                                color: "#F8FAFC",
                                borderRadius: 2,

                                "& fieldset": {
                                    borderColor:
                                        "rgba(255,255,255,.15)"
                                },

                                "&:hover fieldset": {
                                    borderColor:
                                        "rgba(20,184,166,.5)"
                                },

                                "&.Mui-focused fieldset": {
                                    borderColor:
                                        "#14B8A6"
                                }
                            },

                            "& .MuiInputLabel-root": {
                                color: "#94A3B8"
                            },

                            "& .MuiInputLabel-root.Mui-focused": {
                                color: "#14B8A6"
                            }
                        }}

                        InputProps={{
                            startAdornment: (

                                <LockRoundedIcon
                                    sx={{
                                        color:
                                            "#64748B",
                                        mr: 1
                                    }}
                                />

                            ),

                            endAdornment: (

                                <InputAdornment
                                    position="end"
                                >

                                    <IconButton
                                        aria-label="toggle password visibility"
                                        onClick={() =>
                                            setShowPassword(
                                                !showPassword
                                            )
                                        }
                                        edge="end"
                                        sx={{
                                            color:
                                                "#94A3B8"
                                        }}
                                    >

                                        {
                                            showPassword
                                                ? <VisibilityOff />
                                                : <Visibility />
                                        }

                                    </IconButton>

                                </InputAdornment>

                            )
                        }}
                    />


                    {/* Sign In */}

                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        disabled={loading}
                        startIcon={
                            loading
                                ? undefined
                                : <LoginRoundedIcon />
                        }
                        sx={{
                            height: 52,
                            borderRadius: 2,
                            bgcolor: "#14B8A6",
                            color: "#021617",
                            fontWeight: 800,

                            boxShadow:
                                "0 4px 20px rgba(20, 184, 166, 0.3)",

                            "&:hover": {
                                bgcolor: "#10B981",

                                boxShadow:
                                    "0 6px 24px rgba(16, 185, 129, 0.4)"
                            }
                        }}
                    >

                        {loading ? (

                            <CircularProgress
                                size={24}
                                sx={{
                                    color:
                                        "#021617"
                                }}
                            />

                        ) : (

                            "Sign In"

                        )}

                    </Button>

                </Box>


                <Divider
                    sx={{
                        my: 3,
                        borderColor:
                            "rgba(255, 255, 255, 0.12)",
                        color: "#64748B",
                        fontSize: "0.85rem",
                        fontWeight: 500
                    }}
                >
                    OR
                </Divider>


                {/* Google */}

                <Button
                    fullWidth
                    variant="outlined"
                    startIcon={
                        <GoogleIcon />
                    }
                    onClick={() => {
                        /* Hook up Google Auth logic here */
                    }}
                    sx={{
                        height: 48,
                        borderRadius: 2,
                        color: "#F8FAFC",
                        borderColor:
                            "rgba(255, 255, 255, 0.15)",
                        bgcolor:
                            "rgba(255, 255, 255, 0.03)",
                        backdropFilter:
                            "blur(10px)",
                        textTransform:
                            "none",
                        fontSize:
                            "0.95rem",
                        fontWeight: 600,
                        transition:
                            "all 0.2s ease",

                        "&:hover": {
                            borderColor:
                                "rgba(20, 184, 166, 0.5)",
                            bgcolor:
                                "rgba(20, 184, 166, 0.08)",
                            boxShadow:
                                "0 0 20px rgba(20, 184, 166, 0.15)",
                            transform:
                                "translateY(-1px)"
                        }
                    }}
                >
                    Sign in with Google
                </Button>


                <Typography
                    sx={{
                        textAlign: "center",
                        color: "#94A3B8",
                        mt: 3.5
                    }}
                >

                    Don't have an account?{" "}

                    <Box
                        component={Link}
                        to="/register"
                        sx={{
                            color: "#14B8A6",
                            fontWeight: 700,
                            textDecoration:
                                "none",

                            "&:hover": {
                                color:
                                    "#10B981"
                            }
                        }}
                    >
                        Create account
                    </Box>

                </Typography>

            </Paper>

        </Box>

    );
}