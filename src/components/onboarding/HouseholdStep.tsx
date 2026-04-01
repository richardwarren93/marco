"use client";

import { useState } from "react";

const HOUSEHOLD_TYPES = [
  { id: "roommates", label: "Roommates", emoji: "\u{1F91D}" },
  { id: "partner", label: "Partner / Spouse", emoji: "\u{2764}\uFE0F" },
  { id: "family", label: "Family with kids", emoji: "\u{1F46A}" },
  { id: "mixed", label: "Mixed household", emoji: "\u{1F3E0}" },
];

interface Props {
  size: number;
  type: string | null;
  onNext: (size: number, type: string | null) => void;
}

export default function HouseholdStep({ size: initSize, type: initType, onNext }: Props) {
  const [count, setCount] = useState(initSize || 1);
  const [hType, setHType] = useState(initType);

  const decrement = () => setCount((c) => Math.max(1, c - 1));
  const increment = () => setCount((c) => Math.min(10, c + 1));

  return (
    <div className="flex flex-col h-full px-6 pb-24">
      <div className="pt-4 pb-8">
        <h1 className="text-[28px] font-black tracking-tight" style={{ color: "#1a1410" }}>
          How many people in your{" "}
          <span style={{ color: "#ea580c" }}>household</span>?
        </h1>
        <p className="text-sm mt-2" style={{ color: "#a09890" }}>
          For cooking and grocery planning purposes
        </p>
      </div>

      {/* Number stepper */}
      <div className="flex items-center justify-center gap-8 py-8 animate-stagger-in">
        <button
          onClick={decrement}
          disabled={count <= 1}
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold transition-all active:scale-95 disabled:opacity-30"
          style={{ background: "white", border: "2px solid #e8e8e5", color: "#1a1410" }}
        >
          -
        </button>

        <div className="text-center">
          <span className="text-7xl font-black" style={{ color: "#1a1410" }}>
            {count}
          </span>
          <p className="text-sm mt-1" style={{ color: "#a09890" }}>
            {count === 1 ? "person" : "people"}
          </p>
        </div>

        <button
          onClick={increment}
          disabled={count >= 10}
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold transition-all active:scale-95 disabled:opacity-30"
          style={{ background: "#ea580c", color: "white" }}
        >
          +
        </button>
      </div>

      {/* Household type - only if >1 */}
      {count > 1 && (
        <div className="animate-stagger-in space-y-3 mt-4">
          <p className="text-sm font-semibold" style={{ color: "#1a1410" }}>
            What best describes your household?
          </p>
          <div className="grid grid-cols-2 gap-3">
            {HOUSEHOLD_TYPES.map((t) => {
              const isSelected = hType === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setHType(t.id)}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-200 active:scale-[0.97]"
                  style={{
                    background: isSelected ? "#fff4ec" : "white",
                    border: isSelected ? "2px solid #ea580c" : "2px solid #e8e8e5",
                  }}
                >
                  <span className="text-2xl">{t.emoji}</span>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: isSelected ? "#ea580c" : "#1a1410" }}
                  >
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex-1" />

      <div className="pt-6">
        <button
          onClick={() => onNext(count, count > 1 ? hType : null)}
          disabled={count > 1 && !hType}
          className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ background: count > 1 && !hType ? "#d4d0cc" : "#1a1410" }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
