"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

/**
 * Animates a number from its previous value to the new value using
 * requestAnimationFrame with an ease-out curve. Handles currency
 * formatting and respects `prefers-reduced-motion`.
 */
export function AnimatedNumber({
  value,
  duration = 800,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValueRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Respect reduced motion — snap to value immediately
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayValue(value);
      previousValueRef.current = value;
      return;
    }

    const startValue = previousValueRef.current;
    const diff = value - startValue;
    if (diff === 0) return;

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + diff * eased;
      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        previousValueRef.current = value;
        setDisplayValue(value);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      previousValueRef.current = value;
    };
  }, [value, duration]);

  const formatted = displayValue.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
