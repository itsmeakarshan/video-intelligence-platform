const resolveApiUrl = (): string => {
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL as string;
    }
    if (typeof window !== "undefined") {
        if (window.location.port === "5173") {
            return "http://localhost:8000";
        }
        return `${window.location.origin}/api`;
    }
    return "http://localhost:8000";
};

export const API_URL = resolveApiUrl();


export const MAX_VIDEO_SIZE = 1024 * 1024 * 1024;

export const SUPPORTED_VIDEO_TYPES = [

    "video/mp4",

    "video/avi",

    "video/quicktime",

    "video/x-msvideo"

];

export const CHAT_PLACEHOLDER =

"Ask anything about your uploaded videos...";

export const APP_NAME =

"Video Intelligence Platform";
