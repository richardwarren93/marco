"use client";

// One bottom sheet motion for the whole app: the scrim fades, the sheet springs
// up from the bottom edge, and on close it drops back down (instead of
// vanishing). Grab the handle and flick down to dismiss, like iOS.
// Accessible by default: focus moves into the sheet and back to whatever
// opened it, Escape closes it, and a screen-reader "Close" button is always
// there (some sheets have no visible close control).
// Reduced Motion is honoured globally by <MotionConfig reducedMotion="user">.

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { SPRING_SHEET } from "@/lib/motion";

const INK = "#171410";

export default function MotionSheet({
  open,
  onClose,
  label,
  children,
  z = 70,
  dismissable = true,
  className = "w-full sm:max-w-lg",
  style,
  scrim = "rgba(23,20,16,0.5)",
  showHandle = true,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
  z?: number;
  /** false while something is in flight — no tap-out, no swipe-down */
  dismissable?: boolean;
  className?: string;
  style?: React.CSSProperties;
  scrim?: string;
  /** false when the sheet draws its own handle — the grab area still works */
  showHandle?: boolean;
}) {
  const drag = useDragControls();
  const opener = useRef<HTMLElement | null>(null);

  // Remember what had focus when the sheet opened; Escape closes.
  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement as HTMLElement | null;
    if (!dismissable) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, dismissable, onClose]);

  return (
    <AnimatePresence onExitComplete={() => { opener.current?.focus?.({ preventScroll: true }); opener.current = null; }}>
      {open && (
        <motion.div
          key="sheet-scrim"
          className="fixed inset-0 flex items-end justify-center sm:items-center"
          style={{ zIndex: z, background: scrim }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          onClick={dismissable ? onClose : undefined}
        >
          <motion.div
            ref={(el: HTMLDivElement | null) => { if (el && !el.contains(document.activeElement)) el.focus({ preventScroll: true }); }}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            className={`relative ${className}`}
            style={{ outline: "none", ...style }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
            transition={SPRING_SHEET}
            drag={dismissable ? "y" : false}
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 650) onClose(); }}
            onClick={(e) => e.stopPropagation()}
          >
            {dismissable && <SrClose onClose={onClose} />}
            {dismissable && (
              // Narrow grab strip, centred — it never sits over a sheet's own
              // corner buttons (close, delete).
              <div
                aria-hidden
                onPointerDown={(e) => drag.start(e)}
                className="absolute top-0 flex justify-center"
                style={{ left: "50%", width: 120, marginLeft: -60, height: 22, touchAction: "none", cursor: "grab", zIndex: 1 }}
              >
                {showHandle && <span style={{ marginTop: 7, width: 40, height: 5, borderRadius: 99, background: INK, opacity: 0.25 }} />}
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Visually hidden until focused — the way out for VoiceOver and keyboards.
function SrClose({ onClose }: { onClose: () => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <button
      type="button"
      onClick={onClose}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={focused
        ? { position: "absolute", top: 8, left: 8, zIndex: 2, background: INK, color: "#FBF7EE", border: "none", borderRadius: 10, padding: "0 12px", minHeight: 44, fontWeight: 700 }
        : { position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 }}
    >
      Close
    </button>
  );
}

/** Keeps the last non-null value so a sheet can finish its exit animation
 *  after its subject (an item, a plan) has already been cleared by the parent. */
export function useLastDefined<T>(value: T | null | undefined): T | null {
  const [last, setLast] = useState<T | null>(value ?? null);
  if (value != null && value !== last) setLast(value);
  return value ?? last;
}
