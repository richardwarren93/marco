"use client";

import GuidedShell from "./GuidedShell";

/* Guided flow — transition into the taste-personalization sub-flow. A "That's
   great"-style page that sets up the age / allergies / ranking / household
   questions to come. */

interface Props {
  step: number;
  totalSteps: number;
  onBack?: () => void;
  onContinue: () => void;
}

const TASTE_CHIPS = ["🥗", "🌶️", "🧄", "🍋", "🧀", "🍳"];

export default function PersonalizeAffirmationStep({ step, totalSteps, onBack, onContinue }: Props) {
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
          Let&apos;s do it
        </button>
      }
    >
      {/* Heading + copy */}
      <div className="text-center pt-8 animate-stagger-in" style={{ animationDelay: "0.03s" }}>
        <h1
          style={{
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontVariationSettings: '"opsz" 72, "SOFT" 100, "wght" 600',
            fontSize: "32px",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: "var(--ink, #1C1A17)",
          }}
        >
          Now let&apos;s make it <em style={{ color: "var(--tomato, #E5462E)", fontStyle: "italic" }}>yours</em>
        </h1>
        <p
          className="mt-3.5 max-w-sm mx-auto"
          style={{
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontVariationSettings: '"opsz" 14, "SOFT" 100, "wght" 400',
            fontSize: "16px",
            lineHeight: 1.5,
            color: "var(--ink-soft, #4A4742)",
          }}
        >
          A few quick taste questions so every suggestion feels picked just for you — and we&apos;ll finish with your{" "}
          <strong style={{ fontVariationSettings: '"wght" 600', color: "var(--ink, #1C1A17)" }}>Taste DNA</strong>.
        </p>
      </div>

      {/* Decorative taste chips orbiting a center mark */}
      <div className="relative my-12 animate-stagger-in" style={{ animationDelay: "0.18s", height: "210px" }}>
        {/* soft halo */}
        <div
          aria-hidden
          className="absolute"
          style={{
            left: "50%",
            top: "50%",
            width: "150px",
            height: "150px",
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(229,70,46,0.1) 0%, rgba(229,70,46,0) 70%)",
          }}
        />
        {/* center plate */}
        <div
          className="absolute flex items-center justify-center"
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: "76px",
            height: "76px",
            borderRadius: "50%",
            background: "#FFFDF7",
            boxShadow: "0 10px 26px -8px rgba(28,26,23,0.3)",
            border: "1px solid rgba(28,26,23,0.06)",
            fontSize: "34px",
          }}
        >
          🍽️
        </div>
        {/* orbiting chips — outer div positions on the ring, inner div bounces
            (separate transforms so the animation doesn't clobber positioning) */}
        {TASTE_CHIPS.map((chip, i) => {
          const angle = (i / TASTE_CHIPS.length) * Math.PI * 2 - Math.PI / 2;
          const r = 92;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          return (
            <div
              key={i}
              className="absolute"
              style={{
                left: "50%",
                top: "50%",
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
              }}
            >
              <div
                className="flex items-center justify-center animate-bounce-slow"
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  background: "#FFFDF7",
                  boxShadow: "0 6px 16px -5px rgba(28,26,23,0.28)",
                  fontSize: "19px",
                  animationDelay: `${i * 0.25}s`,
                }}
              >
                {chip}
              </div>
            </div>
          );
        })}
      </div>
    </GuidedShell>
  );
}
