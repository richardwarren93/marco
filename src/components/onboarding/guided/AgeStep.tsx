"use client";

import { useRef, useState } from "react";
import GuidedShell from "./GuidedShell";

/* Guided flow — "How old are you?" Single-select; tapping a choice advances
   (no Continue button), matching the reference. Used only to personalize. */

const RANGES = ["24 and under", "25–34", "35–44", "45–54", "55+"] as const;

interface Props {
  step: number;
  totalSteps: number;
  value: string;
  onBack?: () => void;
  onNext: (ageRange: string) => void;
}

export default function AgeStep({ step, totalSteps, value, onBack, onNext }: Props) {
  const [chosen, setChosen] = useState<string | null>(value || null);
  const advancing = useRef(false);

  const pick = (range: string) => {
    if (advancing.current) return;
    advancing.current = true;
    setChosen(range);
    window.setTimeout(() => onNext(range), 280);
  };

  return (
    <GuidedShell step={step} totalSteps={totalSteps} onBack={onBack}>
      {/* Heading */}
      <div className="text-center pt-7 pb-1 animate-stagger-in" style={{ animationDelay: "0.03s" }}>
        <h1
          style={{
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 600',
            fontSize: "28px",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            color: "var(--ink, #1C1A17)",
          }}
        >
          How old are <em style={{ color: "var(--tomato, #E5462E)", fontStyle: "italic" }}>you</em>?
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
          We only use this to personalize your experience.
        </p>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-3 pt-6 pb-4">
        {RANGES.map((r, i) => {
          const isSel = chosen === r;
          return (
            <button
              key={r}
              onClick={() => pick(r)}
              className="flex items-center w-full text-left animate-stagger-in transition-colors"
              style={{
                padding: "17px 18px",
                borderRadius: "16px",
                background: isSel ? "rgba(229,70,46,0.07)" : "#FFFDF7",
                border: isSel
                  ? "1.5px solid var(--tomato, #E5462E)"
                  : "1px solid rgba(28,26,23,0.1)",
                boxShadow: isSel ? "none" : "0 1px 3px rgba(28,26,23,0.05)",
                animationDelay: `${0.1 + i * 0.06}s`,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display, Georgia, serif)",
                  fontVariationSettings: '"opsz" 24, "wght" 500',
                  fontSize: "17px",
                  letterSpacing: "-0.005em",
                  color: "var(--ink, #1C1A17)",
                }}
              >
                {r}
              </span>
            </button>
          );
        })}
      </div>
    </GuidedShell>
  );
}
