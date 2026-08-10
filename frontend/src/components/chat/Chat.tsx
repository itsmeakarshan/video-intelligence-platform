import { useEffect, useRef, useState } from "react";

import {
    Box,
    Button,
    Divider,
    TextField,
    Typography
} from "@mui/material";

import SendRoundedIcon from "@mui/icons-material/SendRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";

import { useChat } from "../../context/ChatContext";
import { askAI } from "../../services/chatService";

import TypingIndicator from "./TypingIndicator";
import Message from "./Message";


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

    const [speakingMessageId, setSpeakingMessageId] =
        useState<string | null>(null);

    const messagesRef =
        useRef<HTMLDivElement>(null);


    // =========================================================
    // CLEAN UP SPEECH WHEN COMPONENT IS UNMOUNTED
    // =========================================================

    useEffect(() => {

        return () => {

            window.speechSynthesis.cancel();

        };

    }, []);


    // =========================================================
    // AUTO SCROLL
    // =========================================================

    useEffect(() => {

        if (!messagesRef.current) {
            return;
        }

        messagesRef.current.scrollTo({
            top: messagesRef.current.scrollHeight,
            behavior: "smooth"
        });

    }, [messages, loading]);


    // =========================================================
    // SPEAK AI ANSWER
    // =========================================================

    function speakAnswer(
        text: string,
        messageId: string
    ) {

        // Stop anything currently speaking.
        window.speechSynthesis.cancel();

        // If this message was already speaking,
        // clicking again simply stops it.
        if (
            speakingMessageId === messageId
        ) {

            setSpeakingMessageId(null);

            return;
        }

        if (
            !("speechSynthesis" in window)
        ) {

            return;
        }

        // Remove common Markdown formatting before speaking.
        const cleanText =
            text
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


        // =====================================================
        // NATURAL BRITISH FEMALE VOICE
        // =====================================================

        const voices =
            window.speechSynthesis.getVoices();

        /*
         * Prefer common British female voices.
         *
         * macOS commonly provides voices such as:
         * - Serena
         * - Karen
         * - Moira
         *
         * Different browsers/macOS versions may expose
         * different names, so we use several fallbacks.
         */

        const preferredVoiceNames = [
            "Serena",
            "Karen",
            "Moira",
            "Google UK English Female",
            "Microsoft Hazel",
            "Microsoft Sonia"
        ];

        let britishFemaleVoice =
            voices.find((voice) => {

                const name =
                    voice.name.toLowerCase();

                const language =
                    voice.lang.toLowerCase();

                const isBritish =
                    language === "en-gb" ||
                    language.startsWith("en-gb");

                const isPreferred =
                    preferredVoiceNames.some(
                        preferred =>
                            name.includes(
                                preferred.toLowerCase()
                            )
                    );

                return (
                    isBritish &&
                    isPreferred
                );

            });


        // If a preferred voice isn't available,
        // choose any British English voice.
        if (!britishFemaleVoice) {

            britishFemaleVoice =
                voices.find((voice) => {

                    const language =
                        voice.lang.toLowerCase();

                    return (
                        language === "en-gb" ||
                        language.startsWith("en-gb")
                    );

                });

        }


        // Final fallback to any English voice.
        if (!britishFemaleVoice) {

            britishFemaleVoice =
                voices.find((voice) => {

                    const language =
                        voice.lang.toLowerCase();

                    return language.startsWith(
                        "en"
                    );

                });

        }


        if (britishFemaleVoice) {

            utterance.voice =
                britishFemaleVoice;

        }


        // Natural conversational settings.
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;


        // =====================================================
        // SPEECH EVENTS
        // =====================================================

        utterance.onstart = () => {

            setSpeakingMessageId(
                messageId
            );

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


    // =========================================================
    // SEND MESSAGE
    // =========================================================

    async function send() {

        if (
            !input.trim() ||
            loading
        ) {

            return;
        }

        const question =
            input.trim();

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

            const result =
                await askAI(
                    question,
                    conversationId,
                    selectedVideos.length > 0
                        ? selectedVideos
                        : undefined
                );


            if (
                result.conversation_id
            ) {

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


    // =========================================================
    // UI
    // =========================================================

    return (

        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                height: "100%"
            }}
        >

            {/* =================================================
                HEADER
            ================================================= */}

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


            {/* =================================================
                MESSAGES
            ================================================= */}

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

                {/* Empty state */}

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


                {/* Messages */}

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


                        {/* =================================================
                            SPEAK ALOUD
                            Only displayed for AI messages
                        ================================================= */}

                        {message.role === "assistant" && (

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


                {/* Typing indicator */}

                {loading && (
                    <TypingIndicator />
                )}

            </Box>


            {/* =================================================
                INPUT DIVIDER
            ================================================= */}

            <Divider
                sx={{
                    borderColor:
                        "rgba(255,255,255,.08)"
                }}
            />


            {/* =================================================
                INPUT
            ================================================= */}

            <Box
                component="form"
                onSubmit={(e) => {

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
                    onChange={(e) =>
                        setInput(
                            e.target.value
                        )
                    }
                    onKeyDown={(e) => {

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

                            "& fieldset": {
                                borderColor:
                                    "rgba(20,184,166,.3)"
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


                <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                    sx={{
                        minWidth: 60,
                        height: 56,
                        borderRadius: 2,

                        background:
                            "linear-gradient(135deg,#14b8a6,#10b981)",

                        "&:hover": {
                            transform:
                                "translateY(-2px)"
                        }
                    }}
                >

                    <SendRoundedIcon />

                </Button>

            </Box>

        </Box>
    );
}