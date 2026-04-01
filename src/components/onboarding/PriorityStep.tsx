"use client";

import { useState } from "react";

const OPTIONS = [
  { id: "value", label: "Getting the most value", emoji: "\u{1F4B0}" },
  { id: "nutritious", label: "Making nutritious meals", emoji: "\u{1F966}" },
  { id: "delicious", label: "Making delicious meals", emoji: "\u{1F60B}" },
  { id: "no_waste", label: "Not letting ingredients go to waste", emoji: "\u{267B}\uFE0F" },
];

interface Props {
  value: string | null;
  onNext: (priority: string) => void;
}

export default function PriorityStep({ value, onNext }: Props) {
  const [selected, setSelected] = useState(value);

  return (
    <div className="flex flex-col h-full px-6 pb-8">
      <div className="pt-4 pb-8">
        <h1 className="text-[28px] font-black tracking-tight" style={{ color: "#1a1410" }}>
          What matters most when{" "}
          <span style={{ color: "#ea580c" }}>meal planning</span>?
        </h1>
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
