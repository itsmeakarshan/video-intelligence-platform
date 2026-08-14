import axios from "axios";
import { API_URL } from "../utils/constants";

const API_BASE_URL = API_URL;


export const api = axios.create({
    baseURL: API_BASE_URL
});

api.interceptors.request.use((config) => {
    let token = localStorage.getItem("access_token");
    if (token) {
        token = token.replace(/^"|"$/g, "").trim();
        if (config.headers && typeof config.headers.set === "function") {
            config.headers.set("Authorization", `Bearer ${token}`);
        } else if (config.headers) {
            config.headers["Authorization"] = `Bearer ${token}`;
        }
    }
    return config;
});

api.interceptors.response.use(
    response => response,
    error => {
        const requestUrl = error.config?.url || "";
        const isAuthEndpoint = requestUrl.includes("/auth/login") || requestUrl.includes("/auth/register");

        if (error.response?.status === 401 && !isAuthEndpoint) {
            console.warn(`[API Interceptor] 401 Unauthorized received for ${requestUrl}. Triggering auth cleanup.`);
            localStorage.removeItem("access_token");
            localStorage.removeItem("user");
            window.dispatchEvent(new Event("auth:unauthorized"));
        }
        return Promise.reject(error);
    }
);

export async function uploadVideo(
    file: File,
    onProgress?: (progress: number) => void
) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post(
        "/videos/upload",
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data"
            },
            onUploadProgress(event) {
                if (!event.total) return;
                const percent = Math.round((event.loaded * 100) / event.total);
                onProgress?.(percent);
            }
        }
    );
    return response.data;
}

export async function getVideos() {
    const response = await api.get("/videos");
    return response.data;
}

export async function generateTranscript(videoId: number) {
    const response = await api.post(`/transcripts/${videoId}`);
    return response.data;
}

export async function deleteVideo(videoId: number) {
    const response = await api.delete(`/videos/${videoId}`);
    return response.data;
}

export async function saveQuizAttempt(
    score: number,
    totalQuestions: number,
    difficulty: string,
    videoIds?: number[] | number,
    questionsData?: any[]
) {
    const payload: Record<string, any> = {
        score,
        total_questions: totalQuestions,
        difficulty
    };

    if (Array.isArray(videoIds) && videoIds.length > 0) {
        payload.video_ids = videoIds;
    } else if (typeof videoIds === "number") {
        payload.video_ids = [videoIds];
    }

    if (Array.isArray(questionsData) && questionsData.length > 0) {
        payload.questions = questionsData;
    }

    const response = await api.post("/quiz-attempts", payload);
    return response.data;
}

export async function getQuizAttemptRecommendations(attemptId: number) {
    const response = await api.get(`/quiz-attempts/${attemptId}/recommendations`);
    return response.data;
}

export async function getKnowledgeProfile() {
    const response = await api.get("/quiz-attempts/knowledge-profile");
    return response.data;
}

export async function getLearningGain() {
    const response = await api.get("/quiz-attempts/learning-gain");
    return response.data;
}

export async function getTranscript(videoId: number) {
    const response = await api.get(`/transcripts/${videoId}`);
    return response.data;
}

export async function getSegments(videoId: number) {
    const response = await api.get(`/transcripts/${videoId}/segments`);
    return response.data;
}

export async function downloadYouTubeVideo(url: string, quality: string) {
    try {
        const response = await api.post("/youtube/download", { url, quality });
        return response.data;
    } catch (error: any) {
        if (error.response?.data?.detail) {
            throw new Error(error.response.data.detail);
        }
        if (error.code === "ERR_NETWORK") {
            throw new Error("Cannot connect to the backend.");
        }
        throw new Error("Failed to download YouTube video.");
    }
}

export async function registerUser(name: string, email: string, password: string) {
    const response = await api.post("/auth/register", { name, email, password });
    return response.data;
}

export async function loginUser(email: string, password: string) {
    const response = await api.post("/auth/login", { email, password });
    return response.data;
}

export async function getLearningPrediction(difficulty: string = "Medium") {
    const response = await api.get(`/ml/prediction?difficulty=${encodeURIComponent(difficulty)}`);
    return response.data;
}

export async function getMLPerformance() {
    const response = await api.get("/ml/performance");
    return response.data;
}

export async function getDataQuality() {
    const response = await api.get("/ml/data-quality");
    return response.data;
}

export async function getDriftReport() {
    const response = await api.get("/ml/drift");
    return response.data;
}

export async function getExperimentsRegistry() {
    const response = await api.get("/ml/experiments");
    return response.data;
}
