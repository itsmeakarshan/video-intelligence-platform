import {
    BrowserRouter,
    Routes,
    Route
} from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Summary from "./pages/Summary";
import Notes from "./pages/Notes";
import Quiz from "./pages/Quiz";
import Login from "./pages/Login";
import Register from "./pages/Register";

import { ChatProvider } from "./context/ChatContext";
import { VideoProvider } from "./context/VideoContext";

export default function App() {

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
                            element={<Dashboard />}
                        />

                        <Route
                            path="/summary"
                            element={<Summary />}
                        />

                        <Route
                            path="/notes"
                            element={<Notes />}
                        />

                        <Route
                            path="/quiz"
                            element={<Quiz />}
                        />

                    </Routes>

                </ChatProvider>

            </VideoProvider>

        </BrowserRouter>

    );

}