import React from "react";
import ReactDOM from "react-dom/client";

import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

import { Toaster } from "react-hot-toast";

import App from "./App";

import theme from "./theme/theme";

import { ChatProvider } from "./context/ChatContext";
import { VideoProvider } from "./context/VideoContext";

import "./styles/global.css";

ReactDOM.createRoot(
    document.getElementById("root")!
).render(

    <React.StrictMode>

        <ThemeProvider theme={theme}>

            <CssBaseline />

            <VideoProvider>

                <ChatProvider>

                    <Toaster

                        position="top-right"

                        toastOptions={{

                            duration:3000,

                            style:{

                                borderRadius:"16px",

                                background:"#111827",

                                color:"#fff"

                            }

                        }}

                    />

                    <App />

                </ChatProvider>

            </VideoProvider>

        </ThemeProvider>

    </React.StrictMode>

);
