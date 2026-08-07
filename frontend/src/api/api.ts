import axios from "axios";

export const api = axios.create({

    baseURL: "http://127.0.0.1:8000",

    headers: {

        "Content-Type": "application/json"

    }

});

export async function uploadVideo(

    file: File

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

    videoId: number,

    whisperModel: string

) {

    const response = await api.post(

        `/transcripts/${videoId}`,

        null,

        {

            params: {

                whisper_model: whisperModel

            }

        }

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


export async function deleteVideo(
    videoId: number
) {
    const response = await api.delete(
        `/videos/${videoId}`
    );

    return response.data;
}