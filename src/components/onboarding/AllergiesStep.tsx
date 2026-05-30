"use client";

import { useState, useRef } from "react";
import CookbookPage from "./cookbook/CookbookPage";
import { CookbookButton } from "./cookbook/CookbookControls";

const COMMON_ALLERGIES = [
  "Peanuts", "Tree Nuts", "Dairy", "Gluten",
  "Shellfish", "Eggs", "Soy", "Fish",
];

interface Props {
  value: string[];
  pageNumber: number;
  onBack?: () => void;
  onNext: (allergies: string[]) => void;
}

export default function AllergiesStep({ value, pageNumber, onBack, onNext }: Props) {
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
    background: isSelected ? "#E5462E" : "rgba(255, 253, 247, 0.7)",
    color: isSelected ? "white" : "#1C1A17",
    border: isSelected ? "1.5px solid #E5462E" : "1px solid rgba(28, 26, 23, 0.16)",
    fontFamily: "var(--font-display, Georgia, serif)",
    fontVariationSettings: '"opsz" 14, "wght" 500',
    fontSize: "14px",
  });

  return (
    <CookbookPage
      sectionLabel="About you"
      questionLabel="Allergies"
      dropCap="A"
      title={
        <>
          ny food{" "}
          <em style={{ color: "#E5462E", fontStyle: "italic" }}>allergies?</em>
        </>
      }
      subtitle="We'll keep these out of your suggestions."
      pageNumber={pageNumber}
      onBack={onBack}
      footer={
        <CookbookButton onClick={() => onNext(selected)}>
          {selected.length > 0 ? "Continue" : "No allergies — continue"}
        </CookbookButton>
      }
    >
      {/* Custom input */}
      <div className="flex gap-2 mb-4">
        <input
          ref={inputRef}
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCustom()}
          placeholder="Type an allergy..."
          className="flex-1 px-4 py-2.5 rounded-xl outline-none"
          style={{
            background: "rgba(255, 253, 247, 0.7)",
            border: "1px solid rgba(28, 26, 23, 0.18)",
            fontFamily: "var(--font-display, Georgia, serif)",
            fontSize: "14px",
            color: "#1C1A17",
          }}
        />
        {custom.trim() && (
          <button
            onClick={addCustom}
            className="px-4 py-2.5 rounded-xl font-semibold text-sm text-white"
            style={{ background: "#E5462E" }}
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
            className="px-4 py-2.5 rounded-full transition-all active:scale-[0.97]"
            style={{ ...chipStyle(selected.includes(allergy)), animation: `cookbook-ink-fade-in 0.5s ease-out ${0.1 + i * 0.04}s both` }}
          >
            {allergy}
          </button>
        ))}
      </div>

      {/* Custom chips */}
      {customAllergies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {customAllergies.map((allergy) => (
            <span
              key={allergy}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-white"
              style={{ background: "#E5462E", fontFamily: "var(--font-display, Georgia, serif)", fontSize: "14px" }}
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
    </CookbookPage>
  );
}
