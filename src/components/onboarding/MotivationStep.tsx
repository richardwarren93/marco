"use client";

import { useState } from "react";

const OPTIONS = [
  { id: "find_recipes", label: "Find new recipes", emoji: "\u{1F50D}" },
  { id: "save_recipes", label: "Save all my recipes in one place", emoji: "\u{1F4D6}" },
  { id: "meal_plans", label: "Build meal plans easily", emoji: "\u{1F4C5}" },
  { id: "grocery_shopping", label: "Save time grocery shopping", emoji: "\u{1F6D2}" },
];

interface Props {
  value: string | null;
  onNext: (motivation: string) => void;
}

export default function MotivationStep({ value, onNext }: Props) {
  const [selected, setSelected] = useState(value);

  return (
    <div className="flex flex-col h-full px-6 pb-24">
      <div className="pt-4 pb-8">
        <h1 className="text-[28px] font-black tracking-tight" style={{ color: "#1a1410" }}>
          What brings <span style={{ color: "#ea580c" }}>you here</span>?
        </h1>
        <p className="text-sm mt-2" style={{ color: "#a09890" }}>
          This helps us personalize your experience
        </p>
      </div>

      <div className="space-y-3 flex-1">
        {OPTIONS.map((opt, i) => {
          const isSelected = selected === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setSelected(opt.id)}
              className="animate-stagger-in w-full flex items-center gap-4 p-5 rounded-2xl text-left transition-all duration-200 active:scale-[0.98]"
              style={{
                animationDelay: `${i * 0.07}s`,
                background: isSelected ? "#fff4ec" : "white",
                border: isSelected ? "2px solid #ea580c" : "2px solid #e8e8e5",
                boxShadow: isSelected ? "0 0 0 3px rgba(234,88,12,0.1)" : "none",
              }}
            >
              <span className="text-2xl">{opt.emoji}</span>
              <span
                className="font-semibold text-[15px]"
                style={{ color: isSelected ? "#ea580c" : "#1a1410" }}
              >
                {opt.label}
              </span>
              {isSelected && (
                <div className="ml-auto w-6 h-6 rounded-full bg-[#ea580c] flex items-center justify-center animate-bounce-in">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="pt-6">
        <button
          onClick={() => selected && onNext(selected)}
          disabled={!selected}
          className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ background: selected ? "#1a1410" : "#d4d0cc" }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
