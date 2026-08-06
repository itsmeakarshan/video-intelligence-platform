import {

createContext,

useContext,

useRef,

useState

} from "react";

interface VideoContextType{

videoUrl:string;

setVideoUrl:(url:string)=>void;

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

const[videoUrl,setVideoUrl]=useState("");

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

videoUrl,

setVideoUrl,

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
