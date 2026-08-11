import React, { useEffect, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";

export default function DraggableRobot() {
    // Default position: bottom-right of screen
    const [position, setPosition] = useState({
        x: typeof window !== "undefined" ? window.innerWidth - 130 : 500,
        y: typeof window !== "undefined" ? window.innerHeight - 150 : 500
    });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [showSpeech, setShowSpeech] = useState(true);

    const robotRef = useRef<HTMLDivElement>(null);

    // Keep robot in bounds on window resize
    useEffect(() => {
        function handleResize() {
            setPosition(prev => ({
                x: Math.min(prev.x, window.innerWidth - 120),
                y: Math.min(prev.y, window.innerHeight - 120)
            }));
        }
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Drag handlers (Mouse & Touch)
    function handleStart(clientX: number, clientY: number) {
        setIsDragging(true);
        setDragStart({
            x: clientX - position.x,
            y: clientY - position.y
        });
    }

    function handleMouseDown(e: React.MouseEvent) {
        e.preventDefault();
        handleStart(e.clientX, e.clientY);
    }

    function handleTouchStart(e: React.TouchEvent) {
        if (e.touches.length > 0) {
            handleStart(e.touches[0].clientX, e.touches[0].clientY);
        }
    }

    useEffect(() => {
        function handleMove(clientX: number, clientY: number) {
            if (!isDragging) return;

            const robotWidth = 110;
            const robotHeight = 110;

            const newX = Math.max(10, Math.min(clientX - dragStart.x, window.innerWidth - robotWidth));
            const newY = Math.max(10, Math.min(clientY - dragStart.y, window.innerHeight - robotHeight));

            setPosition({ x: newX, y: newY });
        }

        function handleMouseMove(e: MouseEvent) {
            handleMove(e.clientX, e.clientY);
        }

        function handleTouchMove(e: TouchEvent) {
            if (e.touches.length > 0) {
                handleMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        }

        function handleEnd() {
            setIsDragging(false);
        }

        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleEnd);
            window.addEventListener("touchmove", handleTouchMove);
            window.addEventListener("touchend", handleEnd);
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleEnd);
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("touchend", handleEnd);
        };
    }, [isDragging, dragStart]);

    return (
        <Box
            ref={robotRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            sx={{
                position: "fixed",
                left: `${position.x}px`,
                top: `${position.y}px`,
                zIndex: 9999,
                cursor: isDragging ? "grabbing" : "grab",
                userSelect: "none",
                touchAction: "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                transition: isDragging ? "none" : "transform 0.2s ease, filter 0.2s ease"
            }}
        >
            {/* Speech Bubble */}
            {showSpeech && (
                <Box
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowSpeech(false);
                    }}
                    sx={{
                        position: "absolute",
                        bottom: "105%",
                        bgcolor: "rgba(15, 23, 42, 0.9)",
                        color: "#F8FAFC",
                        px: 1.8,
                        py: 0.8,
                        borderRadius: "16px",
                        border: "1px solid rgba(56, 189, 248, 0.4)",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.5), 0 0 16px rgba(56, 189, 248, 0.25)",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        pointerEvents: "auto",
                        backdropFilter: "blur(8px)",
                        animation: "floatBubble 3s ease-in-out infinite",
                        "&::after": {
                            content: '""',
                            position: "absolute",
                            top: "100%",
                            left: "50%",
                            transform: "translateX(-50%)",
                            borderWidth: "6px",
                            borderStyle: "solid",
                            borderColor: "rgba(15, 23, 42, 0.9) transparent transparent transparent"
                        },
                        "@keyframes floatBubble": {
                            "0%, 100%": { transform: "translateY(0px)" },
                            "50%": { transform: "translateY(-4px)" }
                        }
                    }}
                >
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: "#38bdf8" }}>
                        AI Assistant 🤖
                    </Typography>
                    Drag me anywhere!
                </Box>
            )}

            {/* Draggable Robot PNG */}
            <Box
                component="img"
                src="/robot.png"
                alt="AI Robot Assistant"
                draggable={false}
                sx={{
                    width: { xs: 80, sm: 95 },
                    height: { xs: 80, sm: 95 },
                    objectFit: "contain",
                    pointerEvents: "none",
                    filter: isDragging
                        ? "drop-shadow(0 16px 32px rgba(56, 189, 248, 0.75)) scale(1.08)"
                        : "drop-shadow(0 8px 20px rgba(56, 189, 248, 0.4))",
                    animation: isDragging ? "none" : "hoverFloat 4s ease-in-out infinite",
                    "@keyframes hoverFloat": {
                        "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
                        "50%": { transform: "translateY(-8px) rotate(2deg)" }
                    }
                }}
            />
        </Box>
    );
}
