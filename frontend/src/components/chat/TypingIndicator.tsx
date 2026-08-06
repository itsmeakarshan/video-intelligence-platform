import {
    Avatar,
    Box,
    CircularProgress,
    Paper,
    Typography
} from "@mui/material";

import SmartToyIcon from "@mui/icons-material/SmartToy";

export default function TypingIndicator() {

    return (

        <Box
            sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 2,
                mb: 3
            }}
        >

            <Avatar
                sx={{
                    bgcolor: "#2563EB"
                }}
            >
                <SmartToyIcon />
            </Avatar>

            <Paper
                sx={{
                    p: 2,
                    borderRadius: 4,
                    border: "1px solid #E5E7EB",
                    display: "flex",
                    alignItems: "center",
                    gap: 2
                }}
            >

                <CircularProgress size={18} />

                <Typography
                    sx={{
                        color: "#6B7280"
                    }}
                >
                    AI is thinking...
                </Typography>

            </Paper>

        </Box>

    );

}