"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { StoryChapter } from "./StoryChapter";

interface Chapter {
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  mockup: React.ReactNode;
}

interface StoryCarouselProps {
  chapters: Chapter[];
  intervalMs?: number;
}

export function StoryCarousel({ chapters, intervalMs = 5000 }: StoryCarouselProps) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchPauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goNext = useCallback(() => {
    setDirection(1);
    setIndex((prev) => (prev + 1) % chapters.length);
  }, [chapters.length]);

  useEffect(() => {
    if (reduceMotion || isPaused || chapters.length <= 1) return;
    timerRef.current = setTimeout(goNext, intervalMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [index, reduceMotion, isPaused, intervalMs, goNext, chapters.length]);

  // Cleanup touch pause timeout on unmount
  useEffect(() => {
    return () => {
      if (touchPauseTimeoutRef.current) clearTimeout(touchPauseTimeoutRef.current);
    };
  }, []);

  // Guard against empty chapters
  if (chapters.length === 0) {
    return <div className="relative w-full h-[300px] sm:h-[380px] md:h-[420px]" />;
  }

  // On touch, pause immediately but delay unpause to avoid rapid toggling during scroll
  const handleTouchStart = () => {
    if (touchPauseTimeoutRef.current) clearTimeout(touchPauseTimeoutRef.current);
    setIsPaused(true);
  };
  const handleTouchEnd = () => {
    if (touchPauseTimeoutRef.current) clearTimeout(touchPauseTimeoutRef.current);
    touchPauseTimeoutRef.current = setTimeout(() => setIsPaused(false), 2000);
  };

  return (
    <div
      className="relative w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Story viewport */}
      <div className="relative h-[300px] sm:h-[380px] md:h-[420px]">
        <AnimatePresence mode="wait" custom={direction}>
          <StoryChapter
            key={index}
            title={chapters[index].title}
            description={chapters[index].description}
            imageSrc={chapters[index].imageSrc}
            imageAlt={chapters[index].imageAlt}
            mockup={chapters[index].mockup}
            isActive={true}
            direction={direction}
          />
        </AnimatePresence>
      </div>

      {/* Progress bars */}
      <div className="mt-4 flex gap-1.5">
        {chapters.map((_, i) => (
          <div
            key={i}
            className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-700/60"
          >
            {i < index ? (
              /* Completed chapters — full */
              <div className="h-full w-full rounded-full bg-trevio-500" />
            ) : i === index ? (
              /* Current chapter — animate fill over interval */
              <motion.div
                className="h-full rounded-full bg-trevio-500"
                initial={{ width: "0%" }}
                animate={{ width: isPaused || reduceMotion ? "0%" : "100%" }}
                transition={{
                  duration: isPaused || reduceMotion ? 0 : intervalMs / 1000,
                  ease: "linear",
                }}
              />
            ) : (
              /* Upcoming chapters — empty */
              <div className="h-full w-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
