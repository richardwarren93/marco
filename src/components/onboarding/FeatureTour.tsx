"use client";

import { useState } from "react";
import WelcomePhoneMockup from "@/components/onboarding/WelcomePhoneMockup";

/**
 * Pre-signup feature tour: a 5-screen carousel that walks new users through what
 * Marco does — Save recipes, Plan meals, Order groceries, Cook as a household,
 * Get inspired — each with a live app preview, a bold title, and a Next button.
 * Page dots track progress; the last Next hands off to account creation.
 */
const SLIDES = [
  { title: "Save recipes", sub: "Paste a link from Instagram, TikTok, or any site — Marco saves the full recipe for you." },
  { title: "Plan your meals", sub: "Marco builds a weekly meal plan around your taste, time, and goals." },
  { title: "Order groceries", sub: "Your plan becomes a smart grocery list — ready to shop in a tap." },
  { title: "Cook as a household", sub: "Share recipes, plans, and lists with everyone you cook with." },
  { title: "Get inspired", sub: "Discover trending recipes and fresh ideas picked just for you." },
] as const;

export default function FeatureTour({ onBack, onComplete }: { onBack: () => void; onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const isLast = step === SLIDES.length - 1;

  const next = () => (isLast ? onComplete() : setStep((s) => s + 1));
  const back = () => (step === 0 ? onBack() : setStep((s) => s - 1));

  const slide = SLIDES[step];

  return (
    <div className="flex flex-col" style={{ background: "#F5EEE2", minHeight: "100dvh" }}>
      {/* Top bar — back chevron + page dots */}
      <div
        className="flex items-center px-4 flex-shrink-0"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
      >
        <button
          onClick={back}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{ background: "rgba(0,0,0,0.05)" }}
          aria-label="Back"
        >
          <svg className="w-4 h-4" style={{ color: "#1C1A17" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex-1 flex items-center justify-center gap-1.5">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              style={{
                width: i === step ? "18px" : "7px",
                height: "7px",
                borderRadius: "100px",
                background: i === step ? "var(--tomato, #E5462E)" : "rgba(28,26,23,0.18)",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>

        <div className="w-9 h-9" aria-hidden />
      </div>

      {/* Live app preview */}
      <div className="flex-1 min-h-0 flex items-center justify-center px-6 pt-4 pb-2 overflow-hidden">
        {/* The caller sizes the mockup explicitly — width is derived from the
            height in calc rather than left to `aspect-ratio`, which WebKit
            fails to resolve for a flex item whose height comes from its parent
            (the bezel collapsed to a thin black bar in the iOS shell). */}
        <div
          key={`phone-${step}`}
          style={{
            height: "min(420px, 52vh)",
            width: "calc(min(420px, 52vh) * 186 / 380)",
            animation: "tour-slide-in 0.4s ease both",
          }}
        >
          <WelcomePhoneMockup screen={step} />
        </div>
      </div>

      {/* Title + subtitle */}
      <div key={`copy-${step}`} className="px-8 text-center flex-shrink-0" style={{ animation: "tour-slide-in 0.4s ease 0.05s both" }}>
        <h1
          style={{
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontVariationSettings: '"opsz" 144, "SOFT" 60, "wght" 860',
            fontSize: "clamp(34px, 9.5vw, 44px)",
            lineHeight: 1.0,
            letterSpacing: "-0.03em",
            color: "var(--ink, #1C1A17)",
          }}
        >
          {slide.title}
        </h1>
        <p
          className="mt-3 mx-auto"
          style={{ maxWidth: "20rem", fontSize: "15px", lineHeight: 1.45, color: "var(--ink-soft, #4A4742)" }}
        >
          {slide.sub}
        </p>
      </div>

      {/* Next */}
      <div className="px-6 pb-8 pt-5 flex-shrink-0 max-w-sm w-full mx-auto">
        <button
          onClick={next}
          className="w-full flex items-center justify-center gap-2 py-4 px-4 text-white rounded-2xl font-semibold text-base shadow-sm transition-colors"
          style={{ background: "var(--tomato, #E5462E)" }}
          onMouseDown={(e) => (e.currentTarget.style.background = "var(--tomato-dark, #B8331E)")}
          onMouseUp={(e) => (e.currentTarget.style.background = "var(--tomato, #E5462E)")}
        >
          {isLast ? "Get started" : "Next"}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <style>{`
        @keyframes tour-slide-in {
          0%   { opacity: 0; transform: translateX(24px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="tour-slide-in"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
