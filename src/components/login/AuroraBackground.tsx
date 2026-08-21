"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

export function AuroraBackground() {
  const reduceMotion = useReducedMotion();

  const blobs = useMemo(() => [
    {
      className: "bg-trevio-400/70 dark:bg-trevio-500/50",
      size: "w-[400px] h-[400px] sm:w-[500px] sm:h-[500px]",
      position: "top-[-10%] left-[-5%]",
      animation: reduceMotion ? undefined : { animate: { x: [0, 80, -40, 0], y: [0, -50, 60, 0], scale: [1, 1.1, 0.95, 1] } },
    },
    {
      className: "bg-indigo-400/60 dark:bg-indigo-600/40",
      size: "w-[350px] h-[350px] sm:w-[450px] sm:h-[450px]",
      position: "bottom-[-10%] right-[-5%]",
      animation: reduceMotion ? undefined : { animate: { x: [0, -60, 30, 0], y: [0, 40, -50, 0], scale: [1, 1.05, 1.1, 1] } },
    },
    {
      className: "bg-emerald-300/50 dark:bg-emerald-700/30",
      size: "w-[300px] h-[300px] sm:w-[400px] sm:h-[400px]",
      position: "top-[40%] left-[30%]",
      animation: reduceMotion ? undefined : { animate: { x: [0, 50, -70, 0], y: [0, 30, -40, 0], scale: [1, 1.15, 0.9, 1] } },
    },
    {
      className: "bg-cyan-300/40 dark:bg-cyan-800/25",
      size: "w-[250px] h-[250px] sm:w-[350px] sm:h-[350px]",
      position: "top-[10%] right-[20%]",
      animation: reduceMotion ? undefined : { animate: { x: [0, -40, 50, 0], y: [0, 60, -30, 0], scale: [1, 0.9, 1.1, 1] } },
    },
  ], [reduceMotion]);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* Aurora blobs */}
      {blobs.map((blob, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-[60px] sm:blur-[100px] ${blob.className} ${blob.size} ${blob.position}`}
          transition={{
            duration: 18 + i * 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          {...(blob.animation || {})}
        />
      ))}

      {/* Noise texture overlay for depth */}
      <div className="absolute inset-0 noise-overlay opacity-[0.03] dark:opacity-[0.05] pointer-events-none" />

      {/* Subtle vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10 dark:to-black/30 pointer-events-none" />
    </div>
  );
}
