"use client";

// Shared cookbook-paper background for the Marco Plus upsell screens. Mirrors
// CookbookPage's paper/ribbon treatment so the paywall feels like the next page
// of the same book — not a jarring full-bleed sales screen. Each Plus screen
// owns its own body layout; this just provides the frame, an eyebrow strip, and
// an optional close (soft-exit) control.

import type { ReactNode } from "react";
import {
  CookbookKeyframes,
  PaperTextureFilters,
  PageStackEdge,
  Ribbon,
  Dot,
} from "../cookbook/CookbookOrnaments";

interface Props {
  /** Small mono eyebrow, e.g. "MARCO PLUS". */
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
    <div
      className="fixed inset-0 overflow-hidden flex items-center justify-center"
      style={{ background: "radial-gradient(ellipse at center, #D9C9A8 0%, #B89E70 100%)" }}
    >
      <CookbookKeyframes />
      <PaperTextureFilters />

      <div className="relative w-full h-full max-w-md mx-auto" style={{ perspective: "1800px" }}>
        <PageStackEdge />

        <div
          className="absolute inset-0 flex flex-col px-7 pt-9 pb-6 overflow-hidden"
          style={{
            background: "radial-gradient(ellipse at 50% 30%, #F7EFD8 0%, #EFE5C8 70%, #E5D5B0 100%)",
            boxShadow: "inset 18px 0 24px -10px rgba(74, 50, 20, 0.18), inset 0 0 60px rgba(120, 85, 40, 0.08)",
            filter: "url(#paper-grain)",
          }}
        >
          <Ribbon />

          {/* Eyebrow + optional close */}
          <div
            className="relative flex items-center justify-center mb-3 flex-shrink-0"
            style={{ animation: "cookbook-ink-fade-in 0.5s ease-out 0.1s both" }}
          >
            <div
              className="flex items-center gap-3"
              style={{
                fontFamily: "var(--font-mono, ui-monospace)",
                fontSize: "9px",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "rgba(28, 26, 23, 0.55)",
              }}
            >
              {eyebrow && <span>{eyebrow}</span>}
              {eyebrowAside && (
                <>
                  <Dot />
                  <span>{eyebrowAside}</span>
                </>
              )}
            </div>
            {onClose && (
              <button
                onClick={onClose}
                aria-label="Maybe later"
                className="absolute right-0 w-8 h-8 -mr-1 flex items-center justify-center rounded-full active:scale-95 transition-transform"
                style={{ color: "rgba(28, 26, 23, 0.4)" }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-none -mx-1 px-1">
            {children}
          </div>

          {/* Pinned footer */}
          {footer && (
            <div className="flex-shrink-0 mt-3" style={{ animation: "cookbook-ink-fade-in 0.5s ease-out 0.9s both" }}>
              {footer}
            </div>
          )}
        </div>
      </div>
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
      className="w-full py-4 px-4 text-white rounded-2xl font-bold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
      style={{ background: "#E5462E", fontSize: "17px", boxShadow: "0 6px 18px rgba(229,70,46,0.28)" }}
    >
      {children}
    </button>
  );
}
