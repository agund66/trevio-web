"use client";

import { ReactNode, useRef, useState, useCallback } from "react";
import { Trash2 } from "lucide-react";

interface SwipeToDeleteProps {
  children: ReactNode;
  onDelete: () => void;
  /** Threshold in px to trigger delete (default 100) */
  threshold?: number;
  /** When false, swipe is disabled (no touch handlers). Default true. */
  enabled?: boolean;
}

/**
 * Swipe-to-delete wrapper for touch devices.
 * Swipe left to reveal a delete action. On desktop, no effect.
 */
export function SwipeToDelete({ children, onDelete, threshold = 100, enabled = true }: SwipeToDeleteProps) {
  const [translateX, setTranslateX] = useState(0);
  const [showDelete, setShowDelete] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const swipingRef = useRef(false);
  const horizontalRef = useRef<boolean | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    swipingRef.current = true;
    horizontalRef.current = null;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipingRef.current) return;
    const deltaX = e.touches[0].clientX - startXRef.current;
    const deltaY = e.touches[0].clientY - startYRef.current;

    // Determine if this is a horizontal or vertical swipe
    if (horizontalRef.current === null) {
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        horizontalRef.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }

    if (horizontalRef.current === true) {
      // Only allow leftward swipe
      const clamped = Math.max(Math.min(deltaX, 0), -threshold * 1.5);
      setTranslateX(clamped);
      setShowDelete(clamped < -threshold / 2);
    }
  }, [threshold]);

  const onTouchEnd = useCallback(() => {
    if (!swipingRef.current) return;
    swipingRef.current = false;

    if (translateX <= -threshold) {
      // Trigger delete
      setTranslateX(-threshold);
      onDelete();
    } else {
      setTranslateX(0);
      setShowDelete(false);
    }
  }, [translateX, threshold, onDelete]);

  return (
    <div className="relative overflow-hidden">
      {/* Delete background */}
      {showDelete && (
        <div className="absolute inset-0 flex items-center justify-end bg-red-500 px-4">
          <Trash2 className="h-5 w-5 text-white" />
        </div>
      )}
      <div
        onTouchStart={enabled ? onTouchStart : undefined}
        onTouchMove={enabled ? onTouchMove : undefined}
        onTouchEnd={enabled ? onTouchEnd : undefined}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: swipingRef.current ? "none" : "transform 0.2s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
