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

export interface UserProfile {
    id: number;
    name: string;
    email: string;
    role: "admin" | "student" | string;
}

export interface AdminUserListItem {
    id: number;
    name: string;
    email: string;
    role: string;
    created_at: string;
    enrolled_courses_count?: number;
    quiz_attempt_count: number;
    last_score_percentage?: number | null;
    average_score_percentage?: number | null;
}

export interface AdminPlatformStats {
    total_students: number;
    total_admins: number;
    total_videos: number;
    completed_videos: number;
    total_quiz_attempts: number;
    platform_average_score: number;
}

export interface CourseItem {
    id: number;
    title: string;
    description: string;
    thumbnail_url?: string | null;
    price?: number;
    is_enrolled?: boolean;
    user_id?: number | null;
    user_name?: string | null;
    video_count: number;
    completed_video_count: number;
    created_at: string;
    updated_at: string;
}

export interface CourseVideoItem {
    id: number;
    course_id?: number | null;
    order_index: number;
    title: string;
    filename: string;
    original_filename: string;
    file_size: number;
    status: string;
    progress?: number;
    current_step?: string;
    created_at: string;
}

export interface CourseDetail extends CourseItem {
    videos: CourseVideoItem[];
}

export async function getCourses(): Promise<CourseItem[]> {
    const response = await api.get("/courses");
    return response.data;
}

export async function getCourse(id: number): Promise<CourseDetail> {
    const response = await api.get(`/courses/${id}`);
    return response.data;
}

export async function enrollInCourse(courseId: number): Promise<{ success: boolean; is_enrolled: boolean; message: string; amount_paid?: number }> {
    const response = await api.post(`/courses/${courseId}/enroll`);
    return response.data;
}

export async function createCourse(data: { title: string; description: string; thumbnail_url?: string | null; price?: number }) {
    const response = await api.post("/courses", data);
    return response.data;
}

export async function updateCourse(id: number, data: { title?: string; description?: string; thumbnail_url?: string | null; price?: number }) {
    const response = await api.put(`/courses/${id}`, data);
    return response.data;
}

export async function deleteCourse(id: number) {
    const response = await api.delete(`/courses/${id}`);
    return response.data;
}

export async function uploadCourseThumbnail(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/courses/upload-thumbnail", formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data;
}

export async function reorderCourseVideos(courseId: number, videoOrders: { video_id: number; order_index: number }[]) {
    const response = await api.put(`/courses/${courseId}/videos/reorder`, { video_orders: videoOrders });
    return response.data;
}

export async function updateCourseVideo(courseId: number, videoId: number, data: { title?: string; order_index?: number }) {
    const response = await api.patch(`/courses/${courseId}/videos/${videoId}`, data);
    return response.data;
}

export async function uploadVideo(
    file: File,
    onProgress?: (progress: number) => void,
    courseId?: number | null
) {
    const formData = new FormData();
    formData.append("file", file);
    if (courseId) {
        formData.append("courseId", courseId.toString());
    }
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

export async function getVideos(courseId?: number) {
    const params: Record<string, any> = {};
    if (courseId) params.courseId = courseId;
    const response = await api.get("/videos", { params });
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

export interface QuizAttemptItem {
    id: number;
    user_id: number;
    attempt_number: number;
    score: number;
    total_questions: number;
    percentage: number;
    difficulty: string;
    created_at: string;
    video_id?: number | null;
    course_id?: number | null;
    course_title?: string | null;
    videos: Array<{
        id: number;
        filename: string;
        original_filename: string;
    }>;
}

export async function getQuizAttempts(courseId?: number): Promise<QuizAttemptItem[]> {
    const params: Record<string, any> = {};
    if (courseId) params.course_id = courseId;
    const response = await api.get("/quiz-attempts", { params });
    return response.data;
}

export async function getQuizAttemptRecommendations(attemptId: number) {
    const response = await api.get(`/quiz-attempts/${attemptId}/recommendations`);
    return response.data;
}

export async function getKnowledgeProfile(userId?: number, courseId?: number) {
    const params: Record<string, any> = {};
    if (userId) params.user_id = userId;
    if (courseId) params.course_id = courseId;
    const response = await api.get("/quiz-attempts/knowledge-profile", { params });
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

export async function downloadYouTubeVideo(url: string, quality: string, courseId?: number) {
    try {
        const payload: { url: string; quality: string; course_id?: number } = { url, quality };
        if (courseId) payload.course_id = courseId;
        const response = await api.post("/youtube/download", payload);
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

export async function registerUser(name: string, email: string, password: string, role: string = "student") {
    const response = await api.post("/auth/register", { name, email, password, role });
    return response.data;
}

export async function loginUser(email: string, password: string) {
    const response = await api.post("/auth/login", { email, password });
    return response.data;
}

export async function getCurrentUser(): Promise<UserProfile> {
    const response = await api.get("/auth/me");
    return response.data;
}

export async function getAdminUsers(): Promise<AdminUserListItem[]> {
    const response = await api.get("/admin/users");
    return response.data;
}

export async function createAdminUser(data: { name: string; email: string; password: string; role: string }): Promise<UserProfile> {
    const response = await api.post("/admin/users", data);
    return response.data;
}

export async function deleteAdminUser(userId: number): Promise<{ message: string }> {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
}

export async function getAdminStats(): Promise<AdminPlatformStats> {
    const response = await api.get("/admin/stats");
    return response.data;
}
