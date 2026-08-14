import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
    Box,
    Button,
    Chip,
    IconButton,
    Paper,
    Stack,
    Tooltip,
    Typography
} from "@mui/material";

import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";
import ThumbDownOutlinedIcon from "@mui/icons-material/ThumbDownOutlined";
import ThumbDownAltIcon from "@mui/icons-material/ThumbDownAlt";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

import { useVideo } from "../../context/VideoContext";

interface Source {
    video_id: number;
    start_time: number;
    end_time: number;
}

interface Props {
    id?: string;
    role: "user" | "assistant";
    text: string;
    sources?: Source[];
    isError?: boolean;
    onRegenerate?: () => void;
    onListen?: () => void;
    isSpeaking?: boolean;
    onFollowUp?: () => void;
}

function parseStartTimestampToSeconds(tsRangeStr: string): number {
    const firstPart = tsRangeStr.split(/[\-–—]/)[0].trim();
    const parts = firstPart.split(":").map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1 && !isNaN(parts[0])) return parts[0];
    return 0;
}

export default function Message({
    role,
    text,
    sources = [],
    isError = false,
    onRegenerate,
    onListen,
    isSpeaking = false,
    onFollowUp
}: Props) {
    const isUser = role === "user";
    const { videos, selectedVideo, jumpToVideo, seekTo } = useVideo();

    const [liked, setLiked] = useState(false);
    const [disliked, setDisliked] = useState(false);
    const [copied, setCopied] = useState(false);

    function handleCopy() {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    function handleTimestampClick(tsMatch: string) {
        const startSec = parseStartTimestampToSeconds(tsMatch);
        const sourceVideoId = sources && sources.length > 0 ? sources[0].video_id : null;

        let targetVideo = null;
        if (sourceVideoId) {
            targetVideo = videos.find(v => v.id === sourceVideoId);
        }
        if (!targetVideo) {
            targetVideo = selectedVideo || (videos.length > 0 ? videos[0] : null);
        }

        if (targetVideo && jumpToVideo) {
            jumpToVideo(targetVideo, startSec);
        } else if (seekTo) {
            seekTo(startSec);
        }
    }

    function renderTextWithTimestamps(content: string) {
        const regex = /\b(?:\d{1,2}:)?\d{1,2}:\d{2}(?:\s*[\-–—]\s*(?:\d{1,2}:)?\d{1,2}:\d{2})?\b/g;
        const elements: (string | React.ReactNode)[] = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(content)) !== null) {
            if (match.index > lastIndex) {
                elements.push(content.substring(lastIndex, match.index));
            }
            const tsMatch = match[0];
            elements.push(
                <Chip
                    key={`${match.index}-${tsMatch}`}
                    icon={<PlayArrowRoundedIcon sx={{ fontSize: "14px !important", color: "#38bdf8" }} />}
                    label={tsMatch}
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleTimestampClick(tsMatch);
                    }}
                    sx={{
                        bgcolor: "rgba(56, 189, 248, 0.15)",
                        color: "#38bdf8",
                        border: "1px solid rgba(56, 189, 248, 0.35)",
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        verticalAlign: "middle",
                        mx: 0.5,
                        my: 0.25,
                        transition: "all 0.2s ease",
                        "&:hover": {
                            bgcolor: "rgba(56, 189, 248, 0.28)",
                            borderColor: "#38bdf8",
                            transform: "translateY(-1px)",
                            boxShadow: "0 2px 8px rgba(56, 189, 248, 0.25)"
                        }
                    }}
                />
            );
            lastIndex = regex.lastIndex;
        }

        if (lastIndex < content.length) {
            elements.push(content.substring(lastIndex));
        }

        return elements.length > 0 ? elements : content;
    }

    const renderMarkdownComponents = {
        code: ({ children, ...props }: any) => {
            const str = String(children).trim();
            if (/^(?:\d{1,2}:)?\d{1,2}:\d{2}(?:\s*[\-–—]\s*(?:\d{1,2}:)?\d{1,2}:\d{2})?$/.test(str)) {
                return (
                    <Chip
                        icon={<PlayArrowRoundedIcon sx={{ fontSize: "14px !important", color: "#38bdf8" }} />}
                        label={str}
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleTimestampClick(str);
                        }}
                        sx={{
                            bgcolor: "rgba(56, 189, 248, 0.15)",
                            color: "#38bdf8",
                            border: "1px solid rgba(56, 189, 248, 0.35)",
                            fontWeight: 700,
                            fontSize: "0.82rem",
                            cursor: "pointer",
                            verticalAlign: "middle",
                            mx: 0.5,
                            my: 0.25,
                            transition: "all 0.2s ease",
                            "&:hover": {
                                bgcolor: "rgba(56, 189, 248, 0.28)",
                                borderColor: "#38bdf8",
                                transform: "translateY(-1px)",
                                boxShadow: "0 2px 8px rgba(56, 189, 248, 0.25)"
                            }
                        }}
                    />
                );
            }
            return (
                <Box
                    component="code"
                    sx={{
                        bgcolor: "rgba(255, 255, 255, 0.08)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        px: 1,
                        py: 0.3,
                        borderRadius: 1,
                        fontSize: "0.85rem",
                        fontFamily: "monospace",
                        color: "#38bdf8"
                    }}
                    {...props}
                >
                    {children}
                </Box>
            );
        },
        p: ({ children }: any) => {
            const processChild = (child: any): any => {
                if (typeof child === "string") {
                    return renderTextWithTimestamps(child);
                }
                return child;
            };

            const processedChildren = Array.isArray(children)
                ? children.map((c, i) => <React.Fragment key={i}>{processChild(c)}</React.Fragment>)
                : processChild(children);

            return <p>{processedChildren}</p>;
        },
        li: ({ children }: any) => {
            const processChild = (child: any): any => {
                if (typeof child === "string") {
                    return renderTextWithTimestamps(child);
                }
                return child;
            };

            const processedChildren = Array.isArray(children)
                ? children.map((c, i) => <React.Fragment key={i}>{processChild(c)}</React.Fragment>)
                : processChild(children);

            return <li>{processedChildren}</li>;
        }
    };

    if (isUser) {
        return (
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    mb: 2
                }}
            >
                <Paper
                    elevation={0}
                    sx={{
                        py: 1.4,
                        px: 2.6,
                        borderRadius: "20px",
                        bgcolor: "rgba(255, 255, 255, 0.14)",
                        color: "#F8FAFC",
                        maxWidth: "85%",
                        fontSize: "1rem",
                        fontWeight: 500,
                        lineHeight: 1.55,
                        wordBreak: "break-word"
                    }}
                >
                    {text}
                </Paper>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
                mb: 3
            }}
        >
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Box
                    sx={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        bgcolor: isError ? "rgba(239, 68, 68, 0.15)" : "rgba(20, 184, 166, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        mt: 0.5
                    }}
                >
                    <AutoAwesomeRoundedIcon sx={{ color: isError ? "#f87171" : "#38bdf8", fontSize: 19 }} />
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.2,
                            borderRadius: "16px",
                            bgcolor: isError ? "rgba(239, 68, 68, 0.08)" : "rgba(15, 23, 42, 0.6)",
                            border: isError ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(255, 255, 255, 0.08)",
                            color: "#F8FAFC",
                            "& p": { my: 0.7, lineHeight: 1.65, fontSize: "1rem" },
                            "& p:first-of-type": { mt: 0 },
                            "& p:last-of-type": { mb: 0 },
                            "& h1, & h2, & h3, & h4": { color: "#38bdf8", fontWeight: 700, mt: 1.5, mb: 0.8, fontSize: "1.1rem" },
                            "& ul, & ol": { pl: 2.5, my: 0.8, fontSize: "1rem" },
                            "& li": { mb: 0.4, lineHeight: 1.6, fontSize: "1rem" },
                            "& strong": { color: "#38bdf8", fontWeight: 700 }
                        }}
                    >
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={renderMarkdownComponents}
                        >
                            {text}
                        </ReactMarkdown>
                    </Paper>

                    {/* Action Row */}
                    {isError ? (
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1, px: 0.5 }}>
                            {onRegenerate && (
                                <Button
                                    size="small"
                                    onClick={onRegenerate}
                                    startIcon={<RefreshRoundedIcon fontSize="small" />}
                                    sx={{
                                        color: "#f87171",
                                        bgcolor: "rgba(239, 68, 68, 0.12)",
                                        border: "1px solid rgba(239, 68, 68, 0.3)",
                                        borderRadius: 2,
                                        px: 1.5,
                                        py: 0.4,
                                        fontSize: "0.75rem",
                                        textTransform: "none",
                                        fontWeight: 600,
                                        "&:hover": {
                                            bgcolor: "rgba(239, 68, 68, 0.22)",
                                            borderColor: "#ef4444"
                                        }
                                    }}
                                >
                                    Retry Request
                                </Button>
                            )}
                        </Stack>
                    ) : (
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1, px: 0.5, flexWrap: "wrap", gap: 0.5 }}>
                            <Stack direction="row" spacing={0.4} alignItems="center">
                                <Tooltip title="Helpful">
                                    <IconButton
                                        size="small"
                                        onClick={() => { setLiked(!liked); if (disliked) setDisliked(false); }}
                                        aria-label="Mark response as helpful"
                                        sx={{
                                            color: liked ? "#10b981" : "#94a3b8",
                                            p: 0.6,
                                            borderRadius: 1.5,
                                            transition: "all 0.15s ease",
                                            "&:hover": { color: "#10b981", bgcolor: "rgba(16, 185, 129, 0.12)" },
                                            "&:focus-visible": { outline: "2px solid #38bdf8" }
                                        }}
                                    >
                                        {liked ? <ThumbUpAltIcon fontSize="small" /> : <ThumbUpOutlinedIcon fontSize="small" />}
                                    </IconButton>
                                </Tooltip>

                                <Tooltip title="Not helpful">
                                    <IconButton
                                        size="small"
                                        onClick={() => { setDisliked(!disliked); if (liked) setLiked(false); }}
                                        aria-label="Mark response as not helpful"
                                        sx={{
                                            color: disliked ? "#ef4444" : "#94a3b8",
                                            p: 0.6,
                                            borderRadius: 1.5,
                                            transition: "all 0.15s ease",
                                            "&:hover": { color: "#ef4444", bgcolor: "rgba(239, 68, 68, 0.12)" },
                                            "&:focus-visible": { outline: "2px solid #38bdf8" }
                                        }}
                                    >
                                        {disliked ? <ThumbDownAltIcon fontSize="small" /> : <ThumbDownOutlinedIcon fontSize="small" />}
                                    </IconButton>
                                </Tooltip>

                                <Tooltip title={copied ? "Copied!" : "Copy text"}>
                                    <IconButton
                                        size="small"
                                        onClick={handleCopy}
                                        aria-label="Copy answer text"
                                        sx={{
                                            color: copied ? "#38bdf8" : "#94a3b8",
                                            p: 0.6,
                                            borderRadius: 1.5,
                                            transition: "all 0.15s ease",
                                            "&:hover": { color: "#38bdf8", bgcolor: "rgba(56, 189, 248, 0.12)" },
                                            "&:focus-visible": { outline: "2px solid #38bdf8" }
                                        }}
                                    >
                                        {copied ? <CheckRoundedIcon fontSize="small" /> : <ContentCopyRoundedIcon fontSize="small" />}
                                    </IconButton>
                                </Tooltip>

                                {onListen && (
                                    <Tooltip title={isSpeaking ? "Stop speaking" : "Listen to answer"}>
                                        <IconButton
                                            size="small"
                                            onClick={onListen}
                                            aria-label={isSpeaking ? "Stop text to speech" : "Listen to answer audio"}
                                            sx={{
                                                color: isSpeaking ? "#f87171" : "#94a3b8",
                                                p: 0.6,
                                                borderRadius: 1.5,
                                                transition: "all 0.15s ease",
                                                "&:hover": { color: "#38bdf8", bgcolor: "rgba(56, 189, 248, 0.12)" },
                                                "&:focus-visible": { outline: "2px solid #38bdf8" }
                                            }}
                                        >
                                            {isSpeaking ? <StopRoundedIcon fontSize="small" /> : <VolumeUpRoundedIcon fontSize="small" />}
                                        </IconButton>
                                    </Tooltip>
                                )}

                                {onRegenerate && (
                                    <Tooltip title="Regenerate answer">
                                        <IconButton
                                            size="small"
                                            onClick={onRegenerate}
                                            aria-label="Regenerate response"
                                            sx={{
                                                color: "#94a3b8",
                                                p: 0.6,
                                                borderRadius: 1.5,
                                                transition: "all 0.15s ease",
                                                "&:hover": { color: "#38bdf8", bgcolor: "rgba(56, 189, 248, 0.12)" },
                                                "&:focus-visible": { outline: "2px solid #38bdf8" }
                                            }}
                                        >
                                            <ReplayRoundedIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                )}

                                {onFollowUp && (
                                    <Tooltip title="Ask follow-up question">
                                        <IconButton
                                            size="small"
                                            onClick={onFollowUp}
                                            aria-label="Ask follow-up question"
                                            sx={{
                                                color: "#94a3b8",
                                                p: 0.6,
                                                borderRadius: 1.5,
                                                transition: "all 0.15s ease",
                                                "&:hover": { color: "#38bdf8", bgcolor: "rgba(56, 189, 248, 0.12)" },
                                                "&:focus-visible": { outline: "2px solid #38bdf8" }
                                            }}
                                        >
                                            <ChatBubbleOutlineRoundedIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </Stack>

                            <Typography sx={{ color: "#64748B", fontSize: "0.68rem" }}>
                                AI can make mistakes, so double-check it.
                            </Typography>
                        </Stack>
                    )}
                </Box>
            </Stack>
        </Box>
    );
}