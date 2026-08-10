import {
    uploadVideo
} from "../api/api";



export async function upload(
    file: File,
    onProgress?: (progress: number) => void
) {

    return await uploadVideo(
        file,
        onProgress
    );

}