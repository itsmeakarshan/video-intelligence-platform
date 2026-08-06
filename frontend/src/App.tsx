import Dashboard from "./pages/Dashboard";

import { ChatProvider } from "./context/ChatContext";

import { VideoProvider } from "./context/VideoContext";

export default function App(){

return(

<VideoProvider>

<ChatProvider>

<Dashboard/>

</ChatProvider>

</VideoProvider>

);

}
