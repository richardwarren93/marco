"use client";

/* The toast stack's visuals, split out of ToastProvider so that `motion`
 * stops shipping on every page.
 *
 * ToastProvider sits in the root layout, which meant its `motion` import put
 * the whole animation engine (~133 KB decoded) into the shared chunk for
 * every route — including the signed-out landing page, which has no toasts
 * and no animation at all. The provider now holds only state and context;
 * this file holds everything that touches motion, and ToastProvider loads it
 * with next/dynamic the first time a toast actually exists.
 *
 * The animation itself is unchanged — same springs, same exit, same layout
 * transition. The only difference is when the code arrives. */

import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { SPRING_STICKER } from "@/lib/motion";
import { BUTTER, DISPLAY, INK, LIME, PAPER, TOMATO } from "@/lib/theme";

export type ToastVariant = "success" | "badge" | "info";

export interface ToastItem {
  id: number;
  message: string;
  icon?: string;
  variant: ToastVariant;
  duration: number;
  exiting?: boolean;
  action?: { label: string; onClick: () => void };
}

const DISP = DISPLAY;

export default function ToastLayer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  return (
    // Honours the phone's Reduce Motion setting. This used to be a
    // MotionConfig in Providers, wrapping the whole app; it belongs with the
    // animations instead of above everything that never animates.
    <MotionConfig reducedMotion="user">
      <div className="fixed left-1/2 -translate-x-1/2 z-[100] flex flex-col-reverse items-center gap-2.5 pointer-events-none w-[calc(100%-2rem)] max-w-sm" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 104px)" }} aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.filter((t) => !t.exiting).map((toast, i) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.9, rotate: 0 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: i % 2 ? 1 : -1 }}
              exit={{ opacity: 0, y: 10, scale: 0.94, transition: { duration: 0.16 } }}
              transition={SPRING_STICKER}
              onClick={toast.action ? undefined : () => onDismiss(toast.id)}
              className="pointer-events-auto w-full flex items-center gap-3"
              style={{ background: toast.variant === "badge" ? BUTTER : PAPER, border: `2.5px solid ${INK}`, borderRadius: 16, padding: "11px 14px", boxShadow: `3px 4px 0 ${INK}`, color: INK }}
            >
              <span className="text-base flex-shrink-0" aria-hidden>{toast.icon ?? <DefaultIcon variant={toast.variant} />}</span>
              <span className="flex-1 leading-snug line-clamp-2" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14.5 }}>
                {toast.message}
              </span>
              {toast.action && (
                <button
                  onClick={() => { toast.action!.onClick(); onDismiss(toast.id); }}
                  className="whitespace-nowrap ml-1 active:scale-95 transition-transform touch-manipulation"
                  style={{ minHeight: 44, minWidth: 44, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DISP, fontWeight: 700, fontSize: 14, color: PAPER, background: TOMATO, border: `2px solid ${INK}`, borderRadius: 11, padding: "0 12px" }}
                >
                  {toast.action.label}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

function DefaultIcon({ variant }: { variant: ToastVariant }) {
  if (variant === "badge") return <span className="text-lg">🏆</span>;
  return (
    <span className="flex items-center justify-center" style={{ width: 26, height: 26, borderRadius: 99, background: variant === "success" ? LIME : BUTTER, border: `2px solid ${INK}` }}>
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={INK} strokeWidth={3}>
        {variant === "success"
          ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          : <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 4h.01" />}
      </svg>
    </span>
  );
}
