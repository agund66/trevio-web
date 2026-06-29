"use client";

import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg" | "xl";

const iconSizes: Record<LogoSize, number> = {
  sm: 28,
  md: 36,
  lg: 48,
  xl: 80,
};

const textSizes: Record<LogoSize, string> = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-4xl",
};

interface TrevioLogoProps {
  size?: LogoSize;
  showText?: boolean;
  variant?: "default" | "light";
  className?: string;
}

export function TrevioLogo({
  size = "md",
  showText = true,
  variant = "default",
  className,
}: TrevioLogoProps) {
  const iconSize = iconSizes[size];
  const textColor = variant === "light" ? "text-white" : "text-trevio-600";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <TrevioIcon size={iconSize} />
      {showText && (
        <span className={cn("font-bold tracking-tight", textSizes[size], textColor)}>
          Trevio
        </span>
      )}
    </div>
  );
}

export function TrevioIcon({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Trevio"
    >
      <defs>
        <linearGradient id="trevioGradIcon" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2dd4bf" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#trevioGradIcon)" />
      <rect x="96" y="128" width="128" height="56" rx="28" fill="#ffffff" />
      <rect x="288" y="128" width="128" height="56" rx="28" fill="#ffffff" />
      <rect x="232" y="128" width="48" height="260" rx="24" fill="#ffffff" />
      <path d="M256 128 L288 156 L256 184 L224 156 Z" fill="#ffffff" />
    </svg>
  );
}
