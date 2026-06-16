"use client";

import { useEffect } from "react";

export interface RecipeFilters {
  sort: "newest" | "prep_time";
  mealTypes: string[];
}

const SORTS: { key: RecipeFilters["sort"]; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "prep_time", label: "Quickest" },
];

const MEAL_TYPES = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snack" },
];

const ACCENT = "#E5462E";
const INK = "#1C1A17";

/** Count of active constraints — drives the filter button's badge. Sort counts
 *  only when it's off the default (newest). */
export function recipeFilterCount(f: RecipeFilters): number {
  return f.mealTypes.length + (f.sort !== "newest" ? 1 : 0);
}

export default function RecipeFilterSheet({
  isOpen,
  onClose,
  value,
  onChange,
  totalFiltered,
}: {
  isOpen: boolean;
  onClose: () => void;
  value: RecipeFilters;
  onChange: (next: RecipeFilters) => void;
  totalFiltered: number;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleMeal = (key: string) =>
    onChange({ ...value, mealTypes: value.mealTypes.includes(key) ? value.mealTypes.filter((k) => k !== key) : [...value.mealTypes, key] });

  const clearAll = () => onChange({ sort: "newest", mealTypes: [] });

  const Pill = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      className="px-3.5 py-2 rounded-full text-[13px] font-medium transition-all active:scale-95"
      style={{
        background: active ? ACCENT : "#F2EEE6",
        color: active ? "#fff" : INK,
        boxShadow: active ? "0 1px 6px rgba(229,70,46,0.28)" : "none",
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      <div className="fixed inset-0 z-[55]" style={{ background: "rgba(0,0,0,0.28)" }} onClick={onClose} />
      <div
        className="fixed left-0 right-0 bottom-0 z-[56] rounded-t-3xl"
        style={{
          background: "#FBF7EF",
          paddingBottom: "calc(var(--safe-bottom, 0px) + 16px)",
          boxShadow: "0 -12px 40px rgba(20,12,5,0.18)",
          animation: "sheetUp 0.24s cubic-bezier(0.34,1.1,0.64,1) both",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <div className="mx-auto max-w-md px-5 pt-3">
          <div className="mx-auto mb-3 rounded-full" style={{ width: 40, height: 4, background: "rgba(28,26,23,0.15)" }} />

          <div className="flex items-center justify-between mb-5">
            <h3 style={{ fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)", fontVariationSettings: '"opsz" 60, "wght" 600', fontSize: 20, color: INK }}>
              Filter & sort
            </h3>
            <button onClick={clearAll} className="text-[13px] font-semibold" style={{ color: ACCENT }}>Clear</button>
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-2.5" style={{ color: "#8a847a" }}>Sort by</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {SORTS.map((s) => (
              <Pill key={s.key} label={s.label} active={value.sort === s.key} onClick={() => onChange({ ...value, sort: s.key })} />
            ))}
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-2.5" style={{ color: "#8a847a" }}>Meal type</p>
          <div className="flex flex-wrap gap-2 mb-7">
            {MEAL_TYPES.map((m) => (
              <Pill key={m.key} label={m.label} active={value.mealTypes.includes(m.key)} onClick={() => toggleMeal(m.key)} />
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl font-semibold text-[14px] text-white active:scale-[0.98] transition-all"
            style={{ background: INK }}
          >
            Show {totalFiltered} {totalFiltered === 1 ? "recipe" : "recipes"}
          </button>
        </div>
      </div>
    </>
  );
}
