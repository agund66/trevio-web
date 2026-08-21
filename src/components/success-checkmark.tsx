"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

interface SuccessCheckmarkProps {
  visible: boolean;
  size?: number;
  onComplete?: () => void;
}

/**
 * Animated success checkmark — a green circle scales in with a spring,
 * then a white checkmark draws on top. Auto-calls `onComplete` after
 * the animation finishes (~1.2s).
 */
export function SuccessCheckmark({ visible, size = 80, onComplete }: SuccessCheckmarkProps) {
  return (
    <AnimatePresence
      onExitComplete={onComplete}
    >
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          {/* Green circle */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="absolute rounded-full bg-emerald-500"
            style={{ width: size, height: size }}
          />
          {/* Checkmark icon */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 500, damping: 12 }}
          >
            <Check
              className="text-white"
              style={{ width: size * 0.5, height: size * 0.5 }}
              strokeWidth={3}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
