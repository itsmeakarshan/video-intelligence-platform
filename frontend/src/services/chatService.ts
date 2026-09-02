import { api } from "../api/api";
import { API_URL } from "../utils/constants";


export async function askAI(
    question: string,
    conversationId?: string,
    videoIds?: number[],
    courseId?: number
) {

    try {

        const response = await api.post("/chat", {
            question,
            conversation_id: conversationId,
            video_ids: videoIds,
            course_id: courseId
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
    questions: number,
    courseId?: number
) {
    try {
        const payload: Record<string, any> = {
            video_ids: videoIds,
            difficulty,
            questions
        };
        if (courseId) {
            payload.course_id = courseId;
        }

        const response = await api.post("/chat/quiz", payload);
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
    onConversationId: (id: string) => void,
    courseId?: number
) {

    const response = await fetch(
        `${API_URL}/chat/stream`,
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
                video_ids: videoIds,
                course_id: courseId
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

export interface CourseChatHistory {
    conversation_id: string | null;
    course_id: number;
    messages: {
        id: string;
        role: "user" | "assistant";
        text: string;
        created_at: string;
    }[];
}

export async function getCourseConversation(courseId: number): Promise<CourseChatHistory> {
    const response = await api.get(`/chat/course/${courseId}`);
    return response.data;
}

export async function clearCourseConversation(courseId: number): Promise<{ success: boolean; detail: string }> {
    const response = await api.delete(`/chat/course/${courseId}`);
    return response.data;
}

export interface ApiKeyStatus {
    configured: boolean;
    masked_key: string;
    model: string;
}

export interface ApiKeyTestResult {
    success: boolean;
    message: string;
    model?: string;
}

export async function getApiKeyStatus(): Promise<ApiKeyStatus> {
    const response = await api.get("/chat/api-key");
    return response.data;
}

export async function updateApiKey(apiKey: string): Promise<{ success: boolean; masked_key: string; message: string }> {
    const response = await api.post("/chat/api-key", { api_key: apiKey });
    return response.data;
}

export async function testApiKey(apiKey?: string): Promise<ApiKeyTestResult> {
    const response = await api.post("/chat/api-key/test", { api_key: apiKey });
    return response.data;
}

export async function deleteApiKey(): Promise<{ success: boolean; message: string }> {
    const response = await api.delete("/chat/api-key");
    return response.data;
}

