"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";
import { dialogBackdrop, dialogPanel } from "@/lib/utils/animations";

interface AnimatedDialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Disable backdrop click to close (e.g. for forced dialogs) */
  disableBackdropClose?: boolean;
  /** Max width class (default: max-w-lg) */
  maxWidth?: string;
}

/**
 * Reusable dialog wrapper with animated backdrop fade + panel slide-up/scale.
 * Replaces the common pattern of `fixed inset-0 z-50 flex items-center justify-center`.
 */
export function AnimatedDialog({
  open,
  onClose,
  children,
  disableBackdropClose = false,
  maxWidth = "max-w-lg",
}: AnimatedDialogProps) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            variants={dialogBackdrop}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !disableBackdropClose && onClose()}
          />
          <motion.div
            variants={reduceMotion ? undefined : dialogPanel}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`relative z-10 w-full ${maxWidth} max-h-[85vh] overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl`}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
