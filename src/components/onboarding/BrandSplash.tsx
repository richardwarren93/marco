"use client";

import { useEffect } from "react";
import TomatoMascot from "@/components/gamification/TomatoMascot";

/**
 * The first screen on app open: the cute Marco tomato, big and centered, with a
 * cheerful wink. Fades up, holds a beat, then hands off to the welcome flow.
 * Tap anywhere to skip ahead. Shown once per app session (gated by the caller).
 */
export default function BrandSplash({ onDone }: { onDone: () => void }) {
  // Auto-advance after the entrance animation has had a moment to land.
  useEffect(() => {
    const id = setTimeout(onDone, 2100);
    return () => clearTimeout(id);
  }, [onDone]);

  return (
    <button
      onClick={onDone}
      aria-label="Continue"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "#F5EEE2", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="bs-rise flex flex-col items-center">
        <TomatoMascot state="thriving" size={200} greeting />

        <span
          className="marco-signature bs-fade"
          style={{ fontSize: "3.25rem", lineHeight: 1, marginTop: "0.5rem", animationDelay: "0.35s" }}
        >
          Marco
        </span>

        <p
          className="bs-fade"
          style={{
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontVariationSettings: '"opsz" 40, "SOFT" 100, "wght" 500',
            fontSize: "16px",
            letterSpacing: "0.01em",
            color: "var(--ink-soft, #4A4742)",
            marginTop: "0.6rem",
            animationDelay: "0.55s",
          }}
        >
          Let&apos;s get you <em style={{ color: "var(--tomato, #E5462E)", fontStyle: "italic" }}>cooking</em>
        </p>
      </div>

      <style>{`
        .bs-rise { animation: bs-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .bs-fade { opacity: 0; animation: bs-fade 0.6s ease forwards; }
        @keyframes bs-rise {
          from { opacity: 0; transform: translateY(14px) scale(0.94); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes bs-fade { to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .bs-rise, .bs-fade { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
    </button>
  );
}
