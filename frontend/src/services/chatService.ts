import { chat } from "../api/api";

export async function askAI(

question:string,

conversationId?:string

){

return await chat(

question,

conversationId

);

}
