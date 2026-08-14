import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Box, Typography, Button } from "@mui/material";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <Box
                    sx={{
                        minHeight: "100vh",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "#0F172A",
                        color: "#F8FAFC",
                        p: 3,
                        textAlign: "center"
                    }}
                >
                    <Typography variant="h4" gutterBottom sx={{ color: "#E2E8F0", fontWeight: "bold" }}>
                        Something went wrong
                    </Typography>
                    <Typography variant="body1" sx={{ color: "#94A3B8", mb: 4, maxWidth: "500px" }}>
                        An unexpected runtime error occurred. Please reload the page or click below to return home.
                    </Typography>
                    {this.state.error && (
                        <Box
                            sx={{
                                bgcolor: "#1E293B",
                                p: 2,
                                borderRadius: 1,
                                fontFamily: "monospace",
                                fontSize: "0.85rem",
                                textAlign: "left",
                                maxWidth: "80vw",
                                overflowX: "auto",
                                mb: 4,
                                border: "1px solid #334155"
                            }}
                        >
                            {this.state.error.toString()}
                        </Box>
                    )}
                    <Button
                        variant="contained"
                        onClick={() => {
                            window.location.href = "/";
                        }}
                        sx={{
                            bgcolor: "#14B8A6",
                            "&:hover": { bgcolor: "#0D9488" },
                            textTransform: "none",
                            px: 4
                        }}
                    >
                        Reload Application
                    </Button>
                </Box>
            );
        }

        return this.props.children;
    }
}
