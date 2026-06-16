"use client";

import { useState, useRef } from "react";
import GuidedShell from "./guided/GuidedShell";

const COMMON_ALLERGIES = [
  "Peanuts", "Tree Nuts", "Dairy", "Gluten",
  "Shellfish", "Eggs", "Soy", "Fish",
];

interface Props {
  value: string[];
  step: number;
  totalSteps: number;
  onBack?: () => void;
  onNext: (allergies: string[]) => void;
}

export default function AllergiesStep({ value, step, totalSteps, onBack, onNext }: Props) {
  const [selected, setSelected] = useState<string[]>(value);
  const [custom, setCustom] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const toggle = (allergy: string) => {
    setSelected((prev) =>
      prev.includes(allergy) ? prev.filter((a) => a !== allergy) : [...prev, allergy]
    );
  };

  const addCustom = () => {
    const trimmed = custom.trim();
    if (trimmed && !selected.includes(trimmed)) {
      setSelected((prev) => [...prev, trimmed]);
      setCustom("");
    }
  };

  const removeCustom = (allergy: string) => {
    setSelected((prev) => prev.filter((a) => a !== allergy));
  };

  const customAllergies = selected.filter((a) => !COMMON_ALLERGIES.includes(a));

  const chipStyle = (isSelected: boolean) => ({
    background: isSelected ? "var(--tomato, #E5462E)" : "#FFFDF7",
    color: isSelected ? "white" : "var(--ink, #1C1A17)",
    border: isSelected ? "1.5px solid var(--tomato, #E5462E)" : "1px solid rgba(28,26,23,0.12)",
    boxShadow: isSelected ? "none" : "0 1px 2px rgba(28,26,23,0.04)",
    fontFamily: "var(--font-display, Georgia, serif)",
    fontVariationSettings: '"opsz" 14, "wght" 500',
    fontSize: "15px",
  });

  return (
    <GuidedShell
      step={step}
      totalSteps={totalSteps}
      onBack={onBack}
      footer={
        <button
          onClick={() => onNext(selected)}
          className="w-full py-4 px-4 text-white rounded-2xl font-semibold text-base shadow-sm transition-colors"
          style={{ background: "var(--tomato, #E5462E)" }}
          onMouseDown={(e) => (e.currentTarget.style.background = "var(--tomato-dark, #B8331E)")}
          onMouseUp={(e) => (e.currentTarget.style.background = "var(--tomato, #E5462E)")}
        >
          {selected.length > 0 ? "Continue" : "No allergies — continue"}
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
          Any food <em style={{ color: "var(--tomato, #E5462E)", fontStyle: "italic" }}>allergies</em>?
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
          We&apos;ll keep these out of your suggestions.
        </p>
      </div>

      {/* Custom input */}
      <div className="flex gap-2 pt-6 mb-4">
        <input
          ref={inputRef}
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCustom()}
          placeholder="Type an allergy…"
          className="flex-1 px-4 py-3 rounded-xl outline-none"
          style={{
            background: "#FFFDF7",
            border: "1px solid rgba(28,26,23,0.14)",
            fontFamily: "var(--font-display, Georgia, serif)",
            fontSize: "15px",
            color: "var(--ink, #1C1A17)",
          }}
        />
        {custom.trim() && (
          <button
            onClick={addCustom}
            className="px-4 py-3 rounded-xl font-semibold text-sm text-white"
            style={{ background: "var(--tomato, #E5462E)" }}
          >
            Add
          </button>
        )}
      </div>

      {/* Common allergies */}
      <div className="flex flex-wrap gap-2.5 mb-4">
        {COMMON_ALLERGIES.map((allergy, i) => (
          <button
            key={allergy}
            onClick={() => toggle(allergy)}
            className="px-4 py-2.5 rounded-full transition-all active:scale-[0.97] animate-stagger-in"
            style={{ ...chipStyle(selected.includes(allergy)), animationDelay: `${0.1 + i * 0.04}s` }}
          >
            {allergy}
          </button>
        ))}
      </div>

      {/* Custom chips */}
      {customAllergies.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-4">
          {customAllergies.map((allergy) => (
            <span
              key={allergy}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-white"
              style={{ background: "var(--tomato, #E5462E)", fontFamily: "var(--font-display, Georgia, serif)", fontSize: "15px" }}
            >
              {allergy}
              <button
                onClick={() => removeCustom(allergy)}
                className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center"
                aria-label={`Remove ${allergy}`}
              >
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </GuidedShell>
  );
}
