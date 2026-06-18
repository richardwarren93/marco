"use client";

import Image from "next/image";
import GuidedShell from "./GuidedShell";

/* Guided flow — reassurance splash shown right after the allergies step.
   Highlights that Marco screens every recipe against the user's
   allergies and dietary preferences and flags anything that doesn't fit,
   before they ever cook it. Personalizes the example with their first
   selected allergy when we have one. */

interface Props {
  step: number;
  totalSteps: number;
  allergies: string[];
  onBack?: () => void;
  onContinue: () => void;
}

export default function DietaryFlagStep({ step, totalSteps, allergies, onBack, onContinue }: Props) {
  const flagged = allergies[0] ? allergies[0].toLowerCase() : null;
  const badgeText = flagged ? `Contains ${flagged}` : "Not in your preferences";

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
          We&apos;ll <em style={{ color: "var(--tomato, #E5462E)", fontStyle: "italic" }}>flag</em> what doesn&apos;t fit
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
          Every recipe is checked against your allergies and dietary preferences — we warn you before you cook.
        </p>
      </div>

      {/* Example recipe card with a flag banner */}
      <div className="flex justify-center my-9 animate-stagger-in" style={{ animationDelay: "0.18s" }}>
        <div
          className="relative overflow-hidden"
          style={{
            width: "240px",
            borderRadius: "20px",
            background: "#FFFDF7",
            border: "1px solid rgba(28,26,23,0.1)",
            boxShadow: "0 16px 38px -14px rgba(28,26,23,0.4)",
          }}
        >
          <div className="relative w-full" style={{ aspectRatio: "4 / 3", background: "#E5D5B0" }}>
            <Image
              src={encodeURI("/onboarding/recipes/mapo-tofu.jpg")}
              alt="Recipe"
              fill
              sizes="240px"
              style={{ objectFit: "cover" }}
            />
            {/* dim the photo so the flag reads as a warning state */}
            <div className="absolute inset-0" style={{ background: "rgba(28,26,23,0.32)" }} />

            {/* Flag banner */}
            <div
              className="absolute left-2.5 top-2.5 flex items-center gap-1.5 animate-stagger-in"
              style={{
                animationDelay: "0.5s",
                background: "var(--tomato, #E5462E)",
                color: "#fff",
                padding: "5px 10px",
                borderRadius: "999px",
                boxShadow: "0 4px 12px rgba(229,70,46,0.5)",
              }}
            >
              <span style={{ fontSize: "13px", lineHeight: 1 }}>⚠️</span>
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {badgeText}
              </span>
            </div>
          </div>

          <div className="px-3.5 py-3">
            <p
              style={{
                fontFamily: "var(--font-display, Georgia, serif)",
                fontVariationSettings: '"opsz" 24, "wght" 600',
                fontSize: "16px",
                color: "var(--ink, #1C1A17)",
                lineHeight: 1.15,
              }}
            >
              Mapo Tofu
            </p>
            <p
              className="mt-1 flex items-center gap-1.5"
              style={{
                fontFamily: "var(--font-display, Georgia, serif)",
                fontStyle: "italic",
                fontSize: "13px",
                color: "var(--tomato, #E5462E)",
              }}
            >
              Flagged for you — tap to see why
            </p>
          </div>
        </div>
      </div>
    </GuidedShell>
  );
}
