"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { ToastItem, ToastVariant } from "./ToastLayer";

/* State and context only — deliberately no `motion` import.
 *
 * ToastProvider is mounted by the root layout, so anything it imports ships
 * on every route. The animated stack lives in ToastLayer and arrives the
 * first time there is actually a toast to show. */
const ToastLayer = dynamic(() => import("./ToastLayer"), { ssr: false });

// ─── Types ───────────────────────────────────────────────────────────────────
interface ToastAction {
  label: string;
  onClick: () => void;
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
  const [toasts, setToasts] = useState<ToastItem[]>([]);
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
      const toast: ToastItem = {
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

  /* Warm the animation chunk once the page is idle. Without this the first
     toast of a session waits for the chunk to arrive before it can appear —
     about a second, measured — which is the wrong behaviour for something
     whose whole job is to confirm an action immediately.

     Not on the signed-out and full-screen flows: nothing there raises a
     toast, and those are exactly the screens where a first-time visitor on
     cellular is paying for every byte. */
  const pathname = usePathname() || "";
  const mayToast = !["/auth", "/connect", "/onboarding", "/join", "/login"].some((p) => pathname.startsWith(p));
  useEffect(() => {
    if (!mayToast) return;
    const warm = () => { void import("./ToastLayer"); };
    const w = window as typeof window & { requestIdleCallback?: (cb: () => void) => number };
    if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(warm);
    else setTimeout(warm, 2000);
  }, [mayToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Mounted while any toast exists — including one that is on its way
          out, so AnimatePresence still gets to play the exit. */}
      {toasts.length > 0 && <ToastLayer toasts={toasts} onDismiss={removeToast} />}
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
