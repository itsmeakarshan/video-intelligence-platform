import {
    uploadVideo
} from "../api/api";



export async function upload(
    file: File,
    onProgress?: (progress: number) => void,
    courseId?: number | null
) {
    return await uploadVideo(
        file,
        onProgress,
        courseId
    );
}