"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { pageTransition } from "@/lib/utils/animations";

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Wraps page content with a fade+slide entrance animation.
 * Uses AnimatePresence with pathname key so exit animations play
 * when navigating between routes.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const reduceMotion = useReducedMotion();
  const pathname = usePathname();

  if (reduceMotion) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        variants={pageTransition}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
