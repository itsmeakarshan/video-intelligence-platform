import {
    Avatar,
    Box,
    IconButton,
    Paper,
    Tooltip
} from "@mui/material";

import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";

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

            toast("Copy for formatted messages is coming soon.");

            return;

        }

        await navigator.clipboard.writeText(children);

        toast.success("Copied to clipboard");

    }

    return (

        <Box

            sx={{

                display: "flex",

                justifyContent:

                    isUser

                        ? "flex-end"

                        : "flex-start",

                alignItems: "flex-end",

                gap: 1.5,

                mb: 4

            }}

        >

            {

                !isUser && (

                    <Avatar

                        sx={{

                            width: 42,

                            height: 42,

                            bgcolor: "#4F46E5",

                            boxShadow:

                                "0 10px 25px rgba(79,70,229,.35)",

                            flexShrink: 0

                        }}

                    >

                        <SmartToyRoundedIcon />

                    </Avatar>

                )

            }

            <Paper

                elevation={0}

                sx={{

                    position: "relative",

                    maxWidth: "80%",

                    px: 3,

                    py: 2.5,

                    borderRadius: 5,

                    overflow: "hidden",

                    wordBreak: "break-word",

                    transition: ".25s",

                    background:

                        isUser

                            ? "linear-gradient(135deg,#4F46E5,#6366F1)"

                            : "#FFFFFF",

                    color:

                        isUser

                            ? "#FFFFFF"

                            : "#111827",

                    border:

                        isUser

                            ? "none"

                            : "1px solid rgba(0,0,0,.06)",

                    boxShadow:

                        isUser

                            ? "0 18px 40px rgba(79,70,229,.25)"

                            : "0 10px 30px rgba(0,0,0,.08)",

                    "&:hover": {

                        transform: "translateY(-2px)",

                        boxShadow:

                            isUser

                                ? "0 22px 45px rgba(79,70,229,.32)"

                                : "0 16px 35px rgba(0,0,0,.12)"

                    }

                }}

            >

                <Box

                    sx={{

                        pr: !isUser ? 4 : 0,

                        lineHeight: 1.8,

                        fontSize: 15

                    }}

                >

                    {children}

                </Box>

                {

                    !isUser && (

                        <Tooltip

                            title="Copy"

                        >

                            <IconButton

                                size="small"

                                onClick={copyMessage}

                                sx={{

                                    position: "absolute",

                                    top: 10,

                                    right: 10,

                                    width: 30,

                                    height: 30,

                                    opacity: .55,

                                    transition: ".25s",

                                    "&:hover": {

                                        opacity: 1,

                                        bgcolor:

                                            "rgba(0,0,0,.06)"

                                    }

                                }}

                            >

                                <ContentCopyRoundedIcon

                                    fontSize="small"

                                />

                            </IconButton>

                        </Tooltip>

                    )

                }

            </Paper>

            {

                isUser && (

                    <Avatar

                        sx={{

                            width: 42,

                            height: 42,

                            bgcolor: "#111827",

                            boxShadow:

                                "0 10px 25px rgba(0,0,0,.22)",

                            flexShrink: 0

                        }}

                    >

                        <PersonRoundedIcon />

                    </Avatar>

                )

            }

        </Box>

    );

}