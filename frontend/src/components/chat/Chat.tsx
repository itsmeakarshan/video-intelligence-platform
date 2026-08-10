import { useEffect, useRef, useState } from "react";
import {
    Box,
    Button,
    Divider,
    IconButton,
    TextField,
    Tooltip,
    Typography
} from "@mui/material";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import MicRoundedIcon from "@mui/icons-material/MicRounded";
import MicOffRoundedIcon from "@mui/icons-material/MicOffRounded";

import { useChat } from "../../context/ChatContext";
import { askAI } from "../../services/chatService";
import TypingIndicator from "./TypingIndicator";
import Message from "./Message";

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
    new (): SpeechRecognitionInstance;
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

    const messagesRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sessionRef = useRef(0);
    const speechTextRef = useRef("");
    const interimTextRef = useRef("");
    
    // Create a ref to always hold the latest version of the send function
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

    // Keep the sendRef updated with the latest closure state
    useEffect(() => {
        sendRef.current = send;
    });

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

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-GB";

        recognition.onstart = () => {
            if (sessionRef.current !== sessionId) return;
            setListening(true);
        };

        recognition.onresult = (
            event: SpeechRecognitionEventLike
        ) => {
            if (sessionRef.current !== sessionId) {
                return;
            }

            let newFinalText = "";
            let newInterimText = "";

            for (
                let i = event.resultIndex;
                i < event.results.length;
                i++
            ) {
                const result = event.results[i];
                const text = result[0]?.transcript?.trim() ?? "";

                if (!text) {
                    continue;
                }

                if (result.isFinal) {
                    newFinalText += ` ${text}`;
                } else {
                    newInterimText += ` ${text}`;
                }
            }

            if (newFinalText.trim()) {
                speechTextRef.current =
                    `${speechTextRef.current} ${newFinalText}`
                        .replace(/\s+/g, " ")
                        .trim();
            }

            interimTextRef.current =
                newInterimText
                    .replace(/\s+/g, " ")
                    .trim();

            setInterimText(interimTextRef.current);

            const combinedText =
                `${speechTextRef.current} ${interimTextRef.current}`
                    .replace(/\s+/g, " ")
                    .trim();

            if (combinedText) {
                setInput(combinedText);
            }

            clearSilenceTimer();

            // When user stops speaking for 1.5s, trigger stop which fires onend
            silenceTimerRef.current = setTimeout(() => {
                stopListening();
            }, 1500);
        };

        recognition.onerror = (
            event: SpeechRecognitionErrorEventLike
        ) => {
            console.error(
                "Speech recognition error:",
                event.error
            );

            clearSilenceTimer();

            const completeText =
                `${speechTextRef.current} ${interimTextRef.current}`
                    .replace(/\s+/g, " ")
                    .trim();

            speechTextRef.current = "";
            interimTextRef.current = "";

            setInterimText("");
            setListening(false);
            recognitionRef.current = null;

            // If an error happens but we captured text, send it
            if (completeText && sendRef.current) {
                sendRef.current(completeText);
            }
        };

        recognition.onend = () => {
            if (sessionRef.current !== sessionId) {
                return;
            }

            clearSilenceTimer();

            const finalText =
                speechTextRef.current.trim();

            const remainingInterim =
                interimTextRef.current.trim();

            const completeText =
                `${finalText} ${remainingInterim}`
                    .replace(/\s+/g, " ")
                    .trim();

            speechTextRef.current = "";
            interimTextRef.current = "";

            setInterimText("");
            setListening(false);
            recognitionRef.current = null;

            // Trigger the auto-send once recognition fully stops
            if (completeText && sendRef.current) {
                sendRef.current(completeText);
            }
        };

        recognitionRef.current = recognition;

        try {
            recognition.start();
        } catch (error) {
            console.error(
                "Unable to start speech recognition:",
                error
            );

            recognitionRef.current = null;
            setListening(false);
        }
    }

    function toggleMicrophone() {
        if (listening) {
            stopListening();
        } else {
            startListening();
        }
    }

    function speakAnswer(
        text: string,
        messageId: string
    ) {
        window.speechSynthesis.cancel();

        if (speakingMessageId === messageId) {
            setSpeakingMessageId(null);
            return;
        }

        if (!("speechSynthesis" in window)) {
            return;
        }

        const cleanText = text
            .replace(/[*_`#]/g, "")
            .replace(
                /\[([^\]]+)\]\([^)]+\)/g,
                "$1"
            )
            .replace(
                /^\s*[-•]\s*/gm,
                ""
            )
            .trim();

        if (!cleanText) {
            return;
        }

        const utterance =
            new SpeechSynthesisUtterance(
                cleanText
            );

        const voices =
            window.speechSynthesis.getVoices();

        const preferredVoiceNames = [
            "Serena",
            "Karen",
            "Moira",
            "Google UK English Female",
            "Microsoft Hazel",
            "Microsoft Sonia"
        ];

        let voice = voices.find(voice => {
            const name =
                voice.name.toLowerCase();

            const language =
                voice.lang.toLowerCase();

            const british =
                language === "en-gb" ||
                language.startsWith("en-gb");

            const preferred =
                preferredVoiceNames.some(
                    namePart =>
                        name.includes(
                            namePart.toLowerCase()
                        )
                );

            return british && preferred;
        });

        if (!voice) {
            voice = voices.find(voice =>
                voice.lang
                    .toLowerCase()
                    .startsWith("en-gb")
            );
        }

        if (!voice) {
            voice = voices.find(voice =>
                voice.lang
                    .toLowerCase()
                    .startsWith("en")
            );
        }

        if (voice) {
            utterance.voice = voice;
        }

        utterance.rate = 0.95;
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onstart = () => {
            setSpeakingMessageId(messageId);
        };

        utterance.onend = () => {
            setSpeakingMessageId(null);
        };

        utterance.onerror = () => {
            setSpeakingMessageId(null);
        };

        window.speechSynthesis.speak(
            utterance
        );
    }

    // Allow sending explicit text (from speech recognition) or falling back to the text input
    async function send(explicitText?: string) {
        const question = (explicitText !== undefined ? explicitText : input).trim();
        
        if (!question || loading) {
            return;
        }

        // Only turn off the microphone if the user clicked the manual send button while it was on
        if (listening && explicitText === undefined) {
            stopListening();
        }

        setInput("");
        setInterimText("");

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
            const result =
                await askAI(
                    question,
                    conversationId,
                    selectedVideos.length > 0
                        ? selectedVideos
                        : undefined
                );

            if (result.conversation_id) {
                setConversationId(
                    result.conversation_id
                );
            }

            setMessages(prev => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    text: result.answer,
                    sources:
                        result.sources ?? []
                }
            ]);
        } catch (error: any) {
            setMessages(prev => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    text:
                        error?.message ??
                        "Unable to contact the AI.",
                    sources: []
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
                height: "100%"
            }}
        >
            <Box
                sx={{
                    px: 3,
                    py: 2.5
                }}
            >
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

            <Divider
                sx={{
                    borderColor:
                        "rgba(255,255,255,.08)"
                }}
            />

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
                        background:
                            "rgba(20,184,166,.2)",
                        borderRadius: "10px"
                    }
                }}
            >
                {messages.length === 0 && (
                    <Typography
                        sx={{
                            color:
                                "rgba(255,255,255,.75)",
                            fontSize: 17,
                            lineHeight: 1.8
                        }}
                    >
                        👋 Upload a video and ask me anything!
                    </Typography>
                )}

                {messages.map(message => (
                    <Box
                        key={message.id}
                        sx={{
                            display: "flex",
                            flexDirection: "column"
                        }}
                    >
                        <Message
                            role={message.role}
                            text={message.text}
                            sources={message.sources}
                        />

                        {message.role ===
                            "assistant" && (
                            <Box
                                sx={{
                                    mt: 0.75,
                                    ml: {
                                        xs: 0,
                                        sm: 6
                                    }
                                }}
                            >
                                <Button
                                    size="small"
                                    onClick={() =>
                                        speakAnswer(
                                            message.text,
                                            message.id
                                        )
                                    }
                                    startIcon={
                                        speakingMessageId ===
                                        message.id
                                            ? (
                                                <StopRoundedIcon
                                                    fontSize="small"
                                                />
                                            )
                                            : (
                                                <VolumeUpRoundedIcon
                                                    fontSize="small"
                                                />
                                            )
                                    }
                                    sx={{
                                        color:
                                            speakingMessageId ===
                                            message.id
                                                ? "#f87171"
                                                : "#14b8a6",
                                        border:
                                            "1px solid rgba(20,184,166,.25)",
                                        borderRadius: 2,
                                        px: 1.5,
                                        py: 0.5,
                                        textTransform:
                                            "none",
                                        fontSize:
                                            "0.78rem",
                                        fontWeight: 600,
                                        background:
                                            "rgba(20,184,166,.05)",
                                        "&:hover": {
                                            background:
                                                "rgba(20,184,166,.12)",
                                            borderColor:
                                                "rgba(20,184,166,.45)"
                                        }
                                    }}
                                >
                                    {speakingMessageId ===
                                    message.id
                                        ? "Stop Speaking"
                                        : "Speak Aloud"}
                                </Button>
                            </Box>
                        )}
                    </Box>
                ))}

                {loading && (
                    <TypingIndicator />
                )}
            </Box>

            <Divider
                sx={{
                    borderColor:
                        "rgba(255,255,255,.08)"
                }}
            />

            <Box
                component="form"
                onSubmit={e => {
                    e.preventDefault();
                    send();
                }}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: 3,
                    py: 2.5
                }}
            >
                <Box
                    sx={{
                        position: "relative",
                        flex: 1
                    }}
                >
                    <TextField
                        fullWidth
                        placeholder={
                            listening
                                ? "Listening..."
                                : "Ask anything..."
                        }
                        value={input}
                        onChange={e =>
                            setInput(
                                e.target.value
                            )
                        }
                        onKeyDown={e => {
                            if (
                                e.key === "Enter" &&
                                !e.shiftKey
                            ) {
                                e.preventDefault();
                                send();
                            }
                        }}
                        disabled={loading}
                        sx={{
                            "& .MuiOutlinedInput-root": {
                                borderRadius: 2,
                                color: "#f8fafc",
                                backgroundColor:
                                    "rgba(0,0,0,.2)",
                                pr:
                                    listening
                                        ? 7
                                        : 2,
                                "& fieldset": {
                                    borderColor:
                                        listening
                                            ? "rgba(20,184,166,.65)"
                                            : "rgba(20,184,166,.3)"
                                },
                                "&:hover fieldset": {
                                    borderColor:
                                        "rgba(20,184,166,.6)"
                                },
                                "&.Mui-focused fieldset": {
                                    borderColor:
                                        "#14b8a6"
                                }
                            },
                            "& .MuiInputBase-input::placeholder": {
                                color:
                                    "rgba(255,255,255,.4)",
                                opacity: 1
                            }
                        }}
                    />

                    {listening && (
                        <Box
                            sx={{
                                position:
                                    "absolute",
                                right: 14,
                                top: "50%",
                                transform:
                                    "translateY(-50%)",
                                display: "flex",
                                alignItems:
                                    "center",
                                gap: 0.35,
                                height: 30,
                                pointerEvents:
                                    "none"
                            }}
                        >
                            {[0, 1, 2, 3, 4].map(
                                index => (
                                    <Box
                                        key={index}
                                        sx={{
                                            width: 3,
                                            height:
                                                index % 2 ===
                                                0
                                                    ? 18
                                                    : 11,
                                            borderRadius:
                                                3,
                                            background:
                                                "linear-gradient(180deg,#14b8a6,#10b981)",
                                            animation:
                                                "voiceWave 0.8s ease-in-out infinite",
                                            animationDelay:
                                                `${index * 0.12}s`,
                                            "@keyframes voiceWave":
                                                {
                                                    "0%, 100%":
                                                        {
                                                            transform:
                                                                "scaleY(.45)",
                                                            opacity:
                                                                0.45
                                                        },
                                                    "50%":
                                                        {
                                                            transform:
                                                                "scaleY(1.15)",
                                                            opacity:
                                                                1
                                                        }
                                                }
                                        }}
                                    />
                                )
                            )}
                        </Box>
                    )}

                    {listening &&
                        interimText && (
                            <Box
                                sx={{
                                    position:
                                        "absolute",
                                    left: 16,
                                    bottom: -25,
                                    color:
                                        "rgba(20,184,166,.7)",
                                    fontSize:
                                        "0.72rem",
                                    pointerEvents:
                                        "none",
                                    whiteSpace:
                                        "nowrap",
                                    overflow:
                                        "hidden",
                                    textOverflow:
                                        "ellipsis",
                                    maxWidth:
                                        "80%"
                                }}
                            >
                                {interimText}
                            </Box>
                        )}
                </Box>

                <Tooltip
                    title={
                        listening
                            ? "Stop listening"
                            : "Speak"
                    }
                >
                    <IconButton
                        type="button"
                        onClick={
                            toggleMicrophone
                        }
                        disabled={loading}
                        sx={{
                            width: 56,
                            height: 56,
                            flexShrink: 0,
                            borderRadius: 2,
                            color:
                                listening
                                    ? "#ffffff"
                                    : "#14b8a6",
                            background:
                                listening
                                    ? "linear-gradient(135deg,#ef4444,#f97316)"
                                    : "rgba(20,184,166,.08)",
                            border:
                                listening
                                    ? "1px solid rgba(255,255,255,.25)"
                                    : "1px solid rgba(20,184,166,.3)",
                            boxShadow:
                                listening
                                    ? "0 0 0 5px rgba(239,68,68,.08), 0 0 22px rgba(20,184,166,.25)"
                                    : "none",
                            animation:
                                listening
                                    ? "micPulse 1.5s ease-in-out infinite"
                                    : "none",
                            "@keyframes micPulse": {
                                "0%, 100%": {
                                    transform:
                                        "scale(1)"
                                },
                                "50%": {
                                    transform:
                                        "scale(1.06)"
                                }
                            },
                            "&:hover": {
                                background:
                                    listening
                                        ? "linear-gradient(135deg,#dc2626,#ea580c)"
                                        : "rgba(20,184,166,.15)"
                            }
                        }}
                    >
                        {listening
                            ? (
                                <MicOffRoundedIcon />
                            )
                            : (
                                <MicRoundedIcon />
                            )}
                    </IconButton>
                </Tooltip>

                <Button
                    type="submit"
                    variant="contained"
                    disabled={
                        loading ||
                        !input.trim()
                    }
                    sx={{
                        minWidth: 60,
                        height: 56,
                        borderRadius: 2,
                        background:
                            "linear-gradient(135deg,#14b8a6,#10b981)",
                        "&:hover": {
                            transform:
                                "translateY(-2px)"
                        },
                        "&.Mui-disabled": {
                            background:
                                "rgba(20,184,166,.25)"
                        }
                    }}
                >
                    <SendRoundedIcon />
                </Button>
            </Box>
        </Box>
    );
}