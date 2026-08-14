import {
    createContext,
    useContext,
    useRef,
    useState
} from "react";
import { API_URL } from "../utils/constants";


export interface VideoItem {
    id: number;
    filename: string;
    original_filename: string;
    file_path: string;
    file_size: number;
    status: string;
    created_at: string;
}

interface VideoContextType {
    videos: VideoItem[];
    setVideos: (videos: VideoItem[]) => void;
    selectedVideo: VideoItem | null;
    setSelectedVideo: (video: VideoItem | null) => void;
    videoUrl: string;
    setVideoUrl: (url: string) => void;
    videoTitle: string;
    setVideoTitle: (title: string) => void;
    videoId: number | null;
    setVideoId: (id: number | null) => void;
    processing: boolean;
    setProcessing: (value: boolean) => void;
    playerRef: React.RefObject<HTMLVideoElement | null>;
    seekTo: (time: number) => void;
    loadVideo: (video: VideoItem) => void;
    jumpToVideo: (
        video: VideoItem,
        time: number
    ) => void;
    getVideoDisplayNumber: (targetVideoId: number) => number;
}

const VideoContext = createContext(
    {} as VideoContextType
);

export function VideoProvider({
    children
}: {
    children: React.ReactNode
}) {
    const [videos, setVideos] = useState<VideoItem[]>([]);
    const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
    const [videoUrl, setVideoUrl] = useState("");
    const [videoTitle, setVideoTitle] = useState("");
    const [videoId, setVideoId] = useState<number | null>(null);
    const [processing, setProcessing] = useState(false);

    const playerRef = useRef<HTMLVideoElement>(null);

    function getVideoDisplayNumber(targetVideoId: number): number {
        const sorted = [...videos].sort((a, b) => a.id - b.id);
        const index = sorted.findIndex(v => v.id === targetVideoId);
        return index !== -1 ? index + 1 : targetVideoId;
    }

    function seekTo(time: number) {
        if (playerRef.current) {
            playerRef.current.currentTime = time;
            playerRef.current.play();
        }
    }

    function loadVideo(video: VideoItem) {
        setSelectedVideo(video);
        setVideoId(video.id);
        setVideoTitle(
            video.original_filename
        );
        setVideoUrl(
            `${API_URL}/videos/${video.id}/file?access_token=${encodeURIComponent(localStorage.getItem("access_token") || "")}`
        );

    }

    function jumpToVideo(
        video: VideoItem,
        time: number
    ) {
        if (videoId === video.id) {
            seekTo(time);
            return;
        }

        loadVideo(video);

        const player = playerRef.current;

        if (!player) {
            return;
        }

        const onLoaded = () => {
            player.currentTime = time;
            player.play();
            player.removeEventListener(
                "loadedmetadata",
                onLoaded
            );
        };

        player.addEventListener(
            "loadedmetadata",
            onLoaded
        );
    }

    return (
        <VideoContext.Provider
            value={{
                videos,
                setVideos,
                selectedVideo,
                setSelectedVideo,
                videoUrl,
                setVideoUrl,
                videoTitle,
                setVideoTitle,
                videoId,
                setVideoId,
                processing,
                setProcessing,
                playerRef,
                seekTo,
                loadVideo,
                jumpToVideo,
                getVideoDisplayNumber
            }}
        >
            {children}
        </VideoContext.Provider>
    );
}

export function useVideo() {
    return useContext(VideoContext);
}
