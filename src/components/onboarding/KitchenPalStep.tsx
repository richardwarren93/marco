"use client";

import { useState } from "react";
import KITCHEN_PALS from "./data/kitchen-pals";

interface Props {
  value: string | null;
  onNext: (pal: string) => void;
}

export default function KitchenPalStep({ value, onNext }: Props) {
  const [selected, setSelected] = useState(value);

  return (
    <div className="flex flex-col h-full px-6 pb-8">
      {/* Heading */}
      <div className="text-center pt-4 pb-6">
        <h1 className="text-[28px] font-black tracking-tight" style={{ color: "#1a1410" }}>
          Choose your kitchen pal
        </h1>
        <p className="text-sm mt-2" style={{ color: "#a09890" }}>
          They&apos;ll keep you company on your cooking journey
        </p>
      </div>

      {/* 2x3 grid */}
      <div className="grid grid-cols-2 gap-3 flex-1">
        {KITCHEN_PALS.map((pal, i) => {
          const isSelected = selected === pal.id;
          return (
            <button
              key={pal.id}
              onClick={() => setSelected(pal.id)}
              className="animate-stagger-in relative rounded-3xl p-4 flex flex-col items-center justify-center gap-2 transition-all duration-200 active:scale-[0.97]"
              style={{
                animationDelay: `${i * 0.07}s`,
                background: isSelected ? undefined : pal.bgGradient,
                border: isSelected ? "2.5px solid #ea580c" : "2.5px solid transparent",
                boxShadow: isSelected
                  ? "0 0 0 3px rgba(234,88,12,0.15), 0 4px 20px rgba(234,88,12,0.1)"
                  : "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              {/* Checkmark */}
              {isSelected && (
                <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-[#ea580c] flex items-center justify-center animate-bounce-in">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              {/* Character */}
              <span className="text-6xl" style={{ filter: isSelected ? "none" : "saturate(0.85)" }}>
                {pal.emoji}
              </span>

              {/* Name + tagline */}
              <div className="text-center">
                <p className="font-bold text-[15px]" style={{ color: "#1a1410" }}>
                  {pal.name}
                </p>
                <p className="text-xs" style={{ color: "#a09890" }}>
                  {pal.tagline}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Continue button */}
      <div className="pt-6">
        <button
          onClick={() => selected && onNext(selected)}
          disabled={!selected}
          className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: selected ? "#1a1410" : "#d4d0cc",
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
