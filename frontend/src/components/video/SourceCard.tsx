import {

Button,

Card,

CardContent,

Typography

} from "@mui/material";

interface Props{

videoId:number;

start:number;

end:number;

}

export default function SourceCard({

videoId,

start,

end

}:Props){

return(

<Card sx={{mt:2}}>

<CardContent>

<Typography
sx={{
fontWeight:"bold"
}}
>

?? Uploaded Video

</Typography>

<Typography>

Video #{videoId}

</Typography>

<Typography>

{start.toFixed(2)}s - {end.toFixed(2)}s

</Typography>

<Button

variant="contained"

sx={{mt:2}}

>

? Jump to Timestamp

</Button>

</CardContent>

</Card>

);

}
