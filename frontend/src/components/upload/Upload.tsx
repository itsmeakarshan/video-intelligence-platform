import { useRef, useState } from "react";

import {
    Button
} from "@mui/material";

import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";

import toast from "react-hot-toast";

import {

    getVideos,

    uploadVideo

} from "../../api/api";

import { useVideo } from "../../context/VideoContext";

export default function Upload() {

    const inputRef = useRef<HTMLInputElement>(null);

    const [uploading, setUploading] = useState(false);

    const {

        setVideos,

        setSelectedVideo,

        setVideoId,

        setVideoTitle,

        setVideoUrl

    } = useVideo();

    async function upload(file: File) {

        try {

            setUploading(true);

            const result = await uploadVideo(file);

            const videos = await getVideos();

            setVideos(videos);

            const current = videos.find(

                (video: any) => video.id === result.id

            );

            if (current) {

                setSelectedVideo(current);

                setVideoId(current.id);

                setVideoTitle(

                    current.original_filename

                );

                setVideoUrl(

                    `http://127.0.0.1:8000/uploads/${current.filename}`

                );

            }

            toast.success(

                "Video uploaded successfully."

            );

        }

        catch (error: any) {

            toast.error(

                error.response?.data?.detail ??

                "Upload failed."

            );

        }

        finally {

            setUploading(false);

        }

    }

    return (

        <>

            <input

                hidden

                ref={inputRef}

                type="file"

                accept="video/*"

                onChange={event => {

                    const file = event.target.files?.[0];

                    if (file) {

                        upload(file);

                    }

                    event.target.value = "";

                }}

            />

            <Button

                fullWidth

                variant="contained"

                disabled={uploading}

                startIcon={

                    <CloudUploadRoundedIcon />

                }

                sx={{

                    py: 1.5,

                    borderRadius: 2,

                    textTransform: "none",

                    fontWeight: 700

                }}

                onClick={() =>

                    inputRef.current?.click()

                }

            >

                {

                    uploading

                        ? "Uploading..."

                        : "Upload New Video"

                }

            </Button>

        </>

    );

}