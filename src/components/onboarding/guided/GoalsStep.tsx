"use client";

import { useState } from "react";
import GuidedShell from "./GuidedShell";

/* Guided flow — "What are your goals?" multi-select. Mirrors the ReciMe
   reference: a list of tappable goal rows, select all that apply, then
   Continue. Recolored to salt & spoon's brand. */

const GOALS = [
  { key: "eat_healthier", emoji: "🥗", label: "Eat healthier" },
  { key: "save_money", emoji: "💰", label: "Save money" },
  { key: "cooking_skills", emoji: "🔪", label: "Improve cooking skills" },
  { key: "organize_recipes", emoji: "🗂️", label: "Organize recipes" },
  { key: "plan_meals", emoji: "📒", label: "Plan out meals" },
  { key: "new_cuisines", emoji: "🥢", label: "Try new cuisines" },
] as const;

interface Props {
  step: number;
  totalSteps: number;
  value: string[];
  onBack?: () => void;
  onNext: (goals: string[]) => void;
}

export default function GoalsStep({ step, totalSteps, value, onBack, onNext }: Props) {
  const [selected, setSelected] = useState<string[]>(value || []);

  const toggle = (key: string) =>
    setSelected((s) => (s.includes(key) ? s.filter((x) => x !== key) : [...s, key]));

  const canContinue = selected.length > 0;

  return (
    <GuidedShell
      step={step}
      totalSteps={totalSteps}
      onBack={onBack}
      footer={
        <button
          onClick={() => canContinue && onNext(selected)}
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
          What are your <em style={{ color: "var(--tomato, #E5462E)", fontStyle: "italic" }}>goals</em>?
        </h1>
        <p
          className="mt-2"
          style={{
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontStyle: "italic",
            fontVariationSettings: '"opsz" 14, "SOFT" 100, "wght" 400',
            fontSize: "15px",
            color: "var(--ink-soft, #4A4742)",
          }}
        >
          Select all that apply
        </p>
      </div>

      {/* Goal rows */}
      <div className="flex flex-col gap-3 pt-5 pb-4">
        {GOALS.map((goal, i) => {
          const isSel = selected.includes(goal.key);
          return (
            <button
              key={goal.key}
              onClick={() => toggle(goal.key)}
              className="flex items-center gap-3.5 w-full text-left animate-stagger-in transition-colors"
              style={{
                padding: "15px 16px",
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
                className="flex items-center justify-center flex-shrink-0"
                style={{ fontSize: "22px", width: "28px", height: "28px" }}
              >
                {goal.emoji}
              </span>
              <span
                className="flex-1"
                style={{
                  fontFamily: "var(--font-display, Georgia, serif)",
                  fontVariationSettings: '"opsz" 24, "wght" 500',
                  fontSize: "17px",
                  letterSpacing: "-0.005em",
                  color: "var(--ink, #1C1A17)",
                }}
              >
                {goal.label}
              </span>

              {/* Check indicator */}
              <span
                className="flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  background: isSel ? "var(--tomato, #E5462E)" : "transparent",
                  border: isSel ? "none" : "1.5px solid rgba(28,26,23,0.2)",
                }}
              >
                {isSel && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFFDF7" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </GuidedShell>
  );
}
