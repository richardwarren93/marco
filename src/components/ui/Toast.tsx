"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

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
    }, 400);
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

      {/* Toast container — fixed bottom center, above tab bar */}
      {toasts.length > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] flex flex-col-reverse items-center gap-2.5 pointer-events-none w-[calc(100%-2rem)] max-w-sm">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              onClick={toast.action ? undefined : () => removeToast(toast.id)}
              className={`pointer-events-auto w-full px-4 py-3.5 rounded-2xl flex items-center gap-3 transition-all duration-400 ${
                toast.exiting
                  ? "opacity-0 translate-y-3 scale-95"
                  : "opacity-100 translate-y-0 scale-100 animate-toast-in"
              } ${variantClass(toast.variant)}`}
              style={variantStyle(toast.variant)}
            >
              {toast.icon && (
                <span className="text-base flex-shrink-0">{toast.icon}</span>
              )}
              <span className="flex-1 text-[13px] font-medium leading-snug line-clamp-2">
                {toast.message}
              </span>
              {toast.action && (
                <button
                  onClick={() => { toast.action!.onClick(); removeToast(toast.id); }}
                  className="text-orange-600 font-bold text-sm whitespace-nowrap ml-2 px-3 py-2 -my-1 rounded-xl active:bg-orange-50 transition-colors touch-manipulation"
                  style={{ minHeight: 44, minWidth: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  {toast.action.label}
                </button>
              )}
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
    return { showToast: () => {} };
  }
  return ctx;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function variantClass(variant: ToastVariant): string {
  switch (variant) {
    case "success":
      return "bg-white/95 backdrop-blur-xl border border-gray-100/80";
    case "badge":
      return "bg-gradient-to-r from-amber-50/95 to-orange-50/95 backdrop-blur-xl border border-amber-200/60";
    case "info":
      return "bg-white/95 backdrop-blur-xl border border-gray-100/80";
  }
}

function variantStyle(variant: ToastVariant): React.CSSProperties {
  const base: React.CSSProperties = {
    boxShadow: "0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
  };
  if (variant === "badge") {
    base.boxShadow = "0 8px 32px rgba(234,88,12,0.10), 0 2px 8px rgba(0,0,0,0.04)";
  }
  return base;
}

function DefaultIcon({ variant }: { variant: ToastVariant }) {
  switch (variant) {
    case "success":
      return (
        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center flex-shrink-0"
          style={{ boxShadow: "0 2px 8px rgba(232,83,10,0.3)" }}
        >
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      );
    case "badge":
      return <span className="text-lg flex-shrink-0">🏆</span>;
    case "info":
      return (
        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center flex-shrink-0"
          style={{ boxShadow: "0 2px 8px rgba(234,88,12,0.25)" }}
        >
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 4h.01" />
          </svg>
        </span>
      );
  }
}
