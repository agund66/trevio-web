import type { Variants, Transition } from "framer-motion";

// ─── Shared Animation Variants ────────────────────────────────────

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 20 },
  },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0 },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0 },
};

// ─── Container Variants (for staggered children) ──────────────────

export const staggerContainer = (stagger: number = 0.04, delay: number = 0): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: stagger,
      delayChildren: delay,
      // Cap total stagger time so long lists don't take too long
      // Framer Motion handles this by staggering only visible children
    },
  },
});

export const staggerFast: Variants = staggerContainer(0.04);
export const staggerMedium: Variants = staggerContainer(0.06);
export const staggerSlow: Variants = staggerContainer(0.1);

// ─── Item Variants (for use inside stagger containers) ────────────

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const staggerItemScale: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 25 },
  },
};

// ─── Page Transition Variants ─────────────────────────────────────

export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] },
  },
};

// ─── Tab Transition Variants ──────────────────────────────────────

export const tabTransition: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.25, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

// ─── Dialog/Modal Variants ────────────────────────────────────────

export const dialogBackdrop: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const dialogPanel: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 28 },
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.97,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

export const bottomSheetPanel: Variants = {
  hidden: { y: "100%" },
  visible: {
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 30 },
  },
  exit: {
    y: "100%",
    transition: { duration: 0.25, ease: "easeIn" },
  },
};

// ─── Common Transitions ───────────────────────────────────────────

export const springTransition: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 25,
};

export const smoothTransition: Transition = {
  duration: 0.3,
  ease: [0.25, 0.1, 0.25, 1],
};

// ─── Viewport Options (for whileInView) ───────────────────────────

export const viewportOnce = { once: true, margin: "-40px" };
export const viewportOnceEarly = { once: true, margin: "-80px" };
