"use client";

import { useState, useRef } from "react";

interface Props {
  value: string;
  onNext: (dish: string) => void;
}

export default function SignatureDishStep({ value, onNext }: Props) {
  const [dish, setDish] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="flex flex-col h-full pb-24"
      style={{ background: "#faf9f7" }}
    >
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Emoji */}
        <div
          className="text-6xl mb-6 animate-stagger-in"
          style={{ animationDelay: "0.1s" }}
        >
          👨‍🍳
        </div>

        {/* Title */}
        <h1
          className="text-[28px] font-black tracking-tight text-center mb-2 animate-stagger-in"
          style={{ color: "#1a1410", animationDelay: "0.15s" }}
        >
          What&apos;s your{" "}
          <span style={{ color: "#ea580c" }}>Dream Meal</span>?
        </h1>

        <p
          className="text-sm text-center mb-8 animate-stagger-in"
          style={{ color: "#a09890", animationDelay: "0.2s" }}
        >
          If you could eat one meal for the rest of your life, what would it be?
        </p>

        {/* Input */}
        <div
          className="w-full max-w-sm animate-stagger-in"
          style={{ animationDelay: "0.3s" }}
        >
          <input
            ref={inputRef}
            type="text"
            value={dish}
            onChange={(e) => setDish(e.target.value)}
            onFocus={() => {
              setTimeout(() => {
                inputRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
              }, 300);
            }}
            placeholder="e.g. Grandma's lasagna, Thai green curry..."
            className="w-full px-5 py-4 rounded-2xl text-base bg-white outline-none text-center font-medium"
            style={{
              border: "2px solid #e8ddd3",
              color: "#1a1410",
              scrollMarginBottom: "120px",
            }}
            autoFocus
          />
        </div>

        <p
          className="text-xs text-center mt-4 animate-stagger-in"
          style={{ color: "#c4b8aa", animationDelay: "0.4s" }}
        >
          This will appear on your Taste DNA profile
        </p>
      </div>

      {/* Continue */}
      <div className="px-6 pt-2">
        <button
          onClick={() => onNext(dish)}
          className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98]"
          style={{
            background: dish.trim() ? "#ea580c" : "#e8ddd3",
            color: dish.trim() ? "white" : "#c4b8aa",
          }}
        >
          Continue
        </button>
        {!dish.trim() && (
          <button
            onClick={() => onNext("")}
            className="w-full py-3 text-sm font-medium mt-2 transition-colors"
            style={{ color: "#a09890" }}
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
