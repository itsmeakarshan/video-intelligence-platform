import React from "react";
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate
} from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseStudio from "./pages/CourseStudio";
import Summary from "./pages/Summary";
import Notes from "./pages/Notes";
import Quiz from "./pages/Quiz";
import QuizScores from "./pages/QuizScores";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminPanel from "./pages/AdminPanel";
import InstructorChat from "./pages/InstructorChat";
import CourseMasteryRoster from "./pages/CourseMasteryRoster";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { ChatProvider } from "./context/ChatContext";
import { VideoProvider } from "./context/VideoContext";
import { ErrorBoundary } from "./components/common/ErrorBoundary";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#18191E]">
                <div className="w-10 h-10 border-4 border-[#E5F842] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isAdmin, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#18191E]">
                <div className="w-10 h-10 border-4 border-[#E5F842] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (!isAdmin) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}

function StudentRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isAdmin, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#18191E]">
                <div className="w-10 h-10 border-4 border-[#E5F842] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (isAdmin) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#18191E]">
                <div className="w-10 h-10 border-4 border-[#E5F842] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}

export default function App() {
    return (
        <ErrorBoundary>
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
                                            <Courses />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/courses"
                                    element={
                                        <ProtectedRoute>
                                            <Courses />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/courses/:courseId"
                                    element={
                                        <ProtectedRoute>
                                            <CourseStudio />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/courses/:courseId/roster"
                                    element={
                                        <ProtectedRoute>
                                            <CourseMasteryRoster />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/courses/:courseId/mastery"
                                    element={
                                        <ProtectedRoute>
                                            <CourseMasteryRoster />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/roster"
                                    element={
                                        <ProtectedRoute>
                                            <CourseMasteryRoster />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/mastery"
                                    element={
                                        <ProtectedRoute>
                                            <CourseMasteryRoster />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/dashboard"
                                    element={
                                        <StudentRoute>
                                            <Dashboard />
                                        </StudentRoute>
                                    }
                                />
                                <Route
                                    path="/admin"
                                    element={
                                        <AdminRoute>
                                            <AdminPanel />
                                        </AdminRoute>
                                    }
                                />
                                <Route
                                    path="/profile"
                                    element={<Navigate to="/scores" replace />}
                                />
                                <Route
                                    path="/doubts"
                                    element={
                                        <ProtectedRoute>
                                            <InstructorChat />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/instructor-chat"
                                    element={
                                        <ProtectedRoute>
                                            <InstructorChat />
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
                                    path="/scores"
                                    element={
                                        <ProtectedRoute>
                                            <QuizScores />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/quiz-history"
                                    element={
                                        <ProtectedRoute>
                                            <QuizScores />
                                        </ProtectedRoute>
                                    }
                                />
                            </Routes>
                        </ChatProvider>
                    </VideoProvider>
                </BrowserRouter>
            </AuthProvider>
        </ErrorBoundary>
    );
}
