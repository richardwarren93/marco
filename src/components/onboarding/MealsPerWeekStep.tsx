"use client";

import { useState } from "react";

const OPTIONS = [
  { id: "1-3", label: "1-3", sub: "Just getting started" },
  { id: "4-6", label: "4-6", sub: "A few times a week" },
  { id: "7-10", label: "7-10", sub: "Most meals at home" },
  { id: "11-14", label: "11-14", sub: "Almost every meal" },
  { id: "15+", label: "15+", sub: "Home chef mode" },
];

interface Props {
  value: string | null;
  onNext: (meals: string) => void;
}

export default function MealsPerWeekStep({ value, onNext }: Props) {
  const [selected, setSelected] = useState(value);

  return (
    <div className="flex flex-col h-full px-6 pb-24">
      <div className="pt-4 pb-8">
        <h1 className="text-[28px] font-black tracking-tight" style={{ color: "#1a1410" }}>
          How many meals a week do you{" "}
          <span style={{ color: "#ea580c" }}>cook at home</span>?
        </h1>
      </div>

      <div className="flex flex-wrap gap-3 flex-1 content-start">
        {OPTIONS.map((opt, i) => {
          const isSelected = selected === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setSelected(opt.id)}
              className="animate-stagger-in flex flex-col items-center justify-center rounded-2xl transition-all duration-200 active:scale-[0.97]"
              style={{
                animationDelay: `${i * 0.06}s`,
                width: "calc(50% - 6px)",
                padding: "20px 12px",
                background: isSelected ? "#fff4ec" : "white",
                border: isSelected ? "2px solid #ea580c" : "2px solid #e8e8e5",
                boxShadow: isSelected ? "0 0 0 3px rgba(234,88,12,0.1)" : "none",
              }}
            >
              <span
                className="text-3xl font-black"
                style={{ color: isSelected ? "#ea580c" : "#1a1410" }}
              >
                {opt.label}
              </span>
              <span className="text-xs mt-1" style={{ color: "#a09890" }}>
                {opt.sub}
              </span>
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
