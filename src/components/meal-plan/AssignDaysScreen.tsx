"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import type { MealPlan, Recipe } from "@/types";

// ─── Theme ─────────────────────────────────────────────────────────────────────
const ACCENT = "#ea580c";
const ACCENT_LIGHT = "#fff7ed";

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
  mealTypes: MealType[];
  dates: string[];
  servings: number;
};

type ConflictItem = {
  date: string;
  mealType: MealType;
  existingMeals: { id: string; title: string }[];
  incomingTitle: string;
};

function getWeekDates(mondayStr: string): { label: string; dayNum: number; iso: string }[] {
  const monday = new Date(mondayStr + "T12:00:00");
  return DAY_SHORT.map((label, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return { label, dayNum: d.getDate(), iso: d.toISOString().split("T")[0] };
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function AssignDaysScreen({
  selectedRecipes,
  planningWeek,
  existingMealPlans,
  onBack,
  onDone,
  onRemoveMeal,
  defaultServings,
}: {
  selectedRecipes: Recipe[];
  planningWeek: string;
  existingMealPlans: MealPlan[];
  onBack: () => void;
  onDone: (assignments: DayAssignment[]) => Promise<void>;
  onRemoveMeal?: (planId: string) => void | Promise<void>;
  defaultServings?: number;
}) {
  const weekDates = useMemo(() => getWeekDates(planningWeek), [planningWeek]);

  const [assignments, setAssignments] = useState<Record<string, DayAssignment>>(() => {
    const init: Record<string, DayAssignment> = {};
    for (const r of selectedRecipes) {
      init[r.id] = { recipeId: r.id, mealTypes: [(r.meal_type as MealType) || "dinner"], dates: [], servings: defaultServings || 2 };
    }
    return init;
  });

  const [saving, setSaving] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [pendingAssignments, setPendingAssignments] = useState<DayAssignment[]>([]);

  function toggleDay(recipeId: string, iso: string) {
    setAssignments((prev) => {
      const cur = prev[recipeId];
      const dates = cur.dates.includes(iso) ? cur.dates.filter((d) => d !== iso) : [...cur.dates, iso];
      return { ...prev, [recipeId]: { ...cur, dates } };
    });
  }

  function toggleMealType(recipeId: string, mt: MealType) {
    setAssignments((prev) => {
      const cur = prev[recipeId];
      const mealTypes = cur.mealTypes.includes(mt)
        ? cur.mealTypes.length > 1 ? cur.mealTypes.filter((m) => m !== mt) : cur.mealTypes
        : [...cur.mealTypes, mt];
      return { ...prev, [recipeId]: { ...cur, mealTypes } };
    });
  }

  function changeServings(recipeId: string, delta: number) {
    setAssignments((prev) => {
      const cur = prev[recipeId];
      const servings = Math.max(1, Math.min(20, cur.servings + delta));
      return { ...prev, [recipeId]: { ...cur, servings } };
    });
  }

  const totalSlots = useMemo(
    () => Object.values(assignments).reduce((sum, a) => sum + a.dates.length * a.mealTypes.length, 0),
    [assignments]
  );
  const readyCount = Object.values(assignments).filter((a) => a.dates.length > 0).length;

  const existingLookup = useMemo(() => {
    const map = new Map<string, MealPlan[]>();
    for (const mp of existingMealPlans) {
      const key = `${mp.planned_date}|${mp.meal_type}`;
      const arr = map.get(key) || [];
      arr.push(mp);
      map.set(key, arr);
    }
    return map;
  }, [existingMealPlans]);

  function detectConflicts(toSave: DayAssignment[]): ConflictItem[] {
    const found: ConflictItem[] = [];
    for (const a of toSave) {
      const recipe = selectedRecipes.find((r) => r.id === a.recipeId);
      for (const date of a.dates) {
        for (const mt of a.mealTypes) {
          const existingList = existingLookup.get(`${date}|${mt}`) || [];
          if (existingList.length > 0) {
            found.push({
              date,
              mealType: mt,
              existingMeals: existingList
                .filter((mp) => mp.recipe)
                .map((mp) => ({ id: mp.id, title: (mp.recipe as Recipe).title })),
              incomingTitle: recipe?.title ?? "New meal",
            });
          }
        }
      }
    }
    return found;
  }

  async function handleSchedulePress() {
    const toSave = Object.values(assignments).filter((a) => a.dates.length > 0);
    if (toSave.length === 0) return;
    const found = detectConflicts(toSave);
    if (found.length > 0) { setConflicts(found); setPendingAssignments(toSave); setShowConflictModal(true); }
    else await save(toSave);
  }

  async function save(toSave: DayAssignment[]) {
    setSaving(true);
    await onDone(toSave);
    setSaving(false);
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#f6f6f4" }}>
      {/* Header */}
      <div className="px-4 pt-5 pb-4 border-b sticky top-0 z-10" style={{ background: "#f6f6f4", borderColor: "#eaeae8" }}>
        <div className="max-w-2xl mx-auto">
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center rounded-full mb-4 active:scale-90 transition-transform"
            style={{ background: "white", color: "#888", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "#1a1a1a" }}>Place on calendar</h1>
          <p className="text-sm mt-0.5" style={{ color: "#888" }}>Choose days and meal types for each recipe</p>
        </div>
      </div>

      {/* Meal cards */}
      <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto max-w-2xl mx-auto w-full" style={{ paddingBottom: "160px" }}>
        {selectedRecipes.map((recipe, i) => {
          const a = assignments[recipe.id];
          const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
          const slotCount = a.dates.length * a.mealTypes.length;

          return (
            <div
              key={recipe.id}
              className="bg-white rounded-2xl overflow-hidden"
              style={{
                boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
                animation: `cardPop 0.4s cubic-bezier(0.34,1.2,0.64,1) ${i * 60}ms both`,
              }}
            >
              {/* Recipe info */}
              <div className="flex items-center gap-3 p-3.5 pb-0">
                <div className="w-11 h-11 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center" style={{ background: "#f3f3f1" }}>
                  {recipe.image_url
                    ? <div className="relative w-full h-full"><Image src={recipe.image_url} alt={recipe.title} fill className="object-cover" sizes="44px" /></div>
                    : <span className="text-lg">🍳</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold line-clamp-1" style={{ color: "#1a1a1a" }}>{recipe.title}</p>
                  {totalTime > 0 && <p className="text-xs mt-0.5" style={{ color: "#888" }}>{totalTime} min</p>}
                </div>
              </div>

              {/* Days */}
              <div className="px-3.5 pt-3 pb-1">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#bbb" }}>Days</p>
                <div className="flex gap-1.5 flex-wrap">
                  {weekDates.map(({ label, dayNum, iso }) => {
                    const selected = a.dates.includes(iso);
                    return (
                      <button
                        key={iso}
                        onClick={() => toggleDay(recipe.id, iso)}
                        className="flex flex-col items-center px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 min-w-[40px]"
                        style={selected ? { background: "#1a1a1a", color: "white" } : { background: "#f3f3f1", color: "#888" }}
                      >
                        <span className="text-[10px] font-semibold">{label}</span>
                        <span className="text-sm font-bold leading-tight">{dayNum}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Meal types */}
              <div className="px-3.5 pt-2 pb-1">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#bbb" }}>Meal type</p>
                <div className="flex gap-1.5 flex-wrap">
                  {MEAL_TYPES.map((mt) => {
                    const selected = a.mealTypes.includes(mt);
                    return (
                      <button
                        key={mt}
                        onClick={() => toggleMealType(recipe.id, mt)}
                        className="px-2.5 py-1 rounded-xl text-xs font-bold transition-all active:scale-95"
                        style={selected ? { background: ACCENT, color: "white" } : { background: "#f3f3f1", color: "#888" }}
                      >
                        {MEAL_LABELS[mt]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Servings */}
              <div className="px-3.5 pt-2 pb-3.5 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#bbb" }}>Servings</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => changeServings(recipe.id, -1)} className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm transition-all active:scale-90" style={{ background: "#f3f3f1", color: "#1a1a1a" }}>−</button>
                  <span className="text-sm font-bold w-4 text-center" style={{ color: "#1a1a1a" }}>{a.servings}</span>
                  <button onClick={() => changeServings(recipe.id, 1)} className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm transition-all active:scale-90" style={{ background: "#f3f3f1", color: "#1a1a1a" }}>+</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Schedule CTA */}
      <div className="fixed left-0 right-0 px-4 z-20 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:bottom-6">
        <div className="max-w-2xl mx-auto">
        <button
          onClick={handleSchedulePress}
          disabled={readyCount === 0 || saving}
          className="w-full py-4 text-white rounded-2xl font-bold text-base active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: "#1a1a1a", boxShadow: "0 4px 20px rgba(0,0,0,0.18)" }}
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
              Schedule {totalSlots > 0 ? `${totalSlots} meal${totalSlots !== 1 ? "s" : ""}` : "meals"}
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
        </div>
      </div>

      {/* Conflict modal */}
      {showConflictModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.35)" }}
          onClick={() => setShowConflictModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl overflow-hidden relative"
            style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.18)", animation: "fadeSlideUp 0.3s ease both" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* X close button */}
            <button
              onClick={() => setShowConflictModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors z-10"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="px-5 pt-5 pb-3 pr-12">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3" style={{ background: "#f3f3f1" }}>
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-base font-bold" style={{ color: "#1a1a1a" }}>Some meals already exist</h2>
              <p className="text-sm mt-1" style={{ color: "#888" }}>
                Choose how to handle the conflicts below.
              </p>
            </div>

            {/* Conflict list */}
            <div className="px-5 pb-3 space-y-2 max-h-48 overflow-y-auto">
              {conflicts.map((c, i) => (
                <div key={i} className="rounded-xl px-3 py-2.5" style={{ background: "#f6f6f4" }}>
                  <p className="text-xs font-semibold" style={{ color: "#1a1a1a" }}>
                    {formatDate(c.date)} · {MEAL_LABELS[c.mealType]}
                    {c.existingMeals.length > 1 && (
                      <span className="text-gray-400 font-normal"> ({c.existingMeals.length} meals)</span>
                    )}
                  </p>
                  {c.existingMeals.map((m, j) => (
                    <p key={j} className="text-xs mt-0.5" style={{ color: "#888" }}>
                      {c.existingMeals.length > 1 ? `${j + 1}. ` : "Already has: "}
                      <span style={{ color: "#1a1a1a" }}>{m.title}</span>
                    </p>
                  ))}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 space-y-2 pt-2">
              {onRemoveMeal && (
                <button
                  onClick={async () => {
                    setShowConflictModal(false);
                    // Remove ALL conflicting meals first, then add new ones
                    const removePromises = conflicts.flatMap((c) =>
                      c.existingMeals.map((m) => Promise.resolve(onRemoveMeal!(m.id)))
                    );
                    await Promise.all(removePromises);
                    // Small delay to let DB sync
                    await new Promise((r) => setTimeout(r, 300));
                    await save(pendingAssignments);
                  }}
                  className="w-full py-3 rounded-2xl font-semibold text-sm text-white transition-all active:scale-95"
                  style={{ background: "#ea580c" }}
                >
                  Replace existing meals
                </button>
              )}
              <button
                onClick={async () => { setShowConflictModal(false); await save(pendingAssignments); }}
                className="w-full py-3 rounded-2xl font-semibold text-sm transition-all active:scale-95"
                style={{ background: "#f3f3f1", color: "#1a1a1a" }}
              >
                Add anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
