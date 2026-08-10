import axios from "axios";

export const api = axios.create({
    baseURL: "http://127.0.0.1:8000"
});

export async function uploadVideo(
    file: File,
    onProgress?: (progress: number) => void
) {

    const formData = new FormData();

    formData.append(
        "file",
        file
    );

    const response = await api.post(
        "/videos/upload",
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data"
            },

            onUploadProgress(event) {

                if (!event.total) return;

                const percent = Math.round(
                    (event.loaded * 100) /
                    event.total
                );

                onProgress?.(percent);
            }
        }
    );

    return response.data;
}


export async function getVideos() {

    const response = await api.get(
        "/videos"
    );

    return response.data;
}


export async function generateTranscript(
    videoId: number
) {

    const response = await api.post(
        `/transcripts/${videoId}`
    );

    return response.data;
}


export async function deleteVideo(
    videoId: number
) {

    const response = await api.delete(
        `/videos/${videoId}`
    );

    return response.data;
}


export async function getTranscript(
    videoId: number
) {

    const response = await api.get(
        `/transcripts/${videoId}`
    );

    return response.data;
}


export async function getSegments(
    videoId: number
) {

    const response = await api.get(
        `/transcripts/${videoId}/segments`
    );

    return response.data;
}


export async function downloadYouTubeVideo(
    url: string,
    quality: string
) {

    try {

        const response = await api.post(
            "/youtube/download",
            {
                url,
                quality
            }
        );

        return response.data;

    } catch (error: any) {

        if (error.response?.data?.detail) {

            throw new Error(
                error.response.data.detail
            );

        }

        if (error.code === "ERR_NETWORK") {

            throw new Error(
                "Cannot connect to the backend."
            );

        }

        throw new Error(
            "Failed to download YouTube video."
        );
    }
}


/* =====================================================
AUTHENTICATION
===================================================== */

export async function registerUser(
    name: string,
    email: string,
    password: string
) {

    const response = await api.post(
        "/auth/register",
        {
            name,
            email,
            password
        }
    );

    return response.data;
}


export async function loginUser(
    email: string,
    password: string
) {

    const response = await api.post(
        "/auth/login",
        {
            email,
            password
        }
    );

    return response.data;
}