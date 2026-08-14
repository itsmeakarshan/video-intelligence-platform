import {
    Box,
    Button,
    Paper,
    Typography,
    Container
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { useNavigate } from "react-router-dom";
import NotesComponent from "../components/notes/Notes";
import Navbar from "../components/layout/Navbar";

export default function Notes() {
    const navigate = useNavigate();

    return (
        <Box
            sx={{
                minHeight: "100vh",
                bgcolor: "#0F172A",
                color: "#F8FAFC",
                pb: 8
            }}
        >
            <Navbar />

            <Container
                maxWidth={false}
                sx={{
                    maxWidth: "2560px",
                    width: { xs: "96%", md: "88%", lg: "80%" },
                    mx: "auto",
                    px: { xs: 2, sm: 3, md: 4 },
                    pt: 4
                }}
            >
                <Button
                    startIcon={<ArrowBackRoundedIcon />}
                    variant="outlined"
                    onClick={() => navigate("/")}
                    sx={{
                        mb: 3,
                        borderColor: "#14B8A6",
                        color: "#14B8A6",
                        borderRadius: 2,
                        "&:hover": {
                            borderColor: "#10B981",
                            background: "rgba(20,184,166,.08)"
                        }
                    }}
                >
                    Back to Dashboard
                </Button>

                <Paper
                    sx={{
                        p: 4,
                        borderRadius: 4,
                        bgcolor: "rgba(15,23,42,.82)",
                        backdropFilter: "blur(20px)",
                        border: "1px solid rgba(20,184,166,.18)",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
                    }}
                >
                    <Typography
                        variant="h4"
                        sx={{
                            color: "#F8FAFC",
                            fontWeight: 700,
                            mb: 1
                        }}
                    >
                        📝 AI Notes
                    </Typography>

                    <Typography
                        sx={{
                            color: "#94A3B8",
                            mb: 4
                        }}
                    >
                        Generate detailed study notes from one or more processed videos.
                    </Typography>

                    <NotesComponent />
                </Paper>
            </Container>
        </Box>
    );
}