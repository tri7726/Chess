import { useEffect, useRef } from "react";

interface ConfettiProps {
  trigger: number;
  duration?: number;
}

export function Confetti({ trigger, duration = 2500 }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (trigger === 0 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let animationFrameId: number;
    let startTime = performance.now();

    const particles: any[] = [];
    const colors = ["#22d3ee", "#818cf8", "#34d399", "#fbbf24", "#f87171", "#e879f9"];

    // Initialize 100 particles
    for (let i = 0; i < 150; i++) {
      particles.push({
        x: canvas.width / 2, // starts from center of screen
        y: canvas.height / 2,
        w: Math.random() * 8 + 4,
        h: Math.random() * 6 + 4,
        dx: Math.random() * 30 - 15,
        dy: Math.random() * -20 - 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.floor(Math.random() * 10) - 10,
        tiltAngle: 0,
        tiltAngleInc: (Math.random() * 0.07) + 0.05,
      });
    }

    const draw = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      if (elapsed > duration) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        window.removeEventListener("resize", resize);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Fade out effect in the second half of the animation
      const opacity = 1 - Math.max(0, (elapsed - duration * 0.5) / (duration * 0.5));
      ctx.globalAlpha = opacity;

      particles.forEach((p) => {
        p.tiltAngle += p.tiltAngleInc;
        // Float and gravity math
        p.y += (Math.cos(p.tiltAngle) + 1 + p.h / 2) / 2 + p.dy;
        p.x += Math.sin(p.tiltAngle) * 2 + p.dx;
        p.dy += 0.3; // gravity

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.tiltAngle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    animationFrameId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [trigger, duration]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[9999]"
    />
  );
}
