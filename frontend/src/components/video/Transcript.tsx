import { useEffect, useMemo, useRef, useState } from "react";
import {
    Box,
    Chip,
    Divider,
    IconButton,
    InputAdornment,
    List,
    Paper,
    Stack,
    TextField,
    Tooltip,
    Typography
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import toast from "react-hot-toast";

interface Segment {
    segment_index: number;
    start_time: number;
    end_time: number;
    text: string;
}

interface Props {
    segments: Segment[];
    onSeek: (time: number) => void;
}

function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds
        .toString()
        .padStart(2, "0")}`;
}

export default function Transcript({
    segments,
    onSeek
}: Props) {
    const [search, setSearch] = useState("");
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const filteredSegments = useMemo(() => {
        if (!search.trim()) {
            return segments;
        }
        return segments.filter(segment =>
            segment.text
                .toLowerCase()
                .includes(search.toLowerCase())
        );
    }, [segments, search]);

    async function copyTranscript() {
        try {
            const text = filteredSegments
                .map(segment => segment.text)
                .join("\n");
            await navigator.clipboard.writeText(text);
            toast.success("Transcript copied");
        } catch {
            toast.error("Unable to copy transcript");
        }
    }

    useEffect(() => {
        if (activeIndex === null) return;
        const element = document.getElementById(
            `segment-${activeIndex}`
        );
        element?.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }, [activeIndex]);

    return (
        <Paper
            elevation={0}
            sx={{
                height: 620,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                borderRadius: 5,
                background:
                    "rgba(255,255,255,.72)",
                backdropFilter: "blur(20px)",
                border:
                    "1px solid rgba(255,255,255,.55)",
                boxShadow:
                    "0 20px 60px rgba(0,0,0,.08)"
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    p: 3,
                    pb: 2
                }}
            >
                <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                >
                    <Box>
                        <Typography
                            variant="h5"
                            sx={{
                                fontWeight: 800
                            }}
                        >
                            📝 Transcript
                        </Typography>
                        <Typography
                            sx={{
                                color: "#64748B",
                                mt: .5
                            }}
                        >
                            Click any sentence to jump the video.
                        </Typography>
                    </Box>
                    <Tooltip title="Copy Transcript">
                        <IconButton
                            onClick={copyTranscript}
                        >
                            <ContentCopyRoundedIcon />
                        </IconButton>
                    </Tooltip>
                </Stack>
                <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{
                        mt: 2
                    }}
                >
                    <Chip
                        icon={
                            <ArticleRoundedIcon />
                        }
                        label={`${segments.length} Segments`}
                        color="primary"
                        variant="outlined"
                    />
                    <Chip
                        icon={
                            <AccessTimeRoundedIcon />
                        }
                        label={
                            segments.length > 0
                                ? formatTime(
                                    segments[
                                        segments.length - 1
                                    ].end_time
                                )
                                : "00:00"
                        }
                        color="secondary"
                        variant="outlined"
                    />
                </Stack>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Search transcript..."
                    value={search}
                    onChange={event =>
                        setSearch(event.target.value)
                    }
                    sx={{
                        mt: 3
                    }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment
                                position="start"
                            >
                                <SearchRoundedIcon />
                            </InputAdornment>
                        )
                    }}
                />
            </Box>
            <Divider />
            <Box
                ref={listRef}
                sx={{
                    flex: 1,
                    overflowY: "auto",
                    p: 2,

                    "&::-webkit-scrollbar": {
                        width: 8
                    },

                    "&::-webkit-scrollbar-track": {
                        background: "transparent"
                    },

                    "&::-webkit-scrollbar-thumb": {
                        background: "#CBD5E1",
                        borderRadius: 20
                    },

                    "&::-webkit-scrollbar-thumb:hover": {
                        background: "#94A3B8"
                    }
                }}
            >
                <List disablePadding>
                    {
                        filteredSegments.length === 0 && (
                            <Box
                                sx={{
                                    py: 8,
                                    textAlign: "center",
                                    color: "#64748B"
                                }}
                            >
                                <Typography
                                    variant="h6"
                                    sx={{
                                        fontWeight: 700,
                                        mb: 1
                                    }}
                                >
                                    No matching transcript
                                </Typography>
                                <Typography>
                                    Try another search keyword.
                                </Typography>
                            </Box>
                        )
                    }
                    {
                        filteredSegments.map((segment) => {
                            const active =
                                activeIndex === segment.segment_index;
                            return (
                                <Paper
                                    id={`segment-${segment.segment_index}`}
                                    key={segment.segment_index}
                                    elevation={0}
                                    onClick={() => {
                                        setActiveIndex(segment.segment_index);
                                        onSeek(segment.start_time);
                                        toast.success(
                                            `Jumped to ${formatTime(segment.start_time)}`
                                        );
                                    }}
                                    sx={{
                                        mb: 1.5,
                                        p: 2,
                                        borderRadius: 4,
                                        cursor: "pointer",
                                        transition:
                                            "all .25s ease",
                                        background: active
                                            ? "linear-gradient(135deg,#EEF2FF,#E0E7FF)"
                                            : "#FFFFFF",
                                        border: active
                                            ? "2px solid #6366F1"
                                            : "1px solid #E5E7EB",
                                        boxShadow: active
                                            ? "0 12px 35px rgba(99,102,241,.18)"
                                            : "0 3px 12px rgba(0,0,0,.05)",
                                        "&:hover": {
                                            transform:
                                                "translateX(6px)",
                                            boxShadow:
                                                "0 10px 25px rgba(0,0,0,.08)",
                                            borderColor:
                                                "#6366F1"
                                        }
                                    }}
                                >
                                    <Stack
                                        direction="row"
                                        spacing={2}
                                        alignItems="flex-start"
                                    >
                                        <Chip
                                            label={
                                                formatTime(
                                                    segment.start_time
                                                )
                                            }
                                            color={
                                                active
                                                    ? "primary"
                                                    : "default"
                                            }
                                            sx={{
                                                minWidth: 70,
                                                fontWeight: 700,
                                                mt: .5
                                            }}
                                        />
                                        <Box
                                            sx={{
                                                flex: 1
                                            }}
                                        >
                                            <Typography
                                                sx={{
                                                    lineHeight: 1.8,
                                                    color: "#111827",
                                                    fontWeight: active
                                                        ? 700
                                                        : 500
                                                }}
                                            >
                                                {segment.text}
                                            </Typography>
                                            <Typography
                                                sx={{
                                                    mt: 1,
                                                    fontSize: 13,
                                                    color: "#94A3B8"
                                                }}
                                            >
                                                Segment #
                                                {
                                                    segment.segment_index + 1
                                                }
                                                {" • "}
                                                Ends at
                                                {" "}
                                                {
                                                    formatTime(
                                                        segment.end_time
                                                    )
                                                }
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </Paper>
                            );
                        })
                    }
                    <Box
                        sx={{
                            height: 20
                        }}
                    />
                </List>
            </Box>
        </Paper>
    );
}