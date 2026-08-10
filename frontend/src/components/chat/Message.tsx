import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
    Avatar,
    Box,
    Paper
} from "@mui/material";

import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";

import SourceCard from "../video/SourceCard";

interface Source {

    video_id: number;

    start_time: number;

    end_time: number;

}

interface Props {

    role: "user" | "assistant";

    text: string;

    sources?: Source[];

}

export default function Message({

    role,

    text,

    sources = []

}: Props) {

    const isUser = role === "user";

    return (

        <Box

            sx={{

                display: "flex",

                alignItems: "flex-start",

                gap: 2,

                mb: 3,

                flexDirection: isUser ? "row-reverse" : "row"

            }}

        >

            <Avatar

                sx={{

                    bgcolor: isUser ? "#2563eb" : "#14b8a6"

                }}

            >

                {

                    isUser

                        ? <PersonRoundedIcon />

                        : <SmartToyRoundedIcon />

                }

            </Avatar>

            <Box

                sx={{

                    maxWidth: "82%"

                }}

            >

                <Paper

                    sx={{

                        p: 2,

                        borderRadius: 1.5

                    }}

                >

                    <ReactMarkdown remarkPlugins={[remarkGfm]}>

                        {text}

                    </ReactMarkdown>

                </Paper>

                {

                    !isUser &&

                    sources.length > 0 &&

                    sources[0] && (

                        <Box sx={{ mt: 2 }}>

                            <SourceCard

                                sx={{ borderRadius: 1.5 }}

                                videoId={sources[0].video_id}

                                start={sources[0].start_time}

                                end={sources[0].end_time}

                            />

                        </Box>

                    )

                }

            </Box>

        </Box>

    );

}