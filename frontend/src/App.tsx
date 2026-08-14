import {
    BrowserRouter,
    Routes,
    Route,
    Navigate
} from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";

import Dashboard from "./pages/Dashboard";
import Summary from "./pages/Summary";
import Notes from "./pages/Notes";
import Quiz from "./pages/Quiz";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MLPerformance from "./pages/MLPerformance";
import Profile from "./pages/Profile";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { ChatProvider } from "./context/ChatContext";
import { VideoProvider } from "./context/VideoContext";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <Box
                sx={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "#0F172A"
                }}
            >
                <CircularProgress sx={{ color: "#14B8A6" }} />
            </Box>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <Box
                sx={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "#0F172A"
                }}
            >
                <CircularProgress sx={{ color: "#14B8A6" }} />
            </Box>
        );
    }

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <VideoProvider>
                    <ChatProvider>
                        <Routes>
                            <Route
                                path="/login"
                                element={
                                    <PublicRoute>
                                        <Login />
                                    </PublicRoute>
                                }
                            />
                            <Route
                                path="/register"
                                element={
                                    <PublicRoute>
                                        <Register />
                                    </PublicRoute>
                                }
                            />
                            <Route
                                path="/"
                                element={
                                    <ProtectedRoute>
                                        <Dashboard />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/profile"
                                element={
                                    <ProtectedRoute>
                                        <Profile />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/summary"
                                element={
                                    <ProtectedRoute>
                                        <Summary />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/notes"
                                element={
                                    <ProtectedRoute>
                                        <Notes />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/quiz"
                                element={
                                    <ProtectedRoute>
                                        <Quiz />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/ml-performance"
                                element={
                                    <ProtectedRoute>
                                        <MLPerformance />
                                    </ProtectedRoute>
                                }
                            />
                        </Routes>
                    </ChatProvider>
                </VideoProvider>
            </BrowserRouter>
        </AuthProvider>
    );
}
