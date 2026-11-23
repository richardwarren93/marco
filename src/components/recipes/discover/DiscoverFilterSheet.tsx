"use client";

import { useEffect } from "react";
import { DISPLAY, INK, INK_MUTED, PAPER, TOMATO } from "@/lib/theme";

export interface DiscoverFilters {
  mealTypes: string[];
  dietary: string[];
  maxTime: number; // 0 = any
}

const MEAL_TYPES = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snack" },
];

const DIETARY = [
  { key: "vegetarian", label: "Vegetarian" },
  { key: "vegan", label: "Vegan" },
  { key: "gluten_free", label: "Gluten Free" },
  { key: "dairy_free", label: "Dairy Free" },
  { key: "low_carb", label: "Low Carb" },
];

const ACCENT = TOMATO;

export function activeFilterCount(f: DiscoverFilters): number {
  return f.mealTypes.length + f.dietary.length + (f.maxTime > 0 ? 1 : 0);
}

export default function DiscoverFilterSheet({
  isOpen,
  onClose,
  value,
  onChange,
  totalFiltered,
}: {
  isOpen: boolean;
  onClose: () => void;
  value: DiscoverFilters;
  onChange: (next: DiscoverFilters) => void;
  totalFiltered: number;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggle = (list: string[], key: string) =>
    list.includes(key) ? list.filter((k) => k !== key) : [...list, key];

  const clearAll = () => onChange({ mealTypes: [], dietary: [], maxTime: 0 });

  const timeLabel = value.maxTime === 0 ? "Any time" : `Under ${value.maxTime} min`;

  const Pill = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      className="px-3.5 py-2 rounded-full text-[13px] font-medium transition-all active:scale-95"
      style={{
        background: active ? ACCENT : PAPER,
        color: active ? PAPER : INK,
        fontFamily: DISPLAY,
        fontWeight: 700,
        border: `2px solid ${INK}`,
        boxShadow: active ? `1px 1px 0 ${INK}` : `2px 2px 0 ${INK}`,
        transform: active ? "translate(1px, 1px)" : undefined,
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      <div className="fixed inset-0 z-[60]" style={{ background: "rgba(0,0,0,0.28)" }} onClick={onClose} />
      <div
        className="fixed left-0 right-0 bottom-0 z-[61]"
        style={{
          background: PAPER,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderTop: `2.5px solid ${INK}`,
          borderLeft: `2.5px solid ${INK}`,
          borderRight: `2.5px solid ${INK}`,
          paddingBottom: "calc(var(--safe-bottom, 0px) + 16px)",
          animation: "sheetUp 0.24s cubic-bezier(0.34,1.1,0.64,1) both",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <div className="mx-auto max-w-md px-5 pt-3">
          {/* Grabber */}
          <div className="mx-auto mb-3 rounded-full" style={{ width: 40, height: 4, background: INK, opacity: 0.25 }} />

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h3 style={{ fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)", fontVariationSettings: '"opsz" 60, "wght" 600', fontSize: 20, color: INK }}>
              Filters
            </h3>
            <button onClick={clearAll} className="text-[13px] font-semibold" style={{ color: ACCENT }}>
              Clear
            </button>
          </div>

          {/* Meal type */}
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-2.5" style={{ color: INK_MUTED }}>Meal type</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {MEAL_TYPES.map((m) => (
              <Pill key={m.key} label={m.label} active={value.mealTypes.includes(m.key)} onClick={() => onChange({ ...value, mealTypes: toggle(value.mealTypes, m.key) })} />
            ))}
          </div>

          {/* Dietary */}
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-2.5" style={{ color: INK_MUTED }}>Dietary</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {DIETARY.map((d) => (
              <Pill key={d.key} label={d.label} active={value.dietary.includes(d.key)} onClick={() => onChange({ ...value, dietary: toggle(value.dietary, d.key) })} />
            ))}
          </div>

          {/* Time */}
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: INK_MUTED }}>Time</p>
            <span className="text-[12px] font-semibold" style={{ color: INK }}>{timeLabel}</span>
          </div>
          <input
            type="range"
            min={0}
            max={60}
            step={15}
            value={value.maxTime}
            onChange={(e) => onChange({ ...value, maxTime: Number(e.target.value) })}
            className="w-full mb-1"
            style={{ accentColor: ACCENT }}
          />
          <div className="flex justify-between text-[10px] mb-7" style={{ color: INK_MUTED }}>
            <span>Any</span>
            <span>60 min</span>
          </div>

          {/* CTA */}
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
