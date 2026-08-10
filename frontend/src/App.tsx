import {
    BrowserRouter,
    Routes,
    Route
} from "react-router-dom";
import { Navigate } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Summary from "./pages/Summary";
import Notes from "./pages/Notes";
import Quiz from "./pages/Quiz";
import Login from "./pages/Login";
import Register from "./pages/Register";

import { ChatProvider } from "./context/ChatContext";
import { VideoProvider } from "./context/VideoContext";

export default function App() {

    const requireAuth = (element: React.ReactNode) =>
        localStorage.getItem("access_token") ? element : <Navigate to="/login" replace />;

    return (

        <BrowserRouter>

            <VideoProvider>

                <ChatProvider>

                    <Routes>

                        <Route
                            path="/login"
                            element={<Login />}
                        />

                        <Route
                            path="/register"
                            element={<Register />}
                        />

                        <Route
                            path="/"
                            element={requireAuth(<Dashboard />)}
                        />

                        <Route
                            path="/summary"
                            element={requireAuth(<Summary />)}
                        />

                        <Route
                            path="/notes"
                            element={requireAuth(<Notes />)}
                        />

                        <Route
                            path="/quiz"
                            element={requireAuth(<Quiz />)}
                        />

                    </Routes>

                </ChatProvider>

            </VideoProvider>

        </BrowserRouter>

    );

}
