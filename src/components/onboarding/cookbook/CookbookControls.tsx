"use client";

// Shared cookbook-styled controls used across the converted question steps:
// the dark "Continue" button and the cream selectable option card.

import type { ReactNode } from "react";

export function CookbookButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3.5 px-4 text-white rounded-2xl disabled:opacity-40 font-semibold text-sm shadow-sm transition-colors active:scale-[0.98]"
      style={{ background: disabled ? "rgba(28, 26, 23, 0.35)" : "#1C1A17" }}
    >
      {children}
    </button>
  );
}

export function CookbookOptionCard({
  label,
  sublabel,
  icon,
  selected,
  onClick,
  delay = 0,
}: {
  label: ReactNode;
  sublabel?: ReactNode;
  icon?: ReactNode;
  selected: boolean;
  onClick: () => void;
  delay?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-all active:scale-[0.98]"
      style={{
        background: selected ? "rgba(229, 70, 46, 0.08)" : "rgba(255, 253, 247, 0.55)",
        border: selected ? "1.5px solid #E5462E" : "1px solid rgba(28, 26, 23, 0.14)",
        borderRadius: 12,
        animation: `cookbook-ink-fade-in 0.5s ease-out ${delay}s both`,
      }}
    >
      {icon && (
        <span className="flex-shrink-0" style={{ color: selected ? "#E5462E" : "rgba(28, 26, 23, 0.7)" }}>
          {icon}
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span
          className="block"
          style={{
            fontFamily: "var(--font-display, Georgia, serif)",
            fontVariationSettings: '"opsz" 14, "wght" 500',
            fontSize: "15px",
            lineHeight: 1.35,
            color: "#1C1A17",
          }}
        >
          {label}
        </span>
        {sublabel && (
          <span
            className="block mt-0.5"
            style={{
              fontFamily: "var(--font-display, Georgia, serif)",
              fontStyle: "italic",
              fontSize: "12.5px",
              color: "rgba(28, 26, 23, 0.55)",
            }}
          >
            {sublabel}
          </span>
        )}
      </span>
      {selected && <span style={{ color: "#E5462E", fontSize: 20 }}>✓</span>}
    </button>
  );
}
