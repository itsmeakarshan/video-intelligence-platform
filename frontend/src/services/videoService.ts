import { uploadVideo } from "../api/api";

export async function upload(

file:File

){

return await uploadVideo(

file

);

}
