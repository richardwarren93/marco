"use client";

import GuidedShell from "./GuidedShell";

/* Step 0 of the guided flow — social proof. Mirrors the ReciMe opening:
   headline with a big number, then a testimonial card, then Continue.
   Replaces the old cookbook cover. */

interface Props {
  step: number;
  totalSteps: number;
  onBack?: () => void;
  onContinue: () => void;
}

export default function SocialProofStep({ step, totalSteps, onBack, onContinue }: Props) {
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
      {/* Headline */}
      <div
        className="text-center pt-9 animate-stagger-in"
        style={{ animationDelay: "0.05s" }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontVariationSettings: '"opsz" 80, "SOFT" 100, "wght" 600',
            fontSize: "30px",
            lineHeight: 1.08,
            letterSpacing: "-0.02em",
            color: "var(--ink, #1C1A17)",
          }}
        >
          We&apos;ve helped
          <br />
          <span style={{ color: "var(--tomato, #E5462E)" }}>50,000+ home cooks</span>
        </h1>
        <p
          className="mt-3.5 max-w-xs mx-auto"
          style={{
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontStyle: "italic",
            fontVariationSettings: '"opsz" 14, "SOFT" 100, "wght" 400',
            fontSize: "16px",
            lineHeight: 1.45,
            color: "var(--ink-soft, #4A4742)",
          }}
        >
          organize their recipes and save money cooking delicious food at home.
        </p>
      </div>

      {/* Testimonial card */}
      <div
        className="relative mt-10 mb-6 animate-stagger-in"
        style={{ animationDelay: "0.2s" }}
      >
        {/* Big quote mark hanging over the corner */}
        <span
          aria-hidden
          className="absolute select-none"
          style={{
            top: "-26px",
            left: "8px",
            fontFamily: "var(--font-display, Georgia, serif)",
            fontWeight: 700,
            fontSize: "84px",
            lineHeight: 1,
            color: "var(--ink, #1C1A17)",
          }}
        >
          &ldquo;
        </span>

        <div
          className="relative"
          style={{
            background: "#FFFDF7",
            borderRadius: "20px",
            padding: "22px 22px 20px",
            boxShadow: "0 12px 30px -14px rgba(28,26,23,0.25)",
            border: "1px solid rgba(28,26,23,0.06)",
          }}
        >
          {/* Stars */}
          <div className="flex gap-1 mb-3" style={{ paddingTop: "14px" }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <svg key={i} width="20" height="20" viewBox="0 0 24 24" fill="var(--tomato, #E5462E)">
                <path d="M12 2l2.9 6.26 6.88.6-5.2 4.54 1.56 6.74L12 17.27 5.86 20.68l1.56-6.74-5.2-4.54 6.88-.6L12 2z" />
              </svg>
            ))}
          </div>

          <h2
            style={{
              fontFamily: "var(--font-display, Georgia, serif)",
              fontVariationSettings: '"opsz" 40, "wght" 600',
              fontSize: "18px",
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
              color: "var(--ink, #1C1A17)",
              marginBottom: "8px",
            }}
          >
            Life-changing for my recipe collection!
          </h2>

          <p
            style={{
              fontFamily: "var(--font-display, Georgia, serif)",
              fontVariationSettings: '"opsz" 14, "wght" 400',
              fontSize: "15px",
              lineHeight: 1.55,
              color: "var(--ink-soft, #4A4742)",
            }}
          >
            &ldquo;I used to screenshot recipes from Instagram and Pinterest and
            they&apos;d get lost in my camera roll forever. Now everything&apos;s
            in one place, I plan the week in minutes, and we&apos;re saving real
            money cooking at home instead of ordering in.&rdquo;
          </p>

          <div
            className="mt-4 mb-3.5"
            style={{ height: "1px", background: "rgba(28,26,23,0.1)" }}
          />

          {/* Attribution */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #E8A33D 0%, #E5462E 100%)",
                color: "#FFFDF7",
                fontFamily: "var(--font-display, Georgia, serif)",
                fontVariationSettings: '"opsz" 14, "wght" 600',
                fontSize: "15px",
              }}
            >
              M
            </div>
            <span
              style={{
                fontFamily: "var(--font-display, Georgia, serif)",
                fontVariationSettings: '"opsz" 14, "wght" 500',
                fontSize: "15px",
                color: "var(--ink, #1C1A17)",
              }}
            >
              Maya R.
            </span>
          </div>
        </div>
      </div>
    </GuidedShell>
  );
}
