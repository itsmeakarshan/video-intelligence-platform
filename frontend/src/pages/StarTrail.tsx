import { useEffect, useRef } from "react";

interface Particle {
    x: number;
    y: number;
    size: number;
    speedX: number;
    speedY: number;
    color: string;
    alpha: number;
    rotation: number;
    rotationSpeed: number;
}

export default function StarTrail() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];

        // Teal, Emerald, and Sky Blue colors to match the new theme
        const colors = ["#14b8a6", "#10b981", "#0ea5e9", "#2dd4bf", "#ffffff"];

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        const drawStar = (
            cx: number,
            cy: number,
            spikes: number,
            outerRadius: number,
            innerRadius: number,
            color: string,
            alpha: number,
            rotation: number
        ) => {
            ctx.save();
            ctx.beginPath();
            ctx.translate(cx, cy);
            ctx.rotate((rotation * Math.PI) / 180);
            
            let rot = (Math.PI / 2) * 3;
            let x = cx;
            let y = cy;
            const step = Math.PI / spikes;

            ctx.moveTo(0, -outerRadius);
            for (let i = 0; i < spikes; i++) {
                x = Math.cos(rot) * outerRadius;
                y = Math.sin(rot) * outerRadius;
                ctx.lineTo(x, y);
                rot += step;

                x = Math.cos(rot) * innerRadius;
                y = Math.sin(rot) * innerRadius;
                ctx.lineTo(x, y);
                rot += step;
            }
            ctx.lineTo(0, -outerRadius);
            ctx.closePath();

            ctx.fillStyle = color;
            ctx.globalAlpha = alpha;
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.restore();
        };

        const handleMouseMove = (e: MouseEvent) => {
            // Spawn 2 stars per cursor move to create a smooth trail
            for (let i = 0; i < 2; i++) {
                particles.push({
                    x: e.clientX,
                    y: e.clientY,
                    size: Math.random() * 5 + 3, // Random size between 3 and 8
                    speedX: (Math.random() - 0.5) * 1.5,
                    speedY: (Math.random() - 0.5) * 1.5 - 0.5, // Slight upward drift
                    color: colors[Math.floor(Math.random() * colors.length)],
                    alpha: 1,
                    rotation: Math.random() * 360,
                    rotationSpeed: (Math.random() - 0.5) * 4
                });
            }
        };

        window.addEventListener("mousemove", handleMouseMove);

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.x += p.speedX;
                p.y += p.speedY;
                p.alpha -= 0.025; // Fade out speed
                p.rotation += p.rotationSpeed;

                if (p.alpha <= 0) {
                    particles.splice(i, 1);
                    i--;
                    continue;
                }

                drawStar(p.x, p.y, 4, p.size, p.size / 2.5, p.color, p.alpha, p.rotation); // 4 spikes for a tech/diamond star look
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener("resize", resizeCanvas);
            window.removeEventListener("mousemove", handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                pointerEvents: "none", // Ensures mouse clicks pass through to dashboard components
                zIndex: 9999
            }}
        />
    );
}