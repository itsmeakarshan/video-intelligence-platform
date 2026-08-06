import {

Paper,

Typography,

Button,

CircularProgress,

Box

} from "@mui/material";

import { useState } from "react";

import { askAI } from "../../services/chatService";

export default function Summary(){

const[summary,setSummary]=useState("");

const[loading,setLoading]=useState(false);

async function generate(){

setLoading(true);

try{

const result=await askAI(

"Provide a detailed summary of the uploaded video."

);

setSummary(

result.answer

);

}

finally{

setLoading(false);

}

}

return(

<Paper

sx={{

p:3,

borderRadius:4,

mt:3

}}

>

<Typography

variant="h6"

sx={{

fontWeight:700,

mb:2

}}

>

AI Summary

</Typography>

<Button

variant="contained"

onClick={generate}

disabled={loading}

>

{

loading

?

<CircularProgress

size={20}

color="inherit"

/>

:

"Generate Summary"

}

</Button>

{

summary&&

<Box

sx={{

mt:3,

whiteSpace:"pre-wrap",

lineHeight:1.8

}}

>

{summary}

</Box>

}

</Paper>

);
}
