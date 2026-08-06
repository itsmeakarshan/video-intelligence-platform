import {

Box,

List,

ListItemButton,

ListItemText,

Paper,

Typography

} from "@mui/material";

interface Segment{

segment_index:number;

start_time:number;

end_time:number;

text:string;

}

interface Props{

segments:Segment[];

onSeek:(time:number)=>void;

}

function formatTime(seconds:number){

const m=Math.floor(seconds/60);

const s=Math.floor(seconds%60);

return `${m}:${s.toString().padStart(2,"0")}`;

}

export default function Transcript({

segments,

onSeek

}:Props){

return(

<Paper

sx={{

height:500,

overflowY:"auto",

borderRadius:4,

p:2

}}

>

<Typography

variant="h6"

sx={{

fontWeight:700,

mb:2

}}

>

Transcript

</Typography>

<List>

{

segments.map(segment=>(

<ListItemButton

key={segment.segment_index}

onClick={()=>onSeek(segment.start_time)}

sx={{

borderRadius:2,

mb:1

}}

>

<ListItemText

primary={

formatTime(

segment.start_time

)

}

secondary={

segment.text

}

/>

</ListItemButton>

))

}

</List>

</Paper>

);

}
