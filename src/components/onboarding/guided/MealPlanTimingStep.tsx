"use client";

import { useState } from "react";
import GuidedShell from "./GuidedShell";

/* Guided flow — first meal-planning screen. "When do you usually think about
   cooking?" Single-select; tapping a choice advances (no Continue button, per
   the ReciMe reference). The answer tunes when we nudge the user. */

const TIMES = [
  { key: "morning", label: "In the morning, I like to plan ahead" },
  { key: "lunch", label: "Around lunch time, when I start thinking about it" },
  { key: "evening", label: "In the evening, when I'm ready to cook" },
] as const;

interface Props {
  step: number;
  totalSteps: number;
  value: string;
  onBack?: () => void;
  onNext: (timing: string) => void;
}

export default function MealPlanTimingStep({ step, totalSteps, value, onBack, onNext }: Props) {
  const [chosen, setChosen] = useState<string | null>(value || null);

  const pick = (key: string) => {
    if (chosen) return;
    setChosen(key);
    // Brief beat so the selection is visible before advancing.
    window.setTimeout(() => onNext(key), 280);
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
          When do you usually think about <em style={{ color: "var(--tomato, #E5462E)", fontStyle: "italic" }}>cooking</em>?
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
          We&apos;ll check in at the right moment, not a random one.
        </p>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-3 pt-6 pb-4">
        {TIMES.map((t, i) => {
          const isSel = chosen === t.key;
          return (
            <button
              key={t.key}
              onClick={() => pick(t.key)}
              className="flex items-center w-full text-left animate-stagger-in transition-colors"
              style={{
                padding: "17px 18px",
                borderRadius: "16px",
                background: isSel ? "rgba(229,70,46,0.07)" : "#FFFDF7",
                border: isSel
                  ? "1.5px solid var(--tomato, #E5462E)"
                  : "1px solid rgba(28,26,23,0.1)",
                boxShadow: isSel ? "none" : "0 1px 3px rgba(28,26,23,0.05)",
                animationDelay: `${0.1 + i * 0.07}s`,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display, Georgia, serif)",
                  fontVariationSettings: '"opsz" 24, "wght" 500',
                  fontSize: "16px",
                  lineHeight: 1.3,
                  letterSpacing: "-0.005em",
                  color: "var(--ink, #1C1A17)",
                }}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </GuidedShell>
  );
}
