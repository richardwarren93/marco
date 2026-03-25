"use client";

import { useState, useMemo } from "react";
import type { Recipe } from "@/types";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
type MealType = (typeof MEAL_TYPES)[number];

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type DayAssignment = {
  recipeId: string;
  mealType: MealType;
  dates: string[]; // ISO date strings
};

function getWeekDates(mondayStr: string): { label: string; iso: string }[] {
  const monday = new Date(mondayStr + "T12:00:00");
  return DAY_SHORT.map((label, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return { label, iso: d.toISOString().split("T")[0] };
  });
}

export default function AssignDaysScreen({
  selectedRecipes,
  planningWeek,
  onBack,
  onDone,
}: {
  selectedRecipes: Recipe[];
  planningWeek: string; // ISO Monday date string
  onBack: () => void;
  onDone: (assignments: DayAssignment[]) => Promise<void>;
}) {
  const weekDates = useMemo(() => getWeekDates(planningWeek), [planningWeek]);

  // Per-recipe state: days selected + meal type
  const [assignments, setAssignments] = useState<Record<string, DayAssignment>>(() => {
    const init: Record<string, DayAssignment> = {};
    for (const r of selectedRecipes) {
      init[r.id] = {
        recipeId: r.id,
        mealType: (r.meal_type as MealType) || "dinner",
        dates: [],
      };
    }
    return init;
  });

  const [saving, setSaving] = useState(false);

  function toggleDay(recipeId: string, iso: string) {
    setAssignments((prev) => {
      const cur = prev[recipeId];
      const dates = cur.dates.includes(iso)
        ? cur.dates.filter((d) => d !== iso)
        : [...cur.dates, iso];
      return { ...prev, [recipeId]: { ...cur, dates } };
    });
  }

  function setMealType(recipeId: string, mealType: MealType) {
    setAssignments((prev) => ({
      ...prev,
      [recipeId]: { ...prev[recipeId], mealType },
    }));
  }

  const readyCount = Object.values(assignments).filter((a) => a.dates.length > 0).length;
  const totalSlots = Object.values(assignments).reduce((sum, a) => sum + a.dates.length, 0);

  async function handleDone() {
    const toSave = Object.values(assignments).filter((a) => a.dates.length > 0);
    if (toSave.length === 0) return;
    setSaving(true);
    await onDone(toSave);
    setSaving(false);
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#faf9f7" }}>
      {/* Header */}
      <div
        className="px-4 pt-5 pb-4 border-b sticky top-0 z-10"
        style={{ background: "#faf9f7", borderColor: "#ede8e0" }}
      >
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-full mb-4 active:scale-90 transition-transform"
          style={{ background: "white", color: "#a09890", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-black tracking-tight" style={{ color: "#1a1410" }}>
          Assign to days
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "#a09890" }}>
          Pick which days each meal lands on
        </p>
      </div>

      {/* Meal cards */}
      <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto pb-32">
        {selectedRecipes.map((recipe, i) => {
          const a = assignments[recipe.id];
          const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);

          return (
            <div
              key={recipe.id}
              className="bg-white rounded-3xl overflow-hidden"
              style={{
                boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
                animation: `cardPop 0.4s cubic-bezier(0.34,1.2,0.64,1) ${i * 60}ms both`,
              }}
            >
              {/* Recipe info row */}
              <div className="flex items-center gap-3 p-3 pb-0">
                <div className="w-12 h-12 rounded-2xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #fff4e8, #fde8cc)" }}>
                  {recipe.image_url ? (
                    <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl">🍳</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold line-clamp-1" style={{ color: "#1a1410" }}>
                    {recipe.title}
                  </p>
                  {totalTime > 0 && (
                    <p className="text-xs" style={{ color: "#a09890" }}>{totalTime} min</p>
                  )}
                </div>
                {a.dates.length > 0 && (
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "#fff4e8", color: "#f97316" }}
                  >
                    {a.dates.length}×
                  </span>
                )}
              </div>

              {/* Day picker */}
              <div className="px-3 pt-3 pb-1">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#a09890" }}>
                  Days
                </p>
                <div className="flex gap-1.5 flex-wrap">
                  {weekDates.map(({ label, iso }) => {
                    const selected = a.dates.includes(iso);
                    return (
                      <button
                        key={iso}
                        onClick={() => toggleDay(recipe.id, iso)}
                        className="px-2.5 py-1 rounded-xl text-xs font-bold transition-all active:scale-95"
                        style={
                          selected
                            ? { background: "#1a1410", color: "white" }
                            : { background: "#f5f0eb", color: "#a09890" }
                        }
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Meal type picker */}
              <div className="px-3 pt-2 pb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#a09890" }}>
                  Meal
                </p>
                <div className="flex gap-1.5 flex-wrap">
                  {MEAL_TYPES.map((mt) => {
                    const selected = a.mealType === mt;
                    return (
                      <button
                        key={mt}
                        onClick={() => setMealType(recipe.id, mt)}
                        className="px-2.5 py-1 rounded-xl text-xs font-bold transition-all active:scale-95"
                        style={
                          selected
                            ? { background: "#f97316", color: "white" }
                            : { background: "#f5f0eb", color: "#a09890" }
                        }
                      >
                        {MEAL_LABELS[mt]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Done CTA */}
      <div className="fixed bottom-20 left-0 right-0 px-4 z-20">
        <button
          onClick={handleDone}
          disabled={readyCount === 0 || saving}
          className="w-full py-4 text-white rounded-2xl font-bold text-base active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: "#1a1410", boxShadow: "0 4px 20px rgba(26,20,16,0.2)" }}
        >
          {saving ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Scheduling…
            </>
          ) : (
            <>
              Schedule {totalSlots > 0 ? `${totalSlots} meal${totalSlots > 1 ? "s" : ""}` : "meals"}
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
