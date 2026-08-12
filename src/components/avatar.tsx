"use client";

import { useState } from "react";
import Image from "next/image";

interface AvatarProps {
  photoURL?: string;
  displayName: string;
  className?: string;
  textClassName?: string;
}

export function Avatar({ photoURL, displayName, className = "h-9 w-9", textClassName = "text-sm" }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  if (photoURL && !imgError) {
    return (
      <Image
        src={photoURL}
        alt={displayName}
        width={40}
        height={40}
        className={`rounded-full shrink-0 ${className}`}
        referrerPolicy="no-referrer"
        unoptimized
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-trevio-100 dark:bg-trevio-800 font-semibold text-trevio-700 dark:text-trevio-200 shrink-0 ${className} ${textClassName}`}
    >
      {displayName.charAt(0).toUpperCase()}
    </div>
  );
}
