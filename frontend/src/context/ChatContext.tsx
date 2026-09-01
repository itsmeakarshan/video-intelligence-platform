import {
    createContext,
    useContext,
    useState,
    useCallback
} from "react";
import { getCourseConversation, clearCourseConversation } from "../services/chatService";

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    text: string;
    sources?: any;
    isError?: boolean;
}

interface ChatContextType {
    messages: ChatMessage[];
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;

    conversationId: string;
    setConversationId: (id: string) => void;

    selectedVideos: number[];
    setSelectedVideos: React.Dispatch<React.SetStateAction<number[]>>;

    courseId: number | null;
    setCourseId: (id: number | null) => void;

    isLoadingHistory: boolean;
    switchCourse: (newCourseId: number | null) => Promise<void>;
    clearCurrentChat: () => Promise<void>;
}

const ChatContext = createContext(
    {} as ChatContextType
);

export function ChatProvider({
    children
}: {
    children: React.ReactNode;
}) {

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [conversationId, setConversationId] = useState("");
    const [selectedVideos, setSelectedVideos] = useState<number[]>([]);
    const [courseId, setCourseId] = useState<number | null>(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    const switchCourse = useCallback(async (newCourseId: number | null) => {
        setCourseId(newCourseId);
        // Immediately clear previous course messages so other course chats never leak into the new course
        setMessages([]);
        setConversationId("");

        if (newCourseId === null) {
            setIsLoadingHistory(false);
            return;
        }

        setIsLoadingHistory(true);
        try {
            const data = await getCourseConversation(newCourseId);
            if (data.conversation_id) {
                setConversationId(data.conversation_id);
            }
            if (data.messages && data.messages.length > 0) {
                const formatted: ChatMessage[] = data.messages.map(m => ({
                    id: m.id || String(Math.random()),
                    role: m.role as "user" | "assistant",
                    text: m.text,
                    sources: []
                }));
                setMessages(formatted);
            }
        } catch (err) {
            console.error("Failed to load course chat history:", err);
        } finally {
            setIsLoadingHistory(false);
        }
    }, []);

    const clearCurrentChat = useCallback(async () => {
        if (courseId) {
            try {
                await clearCourseConversation(courseId);
            } catch (err) {
                console.error("Failed to clear course chat:", err);
            }
        }
        setMessages([]);
        setConversationId("");
    }, [courseId]);

    return (
        <ChatContext.Provider
            value={{
                messages,
                setMessages,

                conversationId,
                setConversationId,

                selectedVideos,
                setSelectedVideos,

                courseId,
                setCourseId,

                isLoadingHistory,
                switchCourse,
                clearCurrentChat
            }}
        >
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    return useContext(ChatContext);
}