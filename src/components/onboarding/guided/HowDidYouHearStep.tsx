"use client";

import { useRef, useState } from "react";
import GuidedShell from "./GuidedShell";

/* Guided flow — "How did you hear about us?" A single-select grid (attribution).
   Auto-advances on tap like the other single-choice screens. */

const SOURCES = [
  { key: "instagram", emoji: "📸", label: "Instagram" },
  { key: "tiktok", emoji: "🎵", label: "TikTok" },
  { key: "app_store", emoji: "🔍", label: "App Store" },
  { key: "google", emoji: "🌐", label: "Google" },
  { key: "youtube", emoji: "▶️", label: "YouTube" },
  { key: "friend", emoji: "👋", label: "Friend or family" },
  { key: "facebook", emoji: "👍", label: "Facebook" },
  { key: "other", emoji: "✨", label: "Other" },
] as const;

interface Props {
  step: number;
  totalSteps: number;
  value: string;
  onBack?: () => void;
  onNext: (source: string) => void;
}

export default function HowDidYouHearStep({ step, totalSteps, value, onBack, onNext }: Props) {
  const [chosen, setChosen] = useState<string>(value || "");
  const advancing = useRef(false);

  const pick = (key: string) => {
    if (advancing.current) return;
    advancing.current = true;
    setChosen(key);
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
          How did you <em style={{ color: "var(--tomato, #E5462E)", fontStyle: "italic" }}>hear</em> about us?
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
          It helps us reach more home cooks
        </p>
      </div>

      {/* Source grid */}
      <div className="grid grid-cols-2 gap-3 pt-6 pb-4">
        {SOURCES.map((s, i) => {
          const isSel = chosen === s.key;
          return (
            <button
              key={s.key}
              onClick={() => pick(s.key)}
              className="flex items-center gap-3 w-full text-left animate-stagger-in transition-colors active:scale-[0.98]"
              style={{
                padding: "15px 15px",
                borderRadius: "16px",
                background: isSel ? "rgba(229,70,46,0.07)" : "#FFFDF7",
                border: isSel ? "1.5px solid var(--tomato, #E5462E)" : "1px solid rgba(28,26,23,0.1)",
                boxShadow: isSel ? "none" : "0 1px 3px rgba(28,26,23,0.05)",
                animationDelay: `${0.1 + i * 0.05}s`,
              }}
            >
              <span className="flex items-center justify-center flex-shrink-0" style={{ fontSize: "21px", width: "26px", height: "26px" }}>
                {s.emoji}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-display, Georgia, serif)",
                  fontVariationSettings: '"opsz" 24, "wght" 500',
                  fontSize: "15.5px",
                  letterSpacing: "-0.005em",
                  color: "var(--ink, #1C1A17)",
                  lineHeight: 1.1,
                }}
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>
    </GuidedShell>
  );
}
