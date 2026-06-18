"use client";

import type { ReactNode } from "react";

/* Shared chrome for the ReciMe-style guided onboarding flow: a wordmark logo,
   a back chevron + progress bar row, a scrollable body, and a pinned footer
   (usually the Continue button). Each guided step composes this so the header
   and progress bar stay consistent as the flow grows. */

interface GuidedShellProps {
  /** 1-based position of this step in the flow (for the progress bar). */
  step: number;
  /** Total steps in the flow. */
  totalSteps: number;
  /** Back handler. When omitted the chevron is hidden (e.g. a true first step). */
  onBack?: () => void;
  /** Pinned bottom content — typically the Continue button. */
  footer?: ReactNode;
  children: ReactNode;
}

export default function GuidedShell({
  step,
  totalSteps,
  onBack,
  footer,
  children,
}: GuidedShellProps) {
  const pct = Math.max(0, Math.min(100, (step / totalSteps) * 100));

  return (
    <div
      className="flex flex-col"
      style={{ background: "#F5EEE2", minHeight: "100dvh" }}
    >
      {/* Logo */}
      <div
        className="flex justify-center flex-shrink-0"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.25rem)" }}
      >
        <span className="marco-signature" style={{ fontSize: "2rem" }}>
          Marco
        </span>
      </div>

      {/* Back chevron + progress bar */}
      <div className="flex items-center gap-3 px-5 pt-5 flex-shrink-0">
        {onBack ? (
          <button
            onClick={onBack}
            aria-label="Back"
            className="flex items-center justify-center flex-shrink-0 transition-opacity active:opacity-50"
            style={{ width: "28px", height: "28px", marginLeft: "-4px" }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1C1A17"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        ) : (
          <div style={{ width: "24px" }} aria-hidden />
        )}

        <div
          className="flex-1 overflow-hidden"
          style={{
            height: "7px",
            borderRadius: "100px",
            background: "rgba(28,26,23,0.1)",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              borderRadius: "100px",
              background: "var(--tomato, #E5462E)",
              transition: "width 0.5s cubic-bezier(0.16,1,0.3,1)",
            }}
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6">{children}</div>

      {/* Footer */}
      {footer && (
        <div className="px-6 pb-8 pt-3 flex-shrink-0 max-w-sm mx-auto w-full">
          {footer}
        </div>
      )}
    </div>
  );
}
