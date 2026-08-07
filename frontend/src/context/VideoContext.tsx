import {
    createContext,
    useContext,
    useRef,
    useState
} from "react";

export interface VideoItem {

    id:number;

    filename:string;

    original_filename:string;

    file_path:string;

    file_size:number;

    status:string;

    created_at:string;

}

interface VideoContextType{

    videos:VideoItem[];

    setVideos:(videos:VideoItem[])=>void;

    selectedVideo:VideoItem|null;

    setSelectedVideo:(video:VideoItem|null)=>void;

    videoUrl:string;

    setVideoUrl:(url:string)=>void;

    videoTitle:string;

    setVideoTitle:(title:string)=>void;

    videoId:number|null;

    setVideoId:(id:number|null)=>void;

    processing:boolean;

    setProcessing:(value:boolean)=>void;

    playerRef:React.RefObject<HTMLVideoElement|null>;

    seekTo:(time:number)=>void;

}

const VideoContext=createContext<VideoContextType>(
    {} as VideoContextType
);

export function VideoProvider({

    children

}:{

    children:React.ReactNode

}){

    const[videos,setVideos]=useState<VideoItem[]>([]);

    const[selectedVideo,setSelectedVideo]=useState<VideoItem|null>(null);

    const[videoUrl,setVideoUrl]=useState("");

    const[videoTitle,setVideoTitle]=useState("");

    const[videoId,setVideoId]=useState<number|null>(null);

    const[processing,setProcessing]=useState(false);

    const playerRef=useRef<HTMLVideoElement>(null);

    function seekTo(time:number){

        if(playerRef.current){

            playerRef.current.currentTime=time;

            playerRef.current.play();

        }

    }

    return(

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

                seekTo

            }}

        >

            {children}

        </VideoContext.Provider>

    );

}

export function useVideo(){

    return useContext(VideoContext);

}