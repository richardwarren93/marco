"use client";

import { useState, useRef } from "react";
import GuidedShell from "./guided/GuidedShell";

interface Props {
  value: string;
  step: number;
  totalSteps: number;
  onBack?: () => void;
  onNext: (dish: string) => void;
}

export default function SignatureDishStep({ value, step, totalSteps, onBack, onNext }: Props) {
  const [dish, setDish] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);

  const canContinue = !!dish.trim();

  return (
    <GuidedShell
      step={step}
      totalSteps={totalSteps}
      onBack={onBack}
      footer={
        <button
          onClick={() => canContinue && onNext(dish)}
          disabled={!canContinue}
          className="w-full py-4 px-4 text-white rounded-2xl font-semibold text-base shadow-sm transition-all"
          style={{
            background: "var(--tomato, #E5462E)",
            opacity: canContinue ? 1 : 0.4,
            cursor: canContinue ? "pointer" : "not-allowed",
          }}
        >
          Continue
        </button>
      }
    >
      {/* Heading */}
      <div className="text-center pt-7 animate-stagger-in" style={{ animationDelay: "0.03s" }}>
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
          What&apos;s your <em style={{ color: "var(--tomato, #E5462E)", fontStyle: "italic" }}>dream meal</em>?
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
          If you could eat one meal for the rest of your life, what would it be?
        </p>
      </div>

      <div className="flex flex-col items-center justify-center pt-10">
        <div className="text-5xl mb-6">👨‍🍳</div>
        <input
          ref={inputRef}
          type="text"
          value={dish}
          onChange={(e) => setDish(e.target.value)}
          onFocus={() => {
            setTimeout(() => {
              inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 300);
          }}
          placeholder="e.g. Grandma's lasagna, Thai green curry…"
          className="w-full px-5 py-4 rounded-2xl outline-none text-center"
          style={{
            background: "#FFFDF7",
            border: "1px solid rgba(28,26,23,0.14)",
            fontFamily: "var(--font-display, Georgia, serif)",
            fontSize: "16px",
            color: "var(--ink, #1C1A17)",
            scrollMarginBottom: "120px",
          }}
        />
        <p
          className="mt-4 text-center"
          style={{
            fontFamily: "var(--font-display, Georgia, serif)",
            fontStyle: "italic",
            fontSize: "13px",
            color: "var(--ink-soft, #4A4742)",
          }}
        >
          This will appear on your Taste DNA profile
        </p>
      </div>
    </GuidedShell>
  );
}
