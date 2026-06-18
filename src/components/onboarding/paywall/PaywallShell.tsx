"use client";

// Shared frame for the Marco Plus upsell screens. Reskinned to match the
// guided onboarding flow: cream surface, the Marco wordmark, a small mono
// eyebrow (e.g. "PLUS · STEP 1 OF 4"), an optional soft-exit X, and a pinned
// footer. Each Plus screen owns its own body layout; this just provides chrome.

import type { ReactNode } from "react";

interface Props {
  /** Small mono eyebrow, e.g. "PLUS". */
  eyebrow?: string;
  /** Second eyebrow segment after a dot, e.g. "STEP 1 OF 4". */
  eyebrowAside?: string;
  /** Show the soft-exit X (top-right). */
  onClose?: () => void;
  footer?: ReactNode;
  children: ReactNode;
}

export default function PaywallShell({ eyebrow, eyebrowAside, onClose, footer, children }: Props) {
  return (
    <div className="flex flex-col" style={{ background: "#F5EEE2", minHeight: "100dvh" }}>
      {/* Logo */}
      <div
        className="relative flex justify-center flex-shrink-0"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.25rem)" }}
      >
        <span className="marco-signature" style={{ fontSize: "2rem" }}>
          Marco
        </span>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Maybe later"
            className="absolute right-4 top-1/2 w-8 h-8 flex items-center justify-center rounded-full active:scale-95 transition-transform"
            style={{ color: "rgba(28,26,23,0.4)", marginTop: "calc(env(safe-area-inset-top, 0px) / 2)" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Eyebrow */}
      {(eyebrow || eyebrowAside) && (
        <div
          className="flex items-center justify-center gap-2.5 pt-4 flex-shrink-0"
          style={{
            fontFamily: "var(--font-mono, ui-monospace)",
            fontSize: "9px",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "var(--ink-soft, #4A4742)",
          }}
        >
          {eyebrow && <span>{eyebrow}</span>}
          {eyebrowAside && (
            <>
              <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--tomato, #E5462E)" }} />
              <span>{eyebrowAside}</span>
            </>
          )}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 pt-2">{children}</div>

      {/* Pinned footer */}
      {footer && (
        <div className="px-6 pb-8 pt-3 flex-shrink-0 max-w-sm mx-auto w-full">{footer}</div>
      )}
    </div>
  );
}

/** Big primary CTA — tomato fill (the "Start for $0.00" button). */
export function PlusPrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-4 px-4 text-white rounded-2xl font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
      style={{ background: "var(--tomato, #E5462E)", fontSize: "16px", boxShadow: "0 6px 18px rgba(229,70,46,0.28)" }}
    >
      {children}
    </button>
  );
}
