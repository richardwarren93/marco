"use client";

import { useState } from "react";
import GuidedShell from "./GuidedShell";
import { Instagram, TikTok, Facebook, Pinterest, GoogleG, YouTube, NYTimes, BonAppetit } from "./BrandIcons";

/* Guided flow — "Where do you get your recipes from?" multi-select. Mirrors
   the ReciMe reference: rows with a label and the brand glyphs for that
   source. Recolored to salt & spoon's brand. */

interface Source {
  key: string;
  label: string;
  icons: React.ReactNode;
}

const SOURCES: Source[] = [
  {
    key: "social_media",
    label: "Social media",
    icons: (
      <>
        <Instagram size={22} />
        <TikTok size={22} />
        <Facebook size={22} />
        <Pinterest size={22} />
        <YouTube size={22} />
      </>
    ),
  },
  {
    key: "recipe_websites",
    label: "Recipe websites",
    icons: (
      <>
        <span style={{ fontSize: "20px", lineHeight: 1 }}>🌐</span>
        <GoogleG size={22} />
        <NYTimes size={22} />
        <BonAppetit size={22} />
      </>
    ),
  },
  {
    key: "printed",
    label: "Printed / handwritten",
    icons: (
      <>
        <span style={{ fontSize: "21px", lineHeight: 1 }}>📕</span>
        <span style={{ fontSize: "21px", lineHeight: 1 }}>📝</span>
      </>
    ),
  },
];

interface Props {
  step: number;
  totalSteps: number;
  value: string[];
  onBack?: () => void;
  onNext: (sources: string[]) => void;
}

export default function RecipeSourcesStep({ step, totalSteps, value, onBack, onNext }: Props) {
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
            fontSize: "27px",
            lineHeight: 1.12,
            letterSpacing: "-0.02em",
            color: "var(--ink, #1C1A17)",
          }}
        >
          Where do you get your <em style={{ color: "var(--tomato, #E5462E)", fontStyle: "italic" }}>recipes</em>?
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

      {/* Source rows */}
      <div className="flex flex-col gap-3 pt-5 pb-4">
        {SOURCES.map((src, i) => {
          const isSel = selected.includes(src.key);
          return (
            <button
              key={src.key}
              onClick={() => toggle(src.key)}
              className="flex items-center gap-3 w-full text-left animate-stagger-in transition-colors"
              style={{
                padding: "16px",
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
                  fontSize: "16px",
                  letterSpacing: "-0.005em",
                  color: "var(--ink, #1C1A17)",
                  whiteSpace: "nowrap",
                }}
              >
                {src.label}
              </span>
              <span className="flex items-center gap-2 ml-auto flex-shrink-0">{src.icons}</span>
            </button>
          );
        })}
      </div>
    </GuidedShell>
  );
}
