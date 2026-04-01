"use client";

import { useState, useRef } from "react";

const COMMON_ALLERGIES = [
  "Peanuts", "Tree Nuts", "Dairy", "Gluten",
  "Shellfish", "Eggs", "Soy", "Fish",
];

interface Props {
  value: string[];
  onNext: (allergies: string[]) => void;
}

export default function AllergiesStep({ value, onNext }: Props) {
  const [selected, setSelected] = useState<string[]>(value);
  const [custom, setCustom] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const toggle = (allergy: string) => {
    setSelected((prev) =>
      prev.includes(allergy)
        ? prev.filter((a) => a !== allergy)
        : [...prev, allergy]
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

  // Custom allergies not in the common list
  const customAllergies = selected.filter((a) => !COMMON_ALLERGIES.includes(a));

  return (
    <div className="flex flex-col h-full px-6 pb-24">
      <div className="pt-4 pb-6">
        <h1 className="text-[28px] font-black tracking-tight" style={{ color: "#1a1410" }}>
          Any food{" "}
          <span style={{ color: "#ea580c" }}>allergies</span>?
        </h1>
        <p className="text-sm mt-2" style={{ color: "#a09890" }}>
          We&apos;ll keep these out of your suggestions
        </p>
      </div>

      {/* Text input for custom */}
      <div className="flex gap-2 mb-5 animate-stagger-in">
        <input
          ref={inputRef}
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCustom()}
          placeholder="Type an allergy..."
          className="flex-1 px-4 py-3 rounded-2xl text-sm bg-white outline-none"
          style={{ border: "2px solid #e8e8e5" }}
        />
        {custom.trim() && (
          <button
            onClick={addCustom}
            className="px-4 py-3 rounded-2xl font-semibold text-sm text-white"
            style={{ background: "#ea580c" }}
          >
            Add
          </button>
        )}
      </div>

      {/* Common allergies */}
      <div className="flex flex-wrap gap-2.5 mb-4">
        {COMMON_ALLERGIES.map((allergy, i) => {
          const isSelected = selected.includes(allergy);
          return (
            <button
              key={allergy}
              onClick={() => toggle(allergy)}
              className="animate-stagger-in px-4 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 active:scale-[0.97]"
              style={{
                animationDelay: `${i * 0.04}s`,
                background: isSelected ? "#ea580c" : "white",
                color: isSelected ? "white" : "#1a1410",
                border: isSelected ? "2px solid #ea580c" : "2px solid #e8e8e5",
              }}
            >
              {allergy}
            </button>
          );
        })}
      </div>

      {/* Custom chips */}
      {customAllergies.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {customAllergies.map((allergy) => (
            <span
              key={allergy}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold text-white animate-bounce-in"
              style={{ background: "#ea580c" }}
            >
              {allergy}
              <button
                onClick={() => removeCustom(allergy)}
                className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center"
              >
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex-1" />

      {/* Continue / Skip */}
      <div className="pt-6 space-y-3">
        <button
          onClick={() => onNext(selected)}
          className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98]"
          style={{ background: "#1a1410" }}
        >
          {selected.length > 0 ? "Continue" : "No allergies - continue"}
        </button>
      </div>
    </div>
  );
}
