import { useEffect, useRef, useState } from "react";
import {
    Box,
    Divider,
    IconButton,
    InputBase,
    Stack,
    Tooltip,
    Typography
} from "@mui/material";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import MicRoundedIcon from "@mui/icons-material/MicRounded";
import MicOffRoundedIcon from "@mui/icons-material/MicOffRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";

import { useChat } from "../../context/ChatContext";
import { askAI } from "../../services/chatService";
import TypingIndicator from "./TypingIndicator";
import Message from "./Message";
import { generateUUID } from "../../utils/uuid";


interface SpeechRecognitionEventLike extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionErrorEventLike extends Event {
    error: string;
}

interface SpeechRecognitionInstance {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: () => void;
    stop: () => void;
    abort: () => void;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
}

interface SpeechRecognitionConstructor {
    new(): SpeechRecognitionInstance;
}

interface SpeechRecognitionWindow extends Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export default function Chat() {
    const {
        messages,
        setMessages,
        conversationId,
        setConversationId,
        selectedVideos
    } = useChat();

    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [listening, setListening] = useState(false);
    const [interimText, setInterimText] = useState("");
    const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);
    const messagesRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sessionRef = useRef(0);
    const speechTextRef = useRef("");
    const interimTextRef = useRef("");

    const sendRef = useRef<((explicitText?: string) => Promise<void>) | null>(null);

    function clearSilenceTimer() {
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
    }

    function stopListening() {
        clearSilenceTimer();

        const recognition = recognitionRef.current;

        if (recognition) {
            try {
                recognition.stop();
            } catch {
                // Recognition may already be stopped.
            }
        }

        setListening(false);
    }

    useEffect(() => {
        return () => {
            clearSilenceTimer();
            window.speechSynthesis.cancel();

            if (recognitionRef.current) {
                try {
                    recognitionRef.current.abort();
                } catch {
                    // Ignore cleanup errors.
                }
            }
        };
    }, []);

    useEffect(() => {
        if (!messagesRef.current) return;

        messagesRef.current.scrollTo({
            top: messagesRef.current.scrollHeight,
            behavior: "smooth"
        });
    }, [messages, loading]);

    useEffect(() => {
        sendRef.current = send;
    });

    function handleFollowUp() {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }

    async function handleRegenerate(messageId: string) {
        const index = messages.findIndex(m => m.id === messageId);
        if (index < 0) return;

        let userPrompt = "";
        if (index > 0 && messages[index - 1].role === "user") {
            userPrompt = messages[index - 1].text;
        } else {
            const lastUser = [...messages].reverse().find(m => m.role === "user");
            if (lastUser) userPrompt = lastUser.text;
        }

        if (userPrompt) {
            await send(userPrompt);
        }
    }

    function startListening() {
        const speechWindow = window as SpeechRecognitionWindow;

        const SpeechRecognition =
            speechWindow.SpeechRecognition ||
            speechWindow.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert(
                "Speech recognition is not supported in this browser. Please use Google Chrome."
            );
            return;
        }

        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch {
                // Ignore.
            }
        }

        clearSilenceTimer();

        const sessionId = ++sessionRef.current;

        speechTextRef.current = "";
        interimTextRef.current = "";

        setInterimText("");
        setListening(true);

        const recognition = new SpeechRecognition();

        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = typeof navigator !== "undefined" ? (navigator.language || "en-US") : "en-US";

        recognition.onstart = () => {
            if (sessionRef.current !== sessionId) return;
            setListening(true);
        };

        recognition.onresult = (event: SpeechRecognitionEventLike) => {
            if (sessionRef.current !== sessionId) return;

            let transcript = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }

            const trimmed = transcript.trim();
            if (trimmed) {
                speechTextRef.current = trimmed;
                setInput(trimmed);
                setInterimText(trimmed);
            }

            clearSilenceTimer();
            silenceTimerRef.current = setTimeout(() => {
                if (sessionRef.current !== sessionId) return;
                const finalQuestion = speechTextRef.current.trim();
                if (finalQuestion && sendRef.current) {
                    stopListening();
                    sendRef.current(finalQuestion);
                }
            }, 1500);
        };

        recognition.onerror = (err: SpeechRecognitionErrorEventLike) => {
            if (sessionRef.current !== sessionId) return;
            console.warn("Speech recognition error:", err.error);
            setListening(false);
        };

        recognition.onend = () => {
            if (sessionRef.current !== sessionId) return;
            setListening(false);
            const finalQuestion = speechTextRef.current.trim();
            if (finalQuestion && sendRef.current) {
                sendRef.current(finalQuestion);
            }
        };

        recognitionRef.current = recognition;

        try {
            recognition.start();
        } catch (e) {
            console.error("Failed to start speech recognition", e);
            setListening(false);
        }
    }

    function toggleMicrophone() {
        if (listening) {
            stopListening();
            const textToSend = (speechTextRef.current || input).trim();
            if (textToSend && sendRef.current) {
                sendRef.current(textToSend);
            }
        } else {
            startListening();
        }
    }

    function speakAnswer(text: string, messageId: string) {
        if (!window.speechSynthesis) {
            alert("Text-to-speech is not supported in this browser.");
            return;
        }

        if (speakingMessageId === messageId) {
            window.speechSynthesis.cancel();
            setSpeakingMessageId(null);
            return;
        }

        window.speechSynthesis.cancel();

        const cleanText = text
            .replace(/\[\d{1,2}:\d{2}(?:\s*[\-–—]\s*\d{1,2}:\d{2})?\]/g, "")
            .replace(/[*#_`]/g, "");

        const utterance = new SpeechSynthesisUtterance(cleanText);

        const voices = window.speechSynthesis.getVoices();
        const voice =
            voices.find(v => v.lang.startsWith("en-GB") && v.name.includes("Natural")) ||
            voices.find(v => v.lang.startsWith("en")) ||
            voices[0];

        if (voice) {
            utterance.voice = voice;
        }

        utterance.rate = 0.95;
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onstart = () => { setSpeakingMessageId(messageId); };
        utterance.onend = () => { setSpeakingMessageId(null); };
        utterance.onerror = () => { setSpeakingMessageId(null); };

        window.speechSynthesis.speak(utterance);
    }

    async function send(explicitText?: string) {
        const question = (explicitText !== undefined ? explicitText : input).trim();

        if (!question || loading) return;

        if (listening && explicitText === undefined) {
            stopListening();
        }

        setInput("");
        setInterimText("");

        setMessages(prev => [
            ...prev,
            {
                id: generateUUID(),
                role: "user",
                text: question
            }
        ]);

        setLoading(true);

        try {
            const result = await askAI(
                question,
                conversationId,
                selectedVideos.length > 0 ? selectedVideos : undefined
            );

            if (result.conversation_id) {
                setConversationId(result.conversation_id);
            }

            setMessages(prev => [
                ...prev,
                {
                    id: generateUUID(),
                    role: "assistant",
                    text: result.answer,
                    sources: result.sources ?? [],
                    isError: false
                }
            ]);
        } catch (error: any) {
            setMessages(prev => [
                ...prev,
                {
                    id: generateUUID(),
                    role: "assistant",
                    text: error?.message ?? "Unable to contact the AI.",
                    sources: [],
                    isError: true
                }
            ]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                maxHeight: "100%",
                overflow: "hidden"
            }}
        >
            {/* 1. YOUTUBE AI CHAT HEADER */}
            <Box
                sx={{
                    px: 2.5,
                    py: 1.8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid rgba(255,255,255,0.08)"
                }}
            >
                <Stack direction="row" alignItems="center" spacing={1.2}>
                    <AutoAwesomeRoundedIcon sx={{ color: "#38bdf8", fontSize: 20 }} />
                    <Typography sx={{ color: "#F8FAFC", fontWeight: 700, fontSize: 16 }}>
                        Ask about this video
                    </Typography>
                </Stack>
            </Box>

            {/* 3. SCROLLABLE MESSAGES STREAM */}
            <Box
                ref={messagesRef}
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    px: 2.5,
                    py: 2,
                    display: "flex",
                    flexDirection: "column",
                    "&::-webkit-scrollbar": {
                        width: "6px"
                    },
                    "&::-webkit-scrollbar-track": {
                        background: "transparent"
                    },
                    "&::-webkit-scrollbar-thumb": {
                        background: "rgba(255, 255, 255, 0.15)",
                        borderRadius: "10px"
                    },
                    "&::-webkit-scrollbar-thumb:hover": {
                        background: "rgba(255, 255, 255, 0.3)"
                    }
                }}
            >
                {messages.length === 0 && (
                    <Box sx={{ textAlign: "center", py: 4, px: 2 }}>
                        <AutoAwesomeRoundedIcon sx={{ color: "#38bdf8", fontSize: 32, mb: 1 }} />
                        <Typography sx={{ color: "#F8FAFC", fontWeight: 700, fontSize: 16, mb: 0.5 }}>
                            What would you like to know?
                        </Typography>
                        <Typography sx={{ color: "#94A3B8", fontSize: 13, maxWidth: 280, mx: "auto" }}>
                            Ask questions, request summaries, or pick a suggestion pill above.
                        </Typography>
                    </Box>
                )}

                {messages.map(message => (
                    <Box key={message.id} sx={{ display: "flex", flexDirection: "column" }}>
                        <Message
                            id={message.id}
                            role={message.role}
                            text={message.text}
                            sources={message.sources}
                            isError={message.isError}
                            onRegenerate={message.role === "assistant" ? () => handleRegenerate(message.id) : undefined}
                            onListen={message.role === "assistant" ? () => speakAnswer(message.text, message.id) : undefined}
                            isSpeaking={speakingMessageId === message.id}
                            onFollowUp={message.role === "assistant" ? handleFollowUp : undefined}
                        />
                    </Box>
                ))}

                {loading && <TypingIndicator />}
            </Box>

            <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

            {/* 4. PINNED BOTTOM INPUT BAR (YOUTUBE AI STYLE) */}
            <Box
                component="form"
                onSubmit={e => {
                    e.preventDefault();
                    send();
                }}
                sx={{
                    px: 2,
                    py: 1.8,
                    bgcolor: "rgba(15, 23, 42, 0.95)",
                    borderTop: "1px solid rgba(255,255,255,0.06)"
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        bgcolor: "rgba(255, 255, 255, 0.08)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: "28px",
                        px: 2,
                        py: 0.5,
                        transition: "all 0.2s ease",
                        "&:focus-within": {
                            borderColor: "#38bdf8",
                            bgcolor: "rgba(255, 255, 255, 0.12)",
                            boxShadow: "0 0 12px rgba(56, 189, 248, 0.2)"
                        }
                    }}
                >
                    <InputBase
                        inputRef={inputRef}
                        fullWidth
                        placeholder={listening ? "Listening..." : "Ask a question..."}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                send();
                            }
                        }}
                        disabled={loading}
                        sx={{
                            color: "#F8FAFC",
                            fontSize: "0.9rem",
                            py: 0.6,
                            "& input::placeholder": {
                                color: "#94A3B8",
                                opacity: 1
                            }
                        }}
                    />

                    <Stack direction="row" spacing={0.5} alignItems="center">
                        <Tooltip title={listening ? "Stop listening" : "Voice input"}>
                            <IconButton
                                type="button"
                                size="small"
                                onClick={toggleMicrophone}
                                disabled={loading}
                                sx={{
                                    color: listening ? "#ef4444" : "#94a3b8",
                                    "&:hover": { color: "#38bdf8" }
                                }}
                            >
                                {listening ? <MicOffRoundedIcon fontSize="small" /> : <MicRoundedIcon fontSize="small" />}
                            </IconButton>
                        </Tooltip>

                        <IconButton
                            type="submit"
                            size="small"
                            disabled={loading || !input.trim()}
                            sx={{
                                color: !input.trim() || loading ? "rgba(255,255,255,0.2)" : "#38bdf8",
                                bgcolor: !input.trim() || loading ? "transparent" : "rgba(56, 189, 248, 0.15)",
                                p: 0.8,
                                "&:hover": {
                                    bgcolor: "rgba(56, 189, 248, 0.28)",
                                    color: "#38bdf8"
                                }
                            }}
                        >
                            <SendRoundedIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                </Box>

                {listening && interimText && (
                    <Typography sx={{ color: "#38bdf8", fontSize: "0.72rem", mt: 0.5, px: 1 }}>
                        {interimText}
                    </Typography>
                )}

                <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={0.5} sx={{ mt: 0.8, px: 1 }}>
                    <Typography sx={{ color: "#64748B", fontSize: "0.72rem" }}>
                        Ask
                    </Typography>
                    <AutoAwesomeRoundedIcon sx={{ color: "#38bdf8", fontSize: 13 }} />
                    <Typography sx={{ color: "#38bdf8", fontSize: "0.72rem", fontWeight: 700 }}>
                        Gemini
                    </Typography>
                </Stack>
            </Box>
        </Box>
    );
}