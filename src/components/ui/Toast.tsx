"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────
type ToastVariant = "success" | "badge" | "info";

interface Toast {
  id: number;
  message: string;
  icon?: string;
  variant: ToastVariant;
  duration: number;
  exiting?: boolean;
}

interface ToastOptions {
  icon?: string;
  variant?: ToastVariant;
  duration?: number;
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
    // Start exit animation
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    // Remove after animation
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const showToast = useCallback(
    (message: string, options?: ToastOptions) => {
      const id = nextId++;
      const toast: Toast = {
        id,
        message,
        icon: options?.icon,
        variant: options?.variant ?? "success",
        duration: options?.duration ?? 3000,
      };

      setToasts((prev) => {
        // Max 2 visible — remove oldest if needed
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

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timers.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container — fixed top center */}
      {toasts.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2.5 text-sm font-semibold transition-all duration-300 ${
                toast.exiting
                  ? "opacity-0 -translate-y-2"
                  : "opacity-100 translate-y-0 animate-toast-in"
              } ${variantStyles(toast.variant)}`}
              onClick={() => removeToast(toast.id)}
            >
              {toast.icon ? (
                <span className="text-base">{toast.icon}</span>
              ) : (
                defaultIcon(toast.variant)
              )}
              <span>{toast.message}</span>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Return a no-op if used outside provider (SSR safety)
    return { showToast: () => {} };
  }
  return ctx;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function variantStyles(variant: ToastVariant): string {
  switch (variant) {
    case "success":
      return "bg-white text-[#1a1410] border border-green-200";
    case "badge":
      return "bg-gradient-to-r from-amber-50 to-yellow-50 text-[#1a1410] border border-amber-200 shadow-amber-100/50";
    case "info":
      return "bg-white text-[#1a1410] border border-gray-200";
  }
}

function defaultIcon(variant: ToastVariant) {
  switch (variant) {
    case "success":
      return (
        <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      );
    case "badge":
      return <span className="text-base">🏆</span>;
    case "info":
      return (
        <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
          </svg>
        </span>
      );
  }
}
