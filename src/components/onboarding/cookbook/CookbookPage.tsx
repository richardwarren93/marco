"use client";

// Reusable full-screen cookbook page. Wraps every onboarding question in the
// same aesthetic as the slice-1 opening: paper-grain page, ribbon bookmark,
// metadata header strip, drop-cap title, hand underline, footer, page number.
//
// The body (children) scrolls; the footer + page number stay pinned. Pass the
// question UI as children and the continue button (or similar) as `footer`.

import type { ReactNode } from "react";
import {
  CookbookKeyframes,
  PaperTextureFilters,
  PageStackEdge,
  Ribbon,
  HandUnderline,
  Dot,
  SmallOrnament,
} from "./CookbookOrnaments";

interface CookbookPageProps {
  sectionLabel: string;
  questionLabel: string;
  timeLabel?: string;
  dropCap: string;
  title: ReactNode;
  subtitle?: ReactNode;
  pageNumber: number;
  onBack?: () => void;
  hideBack?: boolean;
  footer?: ReactNode;
  children: ReactNode;
}

export default function CookbookPage({
  sectionLabel,
  questionLabel,
  timeLabel,
  dropCap,
  title,
  subtitle,
  pageNumber,
  onBack,
  hideBack,
  footer,
  children,
}: CookbookPageProps) {
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

          {/* Header: back button (left) + metadata strip (center) */}
          <div
            className="relative flex items-center justify-center mb-3 flex-shrink-0"
            style={{ animation: "cookbook-ink-fade-in 0.5s ease-out 0.1s both" }}
          >
            {!hideBack && onBack && (
              <button
                onClick={onBack}
                aria-label="Go back"
                className="absolute left-0 w-9 h-9 -ml-1 flex items-center justify-center rounded-full active:scale-95 transition-transform"
                style={{ color: "rgba(28, 26, 23, 0.7)" }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
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
              <span>{sectionLabel}</span>
              <Dot />
              <span>{questionLabel}</span>
              {timeLabel && (
                <>
                  <Dot />
                  <span>{timeLabel}</span>
                </>
              )}
            </div>
          </div>

          {/* Title with drop cap */}
          <div className="mb-2 mt-2 flex-shrink-0" style={{ animation: "cookbook-ink-fade-in 0.6s ease-out 0.3s both" }}>
            <h1
              style={{
                fontFamily: "var(--font-display, Georgia, serif)",
                fontVariationSettings: '"opsz" 60, "wght" 600',
                fontSize: "30px",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                color: "#1C1A17",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display, Georgia, serif)",
                  fontVariationSettings: '"opsz" 144, "wght" 700',
                  fontSize: "62px",
                  float: "left",
                  lineHeight: "0.85",
                  marginRight: "8px",
                  marginTop: "2px",
                  color: "#E5462E",
                  animation: "cookbook-drop-cap-in 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s both",
                }}
              >
                {dropCap}
              </span>
              {title}
            </h1>
          </div>

          {subtitle && (
            <p
              className="mb-2 flex-shrink-0"
              style={{
                fontFamily: "var(--font-display, Georgia, serif)",
                fontStyle: "italic",
                fontSize: "14px",
                lineHeight: 1.5,
                color: "rgba(28, 26, 23, 0.65)",
                animation: "cookbook-ink-fade-in 0.6s ease-out 0.4s both",
                clear: "both",
              }}
            >
              {subtitle}
            </p>
          )}

          <div className="mb-3 flex-shrink-0" style={{ animation: "cookbook-ink-fade-in 0.6s ease-out 0.55s both", clear: "both" }}>
            <HandUnderline width={70} />
          </div>

          {/* Scrollable body */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-none -mx-1 px-1">{children}</div>

          {/* Footer (pinned) */}
          {footer && (
            <div className="flex-shrink-0 mt-3" style={{ animation: "cookbook-ink-fade-in 0.5s ease-out 1.1s both" }}>
              {footer}
            </div>
          )}

          {/* Page number */}
          <div
            className="flex items-center justify-center gap-3 mt-3 flex-shrink-0"
            style={{
              fontFamily: "var(--font-display, Georgia, serif)",
              fontStyle: "italic",
              fontSize: "13px",
              color: "rgba(28, 26, 23, 0.5)",
              animation: "cookbook-ink-fade-in 0.5s ease-out 1.2s both",
            }}
          >
            <SmallOrnament />
            <span>· {pageNumber} ·</span>
            <SmallOrnament />
          </div>
        </div>
      </div>
    </div>
  );
}
