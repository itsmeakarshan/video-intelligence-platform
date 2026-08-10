import {
    createContext,
    useContext,
    useState
} from "react";

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    text: string;
    sources?: any;
}

interface ChatContextType {
    messages: ChatMessage[];
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;

    conversationId: string;
    setConversationId: (id: string) => void;

    selectedVideos: number[];
    setSelectedVideos: React.Dispatch<React.SetStateAction<number[]>>;
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

    return (
        <ChatContext.Provider
            value={{
                messages,
                setMessages,

                conversationId,
                setConversationId,

                selectedVideos,
                setSelectedVideos
            }}
        >
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    return useContext(ChatContext);
}