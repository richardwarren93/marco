"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SPRING_STICKER } from "@/lib/motion";

// ─── Types ───────────────────────────────────────────────────────────────────
type ToastVariant = "success" | "badge" | "info";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: number;
  message: string;
  icon?: string;
  variant: ToastVariant;
  duration: number;
  exiting?: boolean;
  action?: ToastAction;
}

interface ToastOptions {
  icon?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: ToastAction;
}

interface ToastContextValue {
  showToast: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

// ─── Provider ────────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<number, NodeJS.Timeout>>(new Map());

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const showToast = useCallback(
    (message: string, options?: ToastOptions) => {
      const id = nextId++;
      // Toasts with actions get more time (5s) so user can read + tap
      const defaultDuration = options?.action ? 5000 : 3000;
      const toast: Toast = {
        id,
        message,
        icon: options?.icon,
        variant: options?.variant ?? "success",
        duration: options?.duration ?? defaultDuration,
        action: options?.action,
      };

      setToasts((prev) => {
        const next = prev.length >= 2 ? prev.slice(1) : prev;
        return [...next, toast];
      });

      const timer = setTimeout(() => {
        removeToast(id);
        timers.current.delete(id);
      }, toast.duration);
      timers.current.set(id, timer);
    },
    [removeToast],
  );

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toasts — stickers that slap on above the dock, then peel away */}
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
              onClick={toast.action ? undefined : () => removeToast(toast.id)}
              className="pointer-events-auto w-full flex items-center gap-3"
              style={{ background: toast.variant === "badge" ? BUTTER : PAPER, border: `2.5px solid ${INK}`, borderRadius: 16, padding: "11px 14px", boxShadow: `3px 4px 0 ${INK}`, color: INK }}
            >
              <span className="text-base flex-shrink-0" aria-hidden>{toast.icon ?? <DefaultIcon variant={toast.variant} />}</span>
              <span className="flex-1 leading-snug line-clamp-2" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14.5 }}>
                {toast.message}
              </span>
              {toast.action && (
                <button
                  onClick={() => { toast.action!.onClick(); removeToast(toast.id); }}
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
    </ToastContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return { showToast: () => {} };
  }
  return ctx;
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const LIME = "#C4EE45";
const BUTTER = "#FFD84D";
const DISP = '"Marker Felt", Georgia, serif';

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
