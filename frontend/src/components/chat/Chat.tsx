import { useEffect, useRef, useState } from "react";
import {
    Box,
    Button,
    Divider,
    TextField,
    Typography
} from "@mui/material";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useChat } from "../../context/ChatContext";
import { askAI } from "../../services/chatService";

import TypingIndicator from "./TypingIndicator";
import Message from "./Message";
import SourceCard from "../video/SourceCard";

export default function Chat() {
    const {
        messages,
        setMessages,
        conversationId,
        setConversationId
    } = useChat();

    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    // Scrollable messages container
    const messagesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!messagesRef.current) {
            return;
        }

        messagesRef.current.scrollTo({
            top: messagesRef.current.scrollHeight,
            behavior: "smooth"
        });
    }, [messages, loading]);

    async function send() {
        if (!input.trim() || loading) {
            return;
        }

        const question = input;
        setInput("");

        setMessages(prev => [
            ...prev,
            {
                id: crypto.randomUUID(),
                role: "user",
                text: question
            }
        ]);

        setLoading(true);

        try {
            const result = await askAI(question, conversationId);

            if (result.conversation_id) {
                setConversationId(result.conversation_id);
            }

            setMessages(prev => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    text: result.answer,
                    sources: result.sources
                }
            ]);
        } catch {
            setMessages(prev => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    text: "Sorry, something went wrong while contacting the AI."
                }
            ]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {/* Header */}
            <Box sx={{ px: 3, py: 2.5 }}>
                <Typography
                    variant="h5"
                    sx={{
                        fontWeight: 700,
                        color: "#14b8a6"
                    }}
                >
                    🤖 AI Assistant
                </Typography>
            </Box>

            <Divider sx={{ borderColor: "rgba(255,255,255,.08)" }} />

            {/* Messages */}
            <Box
                ref={messagesRef}
                sx={{
                    flex: 1,
                    overflowY: "auto",
                    overflowX: "hidden",
                    px: 3,
                    py: 3,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,

                    "&::-webkit-scrollbar": {
                        width: "6px"
                    },
                    "&::-webkit-scrollbar-track": {
                        background: "transparent"
                    },
                    "&::-webkit-scrollbar-thumb": {
                        background: "rgba(20,184,166,.2)",
                        borderRadius: "10px"
                    },
                    "&::-webkit-scrollbar-thumb:hover": {
                        background: "rgba(20,184,166,.4)"
                    }
                }}
            >
                {messages.length === 0 && (
                    <Typography
                        sx={{
                            color: "rgba(255,255,255,.75)",
                            fontSize: 17,
                            lineHeight: 1.8
                        }}
                    >
                        👋 Upload a video and ask me anything!
                    </Typography>
                )}

                {messages.map(message => (
                    <Box key={message.id}>
                        <Message role={message.role}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {message.text}
                            </ReactMarkdown>
                        </Message>

                        {message.sources?.map((source: any, index: number) => (
                            <Box key={index} sx={{ mt: 1.5, ml: 7 }}>
                                <SourceCard
                                    videoId={source.video_id}
                                    start={source.start_time}
                                    end={source.end_time}
                                />
                            </Box>
                        ))}
                    </Box>
                ))}

                {loading && <TypingIndicator />}
            </Box>

            <Divider sx={{ borderColor: "rgba(255,255,255,.08)" }} />

            {/* Input */}
            <Box
                component="form"
                onSubmit={e => {
                    e.preventDefault();
                    send();
                }}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    px: 3,
                    py: 2.5
                }}
            >
                <TextField
                    fullWidth
                    placeholder="Ask anything about your uploaded videos..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            e.stopPropagation();
                            send();
                        }
                    }}
                    sx={{
                        "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                            color: "#f8fafc",
                            backgroundColor: "rgba(0,0,0,.2)",

                            "& fieldset": {
                                borderColor: "rgba(20,184,166,.3)"
                            },

                            "&:hover fieldset": {
                                borderColor: "rgba(20,184,166,.6)"
                            },

                            "&.Mui-focused fieldset": {
                                borderColor: "#14b8a6"
                            }
                        },

                        "& .MuiInputBase-input::placeholder": {
                            color: "rgba(255,255,255,.4)",
                            opacity: 1
                        }
                    }}
                />

                <Button
                    type="submit"
                    variant="contained"
                    sx={{
                        minWidth: 60,
                        height: 56,
                        borderRadius: 2,
                        background:
                            "linear-gradient(135deg, #14b8a6 0%, #10b981 100%)",
                        boxShadow: "0 4px 14px rgba(20,184,166,.3)",
                        transition: "all .3s ease",

                        "&:hover": {
                            transform: "translateY(-2px)",
                            boxShadow: "0 6px 20px rgba(20,184,166,.6)"
                        }
                    }}
                >
                    <SendRoundedIcon />
                </Button>
            </Box>
        </Box>
    );
}