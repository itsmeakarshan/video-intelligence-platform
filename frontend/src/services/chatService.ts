import { api } from "../api/api";

export async function askAI(
    question: string,
    conversationId?: string,
    videoIds?: number[]
) {

    const response = await api.post(
        "/chat",
        {
            question,
            conversation_id: conversationId,
            video_ids: videoIds
        }
    );

    return response.data;
}

export async function askAIStream(
    question: string,
    conversationId: string | undefined,
    videoIds: number[] | undefined,
    onChunk: (chunk: string) => void,
    onConversationId: (id: string) => void
) {

    const response = await fetch(
        "http://127.0.0.1:8000/chat/stream",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                question,
                conversation_id: conversationId,
                video_ids: videoIds
            })
        }
    );

    if (!response.ok) {
        throw new Error("Streaming failed.");
    }

    const id = response.headers.get("x-conversation-id");

    if (id) {
        onConversationId(id);
    }

    const reader = response.body!.getReader();

    const decoder = new TextDecoder();

    while (true) {

        const {
            done,
            value
        } = await reader.read();

        if (done) {
            break;
        }

        onChunk(
            decoder.decode(
                value,
                {
                    stream: true
                }
            )
        );
    }
}