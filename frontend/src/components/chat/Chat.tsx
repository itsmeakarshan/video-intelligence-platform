import { useEffect, useRef, useState } from "react";
import { useChat } from "../../context/ChatContext";
import { askAI } from "../../services/chatService";
import Message from "./Message";
import ApiKeyModal from "./ApiKeyModal";
import { generateUUID } from "../../utils/uuid";
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  RotateCcw,
  Loader2,
  Key
} from "lucide-react";

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
    selectedVideos,
    courseId,
    isLoadingHistory,
    clearCurrentChat
  } = useChat();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechTextRef = useRef("");

  function clearSilenceTimer() {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }

  function stopListening() {
    clearSilenceTimer();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setListening(false);
  }

  useEffect(() => {
    return () => {
      clearSilenceTimer();
      window.speechSynthesis?.cancel();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
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

  function startListening() {
    const speechWindow = window as SpeechRecognitionWindow;
    const SpeechRecognition =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    clearSilenceTimer();
    speechTextRef.current = "";
    setListening(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const trimmed = transcript.trim();
      if (trimmed) {
        speechTextRef.current = trimmed;
        setInput(trimmed);
      }
      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(() => {
        const finalQuestion = speechTextRef.current.trim();
        if (finalQuestion) {
          stopListening();
          send(finalQuestion);
        }
      }, 1500);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => {
      setListening(false);
      const finalQuestion = speechTextRef.current.trim();
      if (finalQuestion) {
        send(finalQuestion);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setListening(false);
    }
  }

  function toggleMicrophone() {
    if (listening) {
      stopListening();
      const textToSend = (speechTextRef.current || input).trim();
      if (textToSend) send(textToSend);
    } else {
      startListening();
    }
  }

  function speakAnswer(text: string, messageId: string) {
    if (!window.speechSynthesis) return;

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

    if (voice) utterance.voice = voice;
    utterance.rate = 0.95;

    utterance.onstart = () => setSpeakingMessageId(messageId);
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    window.speechSynthesis.speak(utterance);
  }

  async function send(explicitText?: string) {
    const question = (explicitText !== undefined ? explicitText : input).trim();
    if (!question || loading) return;

    if (listening && explicitText === undefined) {
      stopListening();
    }

    setInput("");
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
        selectedVideos.length > 0 ? selectedVideos : undefined,
        courseId ?? undefined
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
    <div className="flex flex-col h-full rounded-3xl border border-[#333642] shadow-2xl overflow-hidden relative bg-[#121316]">
      {/* Blurred Background Wallpaper Layer */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "url('/chat-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          filter: "blur(6px)",
          transform: "scale(1.06)"
        }}
      />
      {/* Dark tint overlay for superior contrast & readability */}
      <div className="absolute inset-0 bg-[#121316]/40 pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 px-5 py-3.5 flex items-center justify-between border-b border-[#333642]/50 bg-[#18191E]/85 backdrop-blur-xs shrink-0">
        <div className="flex items-center gap-2 text-white font-bold text-base">
          <Sparkles className="w-4.5 h-4.5 text-[#E5F842]" />
          <span>Course AI Assistant</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsKeyModalOpen(true)}
            title="Configure Gemini API Key & test connection"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 hover:text-white border border-[#333642] transition-colors cursor-pointer"
          >
            <Key className="w-3.5 h-3.5 text-[#E5F842]" />
            <span className="hidden sm:inline">Gemini API Key</span>
          </button>
          {messages.length > 0 && (
            <button
              onClick={() => clearCurrentChat()}
              title="Clear course chat"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* Message List (Unblurred) */}
      <div 
        ref={messagesRef}
        className="relative z-10 flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4 flex flex-col bg-transparent"
      >
        {isLoadingHistory ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6 px-3 my-auto text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-[#E5F842] mb-2" />
            <p className="text-xs font-semibold text-slate-300">Loading course conversation...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6 px-3 my-auto">
            <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight drop-shadow-lg">
              What would you like to know?
            </h3>
            <p className="text-xs text-slate-300/80 mt-1 max-w-xs font-medium">
              Ask questions grounded strictly in this course's video transcripts.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <Message
              key={message.id}
              id={message.id}
              role={message.role}
              text={message.text}
              sources={message.sources}
              isError={message.isError}
              onRegenerate={message.role === "assistant" ? () => send(message.text) : undefined}
              onListen={message.role === "assistant" ? () => speakAnswer(message.text, message.id) : undefined}
              isSpeaking={speakingMessageId === message.id}
            />
          ))
        )}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-[#E5F842] bg-[#18191E]/90 px-3.5 py-2.5 rounded-2xl border border-[#E5F842]/40 max-w-xs animate-pulse shadow-lg">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>AI is searching transcripts & generating response...</span>
          </div>
        )}
      </div>

      {/* Input Area & Sub-footer */}
      <div className="relative z-10 p-3.5 bg-[#18191E]/85 border-t border-[#333642]/40 backdrop-blur-xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-center gap-2 bg-[#121316]/90 rounded-2xl p-1.5 pl-3.5 border border-[#333642] focus-within:border-[#E5F842] transition-all shadow-inner"
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-400 focus:outline-hidden"
          />

          <button
            type="button"
            onClick={toggleMicrophone}
            title={listening ? "Stop listening" : "Speak question"}
            className={`p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#2E313B] transition-colors ${
              listening ? "text-rose-400 bg-rose-500/10 animate-pulse" : ""
            }`}
          >
            {listening ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-full bg-[#E5F842] hover:bg-[#D6EA35] text-[#121316] font-extrabold flex items-center justify-center disabled:opacity-30 transition-colors shrink-0 cursor-pointer shadow-md"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Sub-footer */}
        <div className="flex items-center justify-between mt-2.5 px-1 text-[11px] font-medium text-slate-400">
          <div className="flex items-center gap-1 text-[#E5F842] font-semibold">
            <span>AI Assistant</span>
            <Sparkles className="w-3 h-3" />
          </div>
          <div className="flex items-center gap-1">
            <span>Ask</span>
            <Sparkles className="w-3 h-3 text-[#E5F842]" />
            <span className="font-semibold text-slate-300">Gemini</span>
          </div>
        </div>
      </div>

      {/* Gemini API Key Configuration & Test Modal */}
      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
      />
    </div>
  );
}
