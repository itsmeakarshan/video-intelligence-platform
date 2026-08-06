import {
    Avatar,
    Box,
    IconButton,
    Paper,
    Tooltip
} from "@mui/material";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";

import type { ReactNode } from "react";

import toast from "react-hot-toast";

interface Props {
    role: "user" | "assistant";
    children: ReactNode;
}

export default function Message({
    role,
    children
}: Props) {

    const isUser = role === "user";

    async function copyMessage() {

        if (typeof children !== "string") {
            toast("Copy will be improved in the next update.");
            return;
        }

        await navigator.clipboard.writeText(children);

        toast.success("Copied to clipboard");

    }

    return (

        <Box
            sx={{
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start",
                alignItems: "flex-start",
                gap: 2,
                mb: 3
            }}
        >

            {!isUser && (

                <Avatar
                    sx={{
                        bgcolor: "#2563EB"
                    }}
                >
                    <SmartToyIcon />
                </Avatar>

            )}

            <Paper
                elevation={0}
                sx={{
                    maxWidth: "82%",
                    p: 2.5,
                    borderRadius: 4,
                    backgroundColor: isUser ? "#2563EB" : "#FFFFFF",
                    color: isUser ? "#FFFFFF" : "#111827",
                    border: isUser ? "none" : "1px solid #E5E7EB",
                    position: "relative",
                    wordBreak: "break-word",
                    boxShadow: "0 3px 12px rgba(0,0,0,0.05)"
                }}
            >

                {children}

                {!isUser && (

                    <Tooltip title="Copy">

                        <IconButton
                            size="small"
                            onClick={copyMessage}
                            sx={{
                                position: "absolute",
                                top: 8,
                                right: 8
                            }}
                        >
                            <ContentCopyIcon fontSize="small" />
                        </IconButton>

                    </Tooltip>

                )}

            </Paper>

            {isUser && (

                <Avatar
                    sx={{
                        bgcolor: "#111827"
                    }}
                >
                    <PersonIcon />
                </Avatar>

            )}

        </Box>

    );

}