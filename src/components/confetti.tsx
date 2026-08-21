"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface ConfettiProps {
  /** Trigger confetti burst when this changes to true */
  fire: boolean;
  /** Number of particles (default 40) */
  count?: number;
  /** Duration in ms (default 3000) */
  duration?: number;
  /** Callback when confetti finishes */
  onComplete?: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  size: number;
  shape: "rect" | "circle";
}

const COLORS = [
  "#2dd4bf", // trevio-400
  "#0d9488", // trevio-600
  "#6366f1", // indigo-500
  "#f59e0b", // amber-500
  "#ec4899", // rose-500
  "#10b981", // emerald-500
  "#8b5cf6", // violet-500
  "#06b6d4", // cyan-500
];

/**
 * Lightweight confetti animation using canvas — no external libraries.
 * Renders a full-screen overlay that auto-removes after `duration` ms.
 * Respects `prefers-reduced-motion` (renders nothing).
 */
export function Confetti({ fire, count = 40, duration = 3000, onComplete }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [active, setActive] = useState(false);

  // Respect reduced motion
  const reduceMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (!fire || reduceMotion) {
      if (fire && onComplete) onComplete();
      return;
    }
    setActive(true);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.scale(dpr, dpr);

    const w = window.innerWidth;
    const h = window.innerHeight;

    // Initialize particles from top center area
    const particles: Particle[] = Array.from({ length: count }, () => {
      const angle = (Math.random() - 0.5) * Math.PI; // -90° ± 90°
      const speed = 6 + Math.random() * 8;
      return {
        x: w / 2 + (Math.random() - 0.5) * 100,
        y: h * 0.3 + (Math.random() - 0.5) * 50,
        vx: Math.cos(angle - Math.PI / 2) * speed,
        vy: Math.sin(angle - Math.PI / 2) * speed - 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 15,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 6 + Math.random() * 6,
        shape: Math.random() > 0.5 ? "rect" : "circle",
      };
    });

    const startTime = performance.now();
    const gravity = 0.3;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = elapsed / duration;

      ctx.clearRect(0, 0, w, h);

      particles.forEach((p) => {
        p.vy += gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        // Fade out in last 30% of duration
        const opacity = progress > 0.7 ? Math.max(0, 1 - (progress - 0.7) / 0.3) : 1;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = opacity;
        ctx.fillStyle = p.color;

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setActive(false);
        onComplete?.();
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [fire, count, duration, reduceMotion, onComplete]);

  if (!active || reduceMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[100]"
      aria-hidden="true"
    />
  );
}
