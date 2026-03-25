"use client";

import { useState, useMemo } from "react";
import type { MealPlan, Recipe } from "@/types";

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
  existingTitle: string;
  incomingTitle: string;
};

function getWeekDates(mondayStr: string): { label: string; iso: string }[] {
  const monday = new Date(mondayStr + "T12:00:00");
  return DAY_SHORT.map((label, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return { label, iso: d.toISOString().split("T")[0] };
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
}: {
  selectedRecipes: Recipe[];
  planningWeek: string;
  existingMealPlans: MealPlan[];
  onBack: () => void;
  onDone: (assignments: DayAssignment[]) => Promise<void>;
}) {
  const weekDates = useMemo(() => getWeekDates(planningWeek), [planningWeek]);

  const [assignments, setAssignments] = useState<Record<string, DayAssignment>>(() => {
    const init: Record<string, DayAssignment> = {};
    for (const r of selectedRecipes) {
      init[r.id] = {
        recipeId: r.id,
        mealTypes: [(r.meal_type as MealType) || "dinner"],
        dates: [],
        servings: 2,
      };
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
      const dates = cur.dates.includes(iso)
        ? cur.dates.filter((d) => d !== iso)
        : [...cur.dates, iso];
      return { ...prev, [recipeId]: { ...cur, dates } };
    });
  }

  function toggleMealType(recipeId: string, mt: MealType) {
    setAssignments((prev) => {
      const cur = prev[recipeId];
      const mealTypes = cur.mealTypes.includes(mt)
        ? cur.mealTypes.length > 1 ? cur.mealTypes.filter((m) => m !== mt) : cur.mealTypes // keep at least 1
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

  const totalSlots = useMemo(() =>
    Object.values(assignments).reduce(
      (sum, a) => sum + a.dates.length * a.mealTypes.length, 0
    ), [assignments]);

  const readyCount = Object.values(assignments).filter((a) => a.dates.length > 0).length;

  // Build a lookup of existing meals: "date|mealType" → MealPlan
  const existingLookup = useMemo(() => {
    const map = new Map<string, MealPlan>();
    for (const mp of existingMealPlans) {
      map.set(`${mp.planned_date}|${mp.meal_type}`, mp);
    }
    return map;
  }, [existingMealPlans]);

  function detectConflicts(toSave: DayAssignment[]): ConflictItem[] {
    const found: ConflictItem[] = [];
    for (const a of toSave) {
      const recipe = selectedRecipes.find((r) => r.id === a.recipeId);
      for (const date of a.dates) {
        for (const mt of a.mealTypes) {
          const existing = existingLookup.get(`${date}|${mt}`);
          if (existing && existing.recipe) {
            found.push({
              date,
              mealType: mt,
              existingTitle: (existing.recipe as Recipe).title,
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
    if (found.length > 0) {
      setConflicts(found);
      setPendingAssignments(toSave);
      setShowConflictModal(true);
    } else {
      await save(toSave);
    }
  }

  async function save(toSave: DayAssignment[]) {
    setSaving(true);
    await onDone(toSave);
    setSaving(false);
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#faf9f7" }}>
      {/* Header */}
      <div className="px-4 pt-5 pb-4 border-b sticky top-0 z-10" style={{ background: "#faf9f7", borderColor: "#ede8e0" }}>
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-full mb-4 active:scale-90 transition-transform"
          style={{ background: "white", color: "#a09890", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-black tracking-tight" style={{ color: "#1a1410" }}>Assign to days</h1>
        <p className="text-sm mt-0.5" style={{ color: "#a09890" }}>Pick days, meal types, and servings for each meal</p>
      </div>

      {/* Meal cards */}
      <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto pb-32">
        {selectedRecipes.map((recipe, i) => {
          const a = assignments[recipe.id];
          const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
          const slotCount = a.dates.length * a.mealTypes.length;

          return (
            <div
              key={recipe.id}
              className="bg-white rounded-3xl overflow-hidden"
              style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.07)", animation: `cardPop 0.4s cubic-bezier(0.34,1.2,0.64,1) ${i * 60}ms both` }}
            >
              {/* Recipe info */}
              <div className="flex items-center gap-3 p-3 pb-0">
                <div className="w-12 h-12 rounded-2xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #fff4e8, #fde8cc)" }}>
                  {recipe.image_url
                    ? <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
                    : <span className="text-xl">🍳</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold line-clamp-1" style={{ color: "#1a1410" }}>{recipe.title}</p>
                  {totalTime > 0 && <p className="text-xs" style={{ color: "#a09890" }}>{totalTime} min</p>}
                </div>
                {slotCount > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#fff4e8", color: "#f97316" }}>
                    {slotCount}×
                  </span>
                )}
              </div>

              {/* Days */}
              <div className="px-3 pt-3 pb-1">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#a09890" }}>Days</p>
                <div className="flex gap-1.5 flex-wrap">
                  {weekDates.map(({ label, iso }) => {
                    const selected = a.dates.includes(iso);
                    return (
                      <button
                        key={iso}
                        onClick={() => toggleDay(recipe.id, iso)}
                        className="px-2.5 py-1 rounded-xl text-xs font-bold transition-all active:scale-95"
                        style={selected ? { background: "#1a1410", color: "white" } : { background: "#f5f0eb", color: "#a09890" }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Meal types (multi-select) */}
              <div className="px-3 pt-2 pb-1">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#a09890" }}>Meal type</p>
                <div className="flex gap-1.5 flex-wrap">
                  {MEAL_TYPES.map((mt) => {
                    const selected = a.mealTypes.includes(mt);
                    return (
                      <button
                        key={mt}
                        onClick={() => toggleMealType(recipe.id, mt)}
                        className="px-2.5 py-1 rounded-xl text-xs font-bold transition-all active:scale-95"
                        style={selected ? { background: "#f97316", color: "white" } : { background: "#f5f0eb", color: "#a09890" }}
                      >
                        {MEAL_LABELS[mt]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Servings */}
              <div className="px-3 pt-2 pb-3 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#a09890" }}>Servings</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => changeServings(recipe.id, -1)}
                    className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm transition-all active:scale-90"
                    style={{ background: "#f5f0eb", color: "#1a1410" }}
                  >−</button>
                  <span className="text-sm font-bold w-4 text-center" style={{ color: "#1a1410" }}>{a.servings}</span>
                  <button
                    onClick={() => changeServings(recipe.id, 1)}
                    className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm transition-all active:scale-90"
                    style={{ background: "#f5f0eb", color: "#1a1410" }}
                  >+</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Schedule CTA */}
      <div className="fixed bottom-20 left-0 right-0 px-4 z-20">
        <button
          onClick={handleSchedulePress}
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
              Schedule {totalSlots > 0 ? `${totalSlots} meal${totalSlots !== 1 ? "s" : ""}` : "meals"}
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>

      {/* Conflict modal */}
      {showConflictModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(26,20,16,0.5)" }}>
          <div
            className="w-full max-w-sm bg-white rounded-3xl overflow-hidden"
            style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.2)", animation: "fadeSlideUp 0.3s ease both" }}
          >
            {/* Modal header */}
            <div className="px-5 pt-5 pb-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3" style={{ background: "#fff4e8" }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#f97316" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <h2 className="text-base font-black" style={{ color: "#1a1410" }}>Replacing existing meals</h2>
              <p className="text-sm mt-1" style={{ color: "#a09890" }}>
                These slots already have meals — scheduling will add alongside them:
              </p>
            </div>

            {/* Conflict list */}
            <div className="px-5 pb-3 space-y-2 max-h-48 overflow-y-auto">
              {conflicts.map((c, i) => (
                <div key={i} className="rounded-2xl px-3 py-2.5" style={{ background: "#faf9f7" }}>
                  <p className="text-xs font-bold" style={{ color: "#1a1410" }}>
                    {formatDate(c.date)} · {MEAL_LABELS[c.mealType]}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#a09890" }}>
                    Already has: <span style={{ color: "#1a1410" }}>{c.existingTitle}</span>
                  </p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 flex gap-2 pt-2">
              <button
                onClick={() => setShowConflictModal(false)}
                className="flex-1 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95"
                style={{ background: "#f5f0eb", color: "#1a1410" }}
              >
                Go back
              </button>
              <button
                onClick={async () => {
                  setShowConflictModal(false);
                  await save(pendingAssignments);
                }}
                className="flex-1 py-3 rounded-2xl font-bold text-sm text-white transition-all active:scale-95"
                style={{ background: "#1a1410" }}
              >
                Schedule anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
