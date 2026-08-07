import { useEffect, useState } from "react";



import {

    Avatar,

    Box,

    Button,

    Card,

    CardActionArea,

    CardContent,

    Chip,

    CircularProgress,

    Dialog,

    DialogActions,

    DialogContent,

    DialogTitle,

    Divider,

    IconButton,

    List,

    ListItemButton,

    ListItemIcon,

    ListItemText,

    Tooltip,

    Typography

} from "@mui/material";



import MovieRoundedIcon from "@mui/icons-material/MovieRounded";

import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";



import toast from "react-hot-toast";



import {

    deleteVideo,
    generateTranscript,

    getVideos

} from "../../api/api";



import { useVideo } from "../../context/VideoContext";

import Upload from "../upload/Upload";



export default function VideoLibrary() {

    const {

        videos,

        setVideos,

        selectedVideo,

        setSelectedVideo,

        setVideoId,

        setVideoTitle,

        setVideoUrl

    } = useVideo();



    const [open, setOpen] = useState(false);

    const [processing, setProcessing] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [videoToDelete, setVideoToDelete] = useState<any>(null);
    const [deleting, setDeleting] = useState(false);

    const [selectedModel, setSelectedModel] = useState("base");

    const [selectedProcessingVideo, setSelectedProcessingVideo] =

        useState<any>(null);



    useEffect(() => {

        loadVideos();

    }, []);



    // Auto-refresh while any video is processing

    useEffect(() => {

        const hasProcessingVideo = videos.some(

            (video: any) => video.status === "processing"

        );



        if (!hasProcessingVideo) {

            return;

        }



        const interval = setInterval(() => {

            loadVideos();

        }, 3000);



        return () => clearInterval(interval);

    }, [videos]);



    async function loadVideos() {

        try {

            const data = await getVideos();

            setVideos(data);

        } catch (error) {

            console.error(error);

        }

    }



    function selectVideo(video: any) {

        setSelectedVideo(video);

        setVideoId(video.id);

        setVideoTitle(video.original_filename);

        setVideoUrl(

            `http://127.0.0.1:8000/uploads/${video.filename}`

        );

    }



    function openProcessDialog(video: any) {

        setSelectedProcessingVideo(video);

        setSelectedModel("base");

        setOpen(true);

    }



    async function processVideo() {

        if (!selectedProcessingVideo) {

            return;

        }



        try {

            setProcessing(true);



            await generateTranscript(

                selectedProcessingVideo.id,

                selectedModel

            );



            toast.success("Processing started.");



            await loadVideos();

        } catch {

            toast.error("Unable to start processing.");

        } finally {

            await loadVideos();



            setProcessing(false);

            setOpen(false);

        }

    }


    function openDeleteDialog(video: any) {

        setVideoToDelete(video);

        setDeleteDialogOpen(true);

    }


    async function confirmDelete() {

        if (!videoToDelete) {

            return;

        }

        try {

            setDeleting(true);

            await deleteVideo(videoToDelete.id);

            toast.success("Video deleted.");

            if (selectedVideo?.id === videoToDelete.id) {

                setSelectedVideo(null);

                setVideoId(undefined as any);

                setVideoTitle("");

                setVideoUrl("");

            }

            await loadVideos();

        }

        catch {

            toast.error("Unable to delete video.");

        }

        finally {

            setDeleting(false);

            setDeleteDialogOpen(false);

            setVideoToDelete(null);

        }

    }



    const whisperModels = [

        {

            id: "tiny",

            icon: "⚡",

            title: "Tiny",

            subtitle: "Fastest",

            description: "Lowest accuracy. Great for quick testing."

        },

        {

            id: "base",

            icon: "⭐",

            title: "Base",

            subtitle: "Recommended",

            description: "Best balance of speed and accuracy."

        },

        {

            id: "small",

            icon: "🎯",

            title: "Small",

            subtitle: "Better Accuracy",

            description: "More accurate than Base."

        },

        {

            id: "medium",

            icon: "💎",

            title: "Medium",

            subtitle: "High Accuracy",

            description: "Excellent transcription quality."

        },

        {

            id: "large-v3",

            icon: "👑",

            title: "Large-v3",

            subtitle: "Best Quality",

            description: "Highest accuracy but slowest."

        }

    ];



    return (

        <>

            <Box

                sx={{

                    height: "100%",

                    display: "flex",

                    flexDirection: "column",

                    color: "#F8FAFC"

                }}

            >

                <Typography

                    variant="h5"

                    sx={{

                        fontWeight: 700,

                        mb: 1,

                        color: "#F8FAFC"

                    }}

                >

                    📂 Uploaded Videos

                </Typography>



                <Typography

                    sx={{

                        color: "#94A3B8",

                        mb: 3

                    }}

                >

                    Upload videos now and choose when to process them.

                </Typography>



                <Divider sx={{ mb: 2, borderColor: "rgba(20,184,166,.2)" }} />



                <List

                    sx={{

                        flex: 1,

                        overflowY: "auto",

                        maxHeight: 520,

                        pr: 1

                    }}

                >

                    {videos.length === 0 && (

                        <Box

                            sx={{

                                py: 6,

                                textAlign: "center"

                            }}

                        >

                            <Typography

                                sx={{

                                    fontSize: 32,

                                    mb: 1

                                }}

                            >

                                😊

                            </Typography>



                            <Typography

                                sx={{

                                    color: "#94A3B8",

                                    fontWeight: 500

                                }}

                            >

                                Upload a video

                            </Typography>

                        </Box>

                    )}



                    {videos.map((video: any) => (

                        <Box

                            key={video.id}

                            sx={{

                                mb: 2,

                                borderRadius: 1.5,

                                background: "rgba(15,23,42,.65)",

                                border:

                                    selectedVideo?.id === video.id

                                        ? "2px solid #14B8A6"

                                        : "1px solid rgba(20,184,166,.15)",

                                overflow: "hidden",

                                transition: ".25s",

                                backdropFilter: "blur(12px)",

                                "&:hover": {

                                    borderColor: "rgba(20,184,166,.4)"

                                }

                            }}

                        >

                            <ListItemButton

                                onClick={() => selectVideo(video)}

                                sx={{

                                    "&:hover": {

                                        background: "rgba(20,184,166,.08)"

                                    }

                                }}

                            >

                                <ListItemIcon>

                                    <Avatar

                                        sx={{

                                            bgcolor: "rgba(20,184,166,.2)",

                                            color: "#14B8A6",

                                            border: "1px solid rgba(20,184,166,.3)",

                                            borderRadius: 1

                                        }}

                                    >

                                        <MovieRoundedIcon />

                                    </Avatar>

                                </ListItemIcon>



                                <ListItemText

                                    primary={

                                        <Typography sx={{ color: "#F8FAFC", fontWeight: 600 }}>

                                            {video.original_filename}

                                        </Typography>

                                    }

                                    secondary={

                                        <Typography

                                            sx={{

                                                mt: 0.5,

                                                fontSize: 13,

                                                color: "#94A3B8",

                                                fontWeight: 500,

                                                display: "flex",

                                                alignItems: "center",

                                                gap: 0.8

                                            }}

                                        >

                                            {

                                                video.status === "completed" ? "💬 Ready" :

                                                video.status === "processing" ? "⚡ Processing" :

                                                video.status === "failed" ? "⚠️ Failed" : "📁 Uploaded"

                                            }

                                        </Typography>

                                    }

                                />

                                <Box>

                                    <Tooltip title="Delete Video">

                                        <IconButton

                                            onClick={(event) => {

                                                event.stopPropagation();

                                                openDeleteDialog(video);

                                            }}

                                            sx={{

                                                color: "#94A3B8",

                                                "&:hover": {

                                                    color: "#EF4444",

                                                    background: "rgba(239,68,68,.12)"

                                                }

                                            }}

                                        >

                                            <DeleteOutlineRoundedIcon />

                                        </IconButton>

                                    </Tooltip>
                                </Box>

                            </ListItemButton>



                            {video.status === "uploaded" && (

                                <Box

                                    sx={{

                                        px: 2,

                                        pb: 2

                                    }}

                                >

                                    <Button

                                        fullWidth

                                        variant="contained"

                                        startIcon={

                                            <PlayArrowRoundedIcon />

                                        }

                                        disabled={processing}

                                        onClick={() =>

                                            openProcessDialog(video)

                                        }

                                        sx={{

                                            bgcolor: "#14B8A6",

                                            color: "#021617",

                                            fontWeight: 700,

                                            borderRadius: 1,

                                            "&:hover": {

                                                bgcolor: "#10B981"

                                            }

                                        }}

                                    >

                                        Process

                                    </Button>

                                </Box>

                            )}



                            {video.status === "processing" && (

                                <Box

                                    sx={{

                                        px: 2,

                                        pb: 2,

                                        display: "flex",

                                        alignItems: "center",

                                        gap: 1.5

                                    }}

                                >

                                    <CircularProgress size={18} sx={{ color: "#14B8A6" }} />



                                    <Typography

                                        sx={{

                                            color: "#94A3B8",

                                            fontWeight: 500,

                                            fontSize: 13

                                        }}

                                    >

                                        Please wait while your video is being transcribed...

                                    </Typography>

                                </Box>

                            )}

                        </Box>

                    ))}

                </List>



                <Divider sx={{ my: 2, borderColor: "rgba(20,184,166,.2)" }} />



                <Upload />

            </Box>



            <Dialog

                open={open}

                onClose={() => !processing && setOpen(false)}

                maxWidth="md"

                fullWidth

                PaperProps={{

                    sx: {

                        background: "rgba(4, 47, 46, 0.96)",

                        backdropFilter: "blur(24px)",

                        border: "1px solid rgba(20,184,166,.25)",

                        borderRadius: 1.5,

                        color: "#F8FAFC",

                        boxShadow: "0 30px 80px rgba(0,0,0,.55)"

                    }

                }}

            >

                <DialogTitle

                    sx={{

                        color: "#F8FAFC",

                        fontWeight: 700,

                        fontSize: 28,

                        pb: 1

                    }}

                >

                    🤖 Choose AI Model

                </DialogTitle>



                <DialogContent>

                    <Typography

                        sx={{

                            mb: 3,

                            color: "#94A3B8",

                            fontSize: 15

                        }}

                    >

                        Select the model you want to use for

                        transcription.

                    </Typography>



                    <Box

                        sx={{

                            display: "flex",

                            flexDirection: "column",

                            gap: 2,

                            mt: 2

                        }}

                    >

                        {whisperModels.map(model => (

                            <Card

                                key={model.id}

                                elevation={

                                    selectedModel === model.id

                                        ? 8

                                        : 1

                                }

                                sx={{

                                    background: "rgba(15,23,42,.65)",

                                    border:

                                        selectedModel === model.id

                                            ? "2px solid #14B8A6"

                                            : "1px solid rgba(20,184,166,.15)",



                                    borderRadius: 1,



                                    transition: ".25s",



                                    "&:hover": {

                                        background: "rgba(20,184,166,.08)",



                                        borderColor: "#14B8A6",



                                        transform: "translateY(-2px)"

                                    }

                                }}

                            >

                                <CardActionArea

                                    disabled={processing}

                                    onClick={() =>

                                        setSelectedModel(

                                            model.id

                                        )

                                    }

                                >

                                    <CardContent>

                                        <Box

                                            sx={{

                                                display: "flex",

                                                justifyContent: "space-between",

                                                alignItems: "center"

                                            }}

                                        >

                                            <Box>

                                                <Typography

                                                    variant="h6"

                                                    sx={{

                                                        color: "#F8FAFC",

                                                        fontWeight: 700

                                                    }}

                                                >

                                                    {model.icon} {model.title}

                                                </Typography>



                                                <Typography

                                                    sx={{

                                                        color:"#94A3B8",

                                                        mt:.5,

                                                        fontSize:14

                                                    }}

                                                >

                                                    {model.description}

                                                </Typography>

                                            </Box>



                                            {model.id === "base" && (

                                                <Chip

                                                    label="Recommended"



                                                    sx={{



                                                        bgcolor:"#14B8A6",



                                                        color:"#021617",



                                                        fontWeight:700,

                                                        borderRadius: 0.75



                                                    }}

                                                />

                                            )}

                                        </Box>

                                    </CardContent>

                                </CardActionArea>

                            </Card>

                        ))}

                    </Box>

                </DialogContent>



                <DialogActions>

                    <Button

                        onClick={() => setOpen(false)}

                        sx={{

                            color:"#94A3B8",

                            borderRadius: 1,

                            "&:hover":{

                                color:"#F8FAFC"

                            }

                        }}

                    >

                        Cancel

                    </Button>



                    <Button

                        variant="contained"

                        disabled={processing}

                        onClick={processVideo}

                        sx={{

                            bgcolor:"#14B8A6",

                            color:"#021617",

                            fontWeight:700,

                            px:4,

                            borderRadius: 1,

                            "&:hover":{

                                bgcolor:"#10B981"

                            }

                        }}

                    >

                        {

                            processing

                                ? "Starting..."

                                : "Start Processing"

                        }

                    </Button>

                </DialogActions>

            </Dialog>

            <Dialog
                open={deleteDialogOpen}
                onClose={() => !deleting && setDeleteDialogOpen(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        background: "rgba(4,47,46,.95)",
                        border: "1px solid rgba(239,68,68,.30)",
                        color: "#F8FAFC",
                        borderRadius: 1.5,
                        backdropFilter: "blur(18px)"
                    }
                }}>

                <DialogTitle
                    sx={{
                        color: "#F8FAFC",
                        fontWeight: 700
                    }}
                >
                    🗑 Delete Video
                </DialogTitle>

                <DialogContent>

                    <Typography>

                        Are you sure you want to permanently delete

                    </Typography>

                    <Typography
                        sx={{
                            mt: 2,
                            fontWeight: 700,
                            color: "#F87171"
                        }}
                    >
                        {videoToDelete?.original_filename}
                    </Typography>

                    <Typography
                        sx={{
                            mt: 3,
                            color: "#94A3B8",
                            fontSize: 14
                        }}
                    >
                        This will permanently remove:
                    </Typography>

                    <Box
                        sx={{
                            mt: 1,
                            color: "#CBD5E1",
                            fontSize: 14
                        }}
                    >
                        • Uploaded video<br />
                        • Transcript<br />
                        • Transcript segments<br />
                        • Transcript chunks
                    </Box>

                </DialogContent>

                <DialogActions>

                    <Button
                        onClick={() => setDeleteDialogOpen(false)}
                        sx={{ borderRadius: 1 }}
                    >
                        Cancel
                    </Button>

                    <Button
                        color="error"
                        variant="contained"
                        disabled={deleting}
                        onClick={confirmDelete}
                        sx={{ borderRadius: 1 }}
                    >
                        {

                            deleting

                                ? "Deleting..."

                                : "Delete"

                        }

                    </Button>

                </DialogActions>
            </Dialog>

        </>

    );

}