"use client";

import GuidedShell from "./GuidedShell";
import WelcomePhoneMockup from "../WelcomePhoneMockup";

/* Guided flow — meal-planning feature card shown right after the recipe view.
   Reuses the real welcome-screen phone (proper iPhone bezel + dynamic island)
   on its meal-plan screen, so the showcase matches the phone we use elsewhere. */

interface Props {
  step: number;
  totalSteps: number;
  onBack?: () => void;
  onContinue: () => void;
}

export default function MealPlanCardStep({ step, totalSteps, onBack, onContinue }: Props) {
  return (
    <GuidedShell
      step={step}
      totalSteps={totalSteps}
      onBack={onBack}
      footer={
        <button
          onClick={onContinue}
          className="w-full py-4 px-4 text-white rounded-2xl font-semibold text-base shadow-sm transition-colors"
          style={{ background: "var(--tomato, #E5462E)" }}
          onMouseDown={(e) => (e.currentTarget.style.background = "var(--tomato-dark, #B8331E)")}
          onMouseUp={(e) => (e.currentTarget.style.background = "var(--tomato, #E5462E)")}
        >
          Continue
        </button>
      }
    >
      {/* Heading + copy */}
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
          Plan your <em style={{ color: "var(--tomato, #E5462E)", fontStyle: "italic" }}>week</em> in seconds
        </h1>
        <p
          className="mt-3 max-w-xs mx-auto"
          style={{
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontStyle: "italic",
            fontVariationSettings: '"opsz" 14, "SOFT" 100, "wght" 400',
            fontSize: "16px",
            lineHeight: 1.45,
            color: "var(--ink-soft, #4A4742)",
          }}
        >
          Drop any recipe onto a day — we&apos;ll build the grocery list for you.
        </p>
      </div>

      {/* Real welcome-screen phone, on its meal-plan screen */}
      <div
        className="flex justify-center my-8 animate-stagger-in"
        style={{ animationDelay: "0.18s", height: "min(420px, 52vh)" }}
      >
        <WelcomePhoneMockup screen={1} />
      </div>
    </GuidedShell>
  );
}
