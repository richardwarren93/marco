"use client";

import KITCHEN_PALS from "./data/kitchen-pals";

interface Props {
  kitchenPal: string | null;
  onNext: () => void;
}

export default function WelcomeStep({ kitchenPal, onNext }: Props) {
  const pal = KITCHEN_PALS.find((p) => p.id === kitchenPal);

  return (
    <div className="flex flex-col h-full px-6 pb-8">
      {/* Pal greeting */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {pal && (
          <div className="animate-stagger-in mb-8">
            <span className="text-7xl block animate-pulse-soft">{pal.emoji}</span>
          </div>
        )}

        <div className="space-y-4 text-center">
          <h2
            className="text-[32px] font-black leading-[1.15] tracking-tight animate-stagger-in"
            style={{ color: "#1a1410", animationDelay: "0.1s" }}
          >
            Save recipes from{" "}
            <span style={{ color: "#ea580c" }}>anywhere</span>
          </h2>

          <h2
            className="text-[32px] font-black leading-[1.15] tracking-tight animate-stagger-in"
            style={{ color: "#1a1410", animationDelay: "0.25s" }}
          >
            Plan meals in{" "}
            <span style={{ color: "#ea580c" }}>seconds</span>
          </h2>

          <h2
            className="text-[32px] font-black leading-[1.15] tracking-tight animate-stagger-in"
            style={{ color: "#1a1410", animationDelay: "0.4s" }}
          >
            Shop and{" "}
            <span style={{ color: "#ea580c" }}>earn back</span>
          </h2>
        </div>
      </div>

      {/* Continue */}
      <div className="pt-6 animate-stagger-in" style={{ animationDelay: "0.6s" }}>
        <button
          onClick={onNext}
          className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98]"
          style={{ background: "#1a1410" }}
        >
          Let&apos;s go
        </button>
      </div>
    </div>
  );
}
