import {

Box,

Typography

} from "@mui/material";

import { useVideo } from "../../context/VideoContext";

export default function VideoPlayer(){

const{

videoUrl,

processing,

playerRef

}=useVideo();

if(processing){

return(

<Box

sx={{

height:500,

display:"flex",

alignItems:"center",

justifyContent:"center",

background:"#111",

borderRadius:4

}}

>

<Typography

sx={{

color:"white",

fontWeight:700,

fontSize:24

}}

>

Generating transcript...

</Typography>

</Box>

);

}

if(!videoUrl){

return(

<Box

sx={{

height:500,

display:"flex",

alignItems:"center",

justifyContent:"center",

background:"#111",

borderRadius:4

}}

>

<Typography

sx={{

color:"white",

fontWeight:700,

fontSize:24

}}

>

Upload a video

</Typography>

</Box>

);

}

return(

<Box

sx={{

overflow:"hidden",

borderRadius:4,

background:"#000"

}}

>

<video

ref={playerRef}

controls

style={{

width:"100%",

height:"500px",

display:"block"

}}

src={videoUrl}

/>

</Box>

);

}
