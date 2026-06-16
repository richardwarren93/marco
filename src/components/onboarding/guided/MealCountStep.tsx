"use client";

import { useRef, useState } from "react";
import GuidedShell from "./GuidedShell";

/* Guided flow — first meal-planning screen. "How many meals do you want to
   cook each week?" Sets the weekly cooking goal (1–7) that powers the profile
   goal stat + gamification (weekly bonus / badges). Single-select, auto-
   advances on tap like the other single-choice screens. */

const OPTIONS = [1, 2, 3, 4, 5, 6, 7] as const;

interface Props {
  step: number;
  totalSteps: number;
  value: number;
  onBack?: () => void;
  onNext: (count: number) => void;
}

export default function MealCountStep({ step, totalSteps, value, onBack, onNext }: Props) {
  const [chosen, setChosen] = useState<number>(value || 0);
  const advancing = useRef(false);

  const pick = (n: number) => {
    if (advancing.current) return;
    advancing.current = true;
    setChosen(n);
    window.setTimeout(() => onNext(n), 280);
  };

  return (
    <GuidedShell step={step} totalSteps={totalSteps} onBack={onBack}>
      {/* Heading */}
      <div className="text-center pt-7 pb-1 animate-stagger-in" style={{ animationDelay: "0.03s" }}>
        <h1
          style={{
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 600',
            fontSize: "27px",
            lineHeight: 1.12,
            letterSpacing: "-0.02em",
            color: "var(--ink, #1C1A17)",
          }}
        >
          How many meals a week do you want to <em style={{ color: "var(--tomato, #E5462E)", fontStyle: "italic" }}>cook</em>?
        </h1>
        <p
          className="mt-2.5 max-w-xs mx-auto"
          style={{
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontStyle: "italic",
            fontVariationSettings: '"opsz" 14, "SOFT" 100, "wght" 400',
            fontSize: "15px",
            lineHeight: 1.45,
            color: "var(--ink-soft, #4A4742)",
          }}
        >
          We&apos;ll set this as your weekly goal — change it anytime.
        </p>
      </div>

      {/* Number grid */}
      <div className="pt-9">
        <div className="grid grid-cols-7 gap-2">
          {OPTIONS.map((n, i) => {
            const isSel = chosen === n;
            return (
              <button
                key={n}
                onClick={() => pick(n)}
                className="flex items-center justify-center transition-all active:scale-90 animate-stagger-in"
                style={{
                  aspectRatio: "1 / 1",
                  borderRadius: "14px",
                  background: isSel ? "var(--tomato, #E5462E)" : "#FFFDF7",
                  border: isSel ? "1.5px solid var(--tomato, #E5462E)" : "1px solid rgba(28,26,23,0.12)",
                  boxShadow: isSel ? "none" : "0 1px 3px rgba(28,26,23,0.05)",
                  color: isSel ? "white" : "var(--ink, #1C1A17)",
                  fontFamily: "var(--font-display, Georgia, serif)",
                  fontVariationSettings: '"opsz" 24, "wght" 600',
                  fontSize: "18px",
                  animationDelay: `${0.1 + i * 0.04}s`,
                }}
              >
                {n}
              </button>
            );
          })}
        </div>
        <div className="flex justify-between mt-2.5 px-0.5">
          <span style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontSize: "12px", color: "var(--ink-soft, #4A4742)" }}>
            Just starting
          </span>
          <span style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontSize: "12px", color: "var(--ink-soft, #4A4742)" }}>
            Every night
          </span>
        </div>
      </div>
    </GuidedShell>
  );
}
