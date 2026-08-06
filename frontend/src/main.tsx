import React from "react";
import ReactDOM from "react-dom/client";

import { Toaster } from "react-hot-toast";

import App from "./App";

import { ChatProvider } from "./context/ChatContext";
import { VideoProvider } from "./context/VideoContext";

import "./styles/global.css";

ReactDOM.createRoot(
    document.getElementById("root")!
).render(

    <React.StrictMode>

        <VideoProvider>

            <ChatProvider>

                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 3000,
                        style: {
                            borderRadius: "12px",
                            background: "#111827",
                            color: "#ffffff"
                        }
                    }}
                />

                <App />

            </ChatProvider>

        </VideoProvider>

    </React.StrictMode>

);