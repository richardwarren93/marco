"use client";

import { useRef, useEffect, useState } from "react";

interface OnboardingShellProps {
  step: number;
  totalSteps: number;
  direction: "forward" | "back";
  onBack: () => void;
  children: React.ReactNode;
  hideBack?: boolean;
}

export default function OnboardingShell({
  step,
  direction,
  onBack,
  children,
  hideBack,
}: OnboardingShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [animClass, setAnimClass] = useState("animate-slide-in-right");

  useEffect(() => {
    setAnimClass(
      direction === "forward" ? "animate-slide-in-right" : "animate-slide-in-left"
    );
  }, [step, direction]);

  return (
    <div className="max-w-2xl mx-auto w-full flex flex-col min-h-[calc(100vh-10rem)] sm:min-h-[calc(100vh-5rem)]">
      {/* Header with back button only */}
      <div className="flex items-center px-4 py-2 flex-shrink-0">
        {!hideBack && step > 0 ? (
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors active:scale-95"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        ) : (
          <div className="w-10 h-10" />
        )}
        <div className="flex-1" />
        <div className="w-10 h-10" />
      </div>

      {/* Step content with slide animation */}
      <div
        ref={containerRef}
        key={step}
        className={`flex-1 overflow-y-auto overscroll-none ${animClass}`}
      >
        {children}
      </div>
    </div>
  );
}
