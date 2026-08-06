import { useEffect, useRef, useState } from "react";

import {
Box,
Button,
Divider,
TextField,
Typography
} from "@mui/material";

import SendIcon from "@mui/icons-material/Send";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useChat } from "../../context/ChatContext";
import { askAI } from "../../services/chatService";

import TypingIndicator from "./TypingIndicator";
import Message from "./Message";
import SourceCard from "../video/SourceCard";

export default function Chat(){

const{

messages,

setMessages,

conversationId,

setConversationId

}=useChat();

const[input,setInput]=useState("");

const[loading,setLoading]=useState(false);

const bottomRef=useRef<HTMLDivElement>(null);

useEffect(()=>{

bottomRef.current?.scrollIntoView({

behavior:"smooth"

});

},[messages,loading]);

async function send(){

if(!input.trim()||loading)return;

const question=input;

setInput("");

setMessages(prev=>[

...prev,

{

id:crypto.randomUUID(),

role:"user",

text:question

}

]);

setLoading(true);

try{

const result=await askAI(

question,

conversationId

);

if(result.conversation_id){

setConversationId(

result.conversation_id

);

}

setMessages(prev=>[

...prev,

{

id:crypto.randomUUID(),

role:"assistant",

text:result.answer,

sources:result.sources

}

]);

}

catch{

setMessages(prev=>[

...prev,

{

id:crypto.randomUUID(),

role:"assistant",

text:"? Something went wrong while contacting the AI."

}

]);

}

finally{

setLoading(false);

}

}

return(

<Box

sx={{

display:"flex",

flexDirection:"column",

height:"100%"

}}

>

<Box sx={{p:2}}>

<Typography
variant="h6"
sx={{
fontWeight:"bold"
}}
>

?? AI Assistant

</Typography>

</Box>

<Divider/>

<Box

sx={{

flex:1,

overflowY:"auto",

p:2

}}

>

{

messages.length===0&&(

<Typography>

?? Upload a video and ask me anything!

</Typography>

)

}

{

messages.map(message=>(

<Box
key={message.id}
sx={{
mb:2
}}
>

<Message

role={message.role}

>

<ReactMarkdown

remarkPlugins={[remarkGfm]}

>

{message.text}

</ReactMarkdown>

</Message>

{

message.sources?.map(

(source:any,index:number)=>(

<SourceCard

key={index}

videoId={source.video_id}

start={source.start_time}

end={source.end_time}

/>

)

)

}

</Box>

))

}

{

loading&&<TypingIndicator/>

}

<div ref={bottomRef}/>

</Box>

<Divider/>

<Box

sx={{

display:"flex",

gap:1,

p:2

}}

>

<TextField

fullWidth

placeholder="Ask anything about your uploaded videos..."

value={input}

onChange={

e=>setInput(e.target.value)

}

onKeyDown={

e=>{

if(e.key==="Enter"){

send();

}

}

}

/>

<Button

variant="contained"

onClick={send}

>

<SendIcon/>

</Button>

</Box>

</Box>

);

}
