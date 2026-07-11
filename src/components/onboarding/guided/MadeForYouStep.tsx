"use client";

import GuidedShell from "./GuidedShell";

/* Guided flow — the personalization pillars, shown between the guided demo and
   the taste questions. The demo just proved what Marco does; this slide says
   why it's excellent FOR YOU: Taste Profile, Household, Friends discovery.
   Its CTA launches the taste arc (dream meal → ranking → reveal). */

const PILLARS = [
  {
    emoji: "🧬",
    tint: "rgba(229,70,46,0.1)",
    title: "Your Taste Profile",
    line: "Every suggestion is tuned to your real taste — we'll build your Taste DNA in the next few questions.",
    badge: "Up next",
  },
  {
    emoji: "🏠",
    tint: "rgba(232,163,61,0.14)",
    title: "Your household",
    line: "Shared meal plans and one grocery list for everyone you cook with.",
  },
  {
    emoji: "👋",
    tint: "rgba(15,76,92,0.1)",
    title: "Your friends",
    line: "See what friends save and cook, and swap your favorites with them.",
  },
] as const;

interface Props {
  step: number;
  totalSteps: number;
  onBack?: () => void;
  onContinue: () => void;
}

export default function MadeForYouStep({ step, totalSteps, onBack, onContinue }: Props) {
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
          Build my Taste DNA
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
          Marco is <em style={{ color: "var(--tomato, #E5462E)", fontStyle: "italic" }}>yours</em>
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
          No two cooks get the same app. Three things shape yours:
        </p>
      </div>

      {/* Pillar cards */}
      <div className="flex flex-col gap-3 pt-7 pb-4">
        {PILLARS.map((p, i) => (
          <div
            key={p.title}
            className="flex items-start gap-3.5 animate-stagger-in"
            style={{
              padding: "16px",
              borderRadius: "16px",
              background: "#FFFDF7",
              border: "1px solid rgba(28,26,23,0.1)",
              boxShadow: "0 1px 3px rgba(28,26,23,0.05)",
              animationDelay: `${0.15 + i * 0.12}s`,
            }}
          >
            <span
              className="flex items-center justify-center flex-shrink-0 rounded-full"
              style={{ width: "42px", height: "42px", fontSize: "21px", background: p.tint }}
            >
              {p.emoji}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p
                  style={{
                    fontFamily: "var(--font-display, Georgia, serif)",
                    fontVariationSettings: '"opsz" 24, "wght" 600',
                    fontSize: "16px",
                    color: "var(--ink, #1C1A17)",
                    lineHeight: 1.2,
                  }}
                >
                  {p.title}
                </p>
                {"badge" in p && p.badge && (
                  <span
                    style={{
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize: "9px",
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--tomato, #E5462E)",
                      background: "rgba(229,70,46,0.1)",
                      padding: "2px 7px",
                      borderRadius: "999px",
                    }}
                  >
                    {p.badge}
                  </span>
                )}
              </div>
              <p
                className="mt-1"
                style={{
                  fontFamily: "var(--font-display, Georgia, serif)",
                  fontStyle: "italic",
                  fontSize: "13.5px",
                  lineHeight: 1.4,
                  color: "var(--ink-soft, #4A4742)",
                }}
              >
                {p.line}
              </p>
            </div>
          </div>
        ))}
      </div>
    </GuidedShell>
  );
}
