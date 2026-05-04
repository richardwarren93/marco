"use client";

import MustardUnderline from "@/components/brand/MustardUnderline";

export type DiscoverTab = "friends" | "community";

interface Props {
  active: DiscoverTab;
  onChange: (tab: DiscoverTab) => void;
}

/**
 * The Friends ↔ Community toggle. Two Fraunces-italic labels under a
 * marco-mono eyebrow; the active label gets the mustard wave underline
 * (the same primitive used on the desktop top tabs). Inactive labels
 * are unadorned ink-soft. The wave fades cleanly between active labels.
 */
export default function DiscoverToggle({ active, onChange }: Props) {
  return (
    <div className="text-center mb-7 sm:mb-9">
      <p className="marco-mono mb-3">What&apos;s on the table</p>
      <div className="inline-flex items-baseline gap-7 sm:gap-9">
        <ToggleLabel
          label="Friends"
          isActive={active === "friends"}
          onClick={() => onChange("friends")}
        />
        <ToggleLabel
          label="Community"
          isActive={active === "community"}
          onClick={() => onChange("community")}
        />
      </div>
    </div>
  );
}

function ToggleLabel({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className="relative pb-2 transition-colors"
      style={{
        fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
        fontStyle: "italic",
        fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 500',
        fontSize: "22px",
        letterSpacing: "-0.015em",
        color: isActive ? "var(--ink, #1C1A17)" : "var(--ink-soft, #4A4742)",
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.color = "var(--ink, #1C1A17)";
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.color = "var(--ink-soft, #4A4742)";
      }}
    >
      {label}
      <span
        aria-hidden="true"
        className="absolute left-0 right-0 bottom-0 pointer-events-none transition-opacity duration-200"
        style={{ opacity: isActive ? 1 : 0 }}
      >
        <MustardUnderline />
      </span>
    </button>
  );
}
