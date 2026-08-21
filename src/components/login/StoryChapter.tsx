"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface StoryChapterProps {
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  mockup: ReactNode;
  isActive: boolean;
  direction: number;
}

export function StoryChapter({
  title,
  description,
  imageSrc,
  imageAlt,
  mockup,
  isActive,
  direction,
}: StoryChapterProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction > 0 ? 60 : -60 }}
      animate={{ opacity: isActive ? 1 : 0, x: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction > 0 ? -60 : 60 }}
      transition={{ type: "spring", stiffness: 200, damping: 26 }}
      className="absolute inset-0 flex flex-col"
    >
      {/* Image with Ken Burns parallax */}
      <div className="relative flex-1 overflow-hidden rounded-2xl">
        <motion.img
          src={imageSrc}
          alt={imageAlt}
          initial={reduceMotion ? {} : { scale: 1 }}
          animate={reduceMotion ? {} : { scale: 1.08, x: "-1%", y: "-1%" }}
          transition={reduceMotion ? {} : { duration: 6, ease: "easeOut" }}
          className="h-full w-full object-cover"
        />
        {/* Dark gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        {/* Floating mockup overlay — constrained to viewport width */}
        <motion.div
          initial={reduceMotion ? {} : { opacity: 0, y: 30 }}
          animate={{ opacity: isActive ? 1 : 0, y: 0 }}
          transition={{ type: "spring", stiffness: 150, damping: 20, delay: 0.3 }}
          className="absolute bottom-3 left-0 right-0 flex justify-center px-3"
        >
          <div className="w-full max-w-[280px] sm:max-w-xs">
            {mockup}
          </div>
        </motion.div>
      </div>

      {/* Chapter text — high contrast on both light/dark */}
      <div className="mt-4 px-2">
        <motion.h3
          initial={reduceMotion ? {} : { opacity: 0, y: 15 }}
          animate={{ opacity: isActive ? 1 : 0, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.15 }}
          className="text-base sm:text-lg font-bold text-slate-900 dark:text-white"
        >
          {title}
        </motion.h3>
        <motion.p
          initial={reduceMotion ? {} : { opacity: 0, y: 15 }}
          animate={{ opacity: isActive ? 1 : 0, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.25 }}
          className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed"
        >
          {description}
        </motion.p>
      </div>
    </motion.div>
  );
}
