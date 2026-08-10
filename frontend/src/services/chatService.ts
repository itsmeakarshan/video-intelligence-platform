import { api } from "../api/api";

export async function askAI(
    question: string,
    conversationId?: string,
    videoIds?: number[]
) {

    try {

        const response = await api.post("/chat", {
            question,
            conversation_id: conversationId,
            video_ids: videoIds
        });

        return response.data;

    } catch (error: any) {

        handleError(error);

    }

}

export async function generateSummary(
    videoIds: number[]
) {

    try {

        const response = await api.post(
            "/chat/summary",
            {
                video_ids: videoIds
            }
        );

        return response.data;

    } catch (error: any) {

        handleError(error);

    }

}

export async function generateNotes(
    videoIds: number[]
) {

    try {

        const response = await api.post(
            "/chat/notes",
            {
                video_ids: videoIds
            }
        );

        return response.data;

    } catch (error: any) {

        handleError(error);

    }

}

export async function generateQuiz(
    videoIds: number[],
    difficulty: string,
    questions: number
) {

    try {

        const response = await api.post(
            "/chat/quiz",
            {
                video_ids: videoIds,
                difficulty,
                questions
            }
        );

        return response.data;

    } catch (error: any) {

        handleError(error);

    }

}

function handleError(
    error: any
): never {

    if (error.response?.status === 404) {
        throw new Error(
            "No processed videos are available yet."
        );
    }

    if (error.response?.status === 500) {
        throw new Error(
            "The AI is temporarily unavailable."
        );
    }

    if (error.code === "ERR_NETWORK") {
        throw new Error(
            "Cannot connect to the backend."
        );
    }

    throw new Error(
        error.response?.data?.detail ||
        "Something went wrong."
    );

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
                "Content-Type": "application/json",
                ...(localStorage.getItem("access_token")
                    ? { Authorization: `Bearer ${localStorage.getItem("access_token")}` }
                    : {})
            },
            body: JSON.stringify({
                question,
                conversation_id: conversationId,
                video_ids: videoIds
            })
        }
    );

    if (!response.ok) {

        const text = await response.text();

        throw new Error(
            text || "Streaming failed."
        );

    }

    const id = response.headers.get(
        "x-conversation-id"
    );

    if (id) {

        onConversationId(id);

    }

    const reader = response.body?.getReader();

    if (!reader) {

        throw new Error(
            "No response stream."
        );

    }

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
