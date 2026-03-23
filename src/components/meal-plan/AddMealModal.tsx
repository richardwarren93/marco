"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Recipe } from "@/types";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
type MealType = (typeof MEAL_TYPES)[number];

const MEAL_PLACEHOLDER: Record<string, string> = {
  breakfast: "🥞",
  lunch: "🥗",
  dinner: "🍽️",
  snack: "🍎",
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default function AddMealModal({
  isOpen,
  date,
  mealType: initialMealType,
  weekStart: weekStartProp,
  onClose,
  onAdd,
  recipePool,
}: {
  isOpen: boolean;
  date: string;
  mealType: string;
  weekStart?: Date;
  onClose: () => void;
  onAdd: (recipeId: string, dates: string[], mealType: string, servings?: number) => void;
  recipePool?: Recipe[];
}) {
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  // Multi-select meal types (for filtering)
  const [selectedMealTypes, setSelectedMealTypes] = useState<Set<MealType>>(
    new Set([initialMealType as MealType])
  );
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [servings, setServings] = useState(1);
  // Week navigation — safe init to today's Monday (useEffect corrects it when modal opens)
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set([date].filter(Boolean)));
  const [loading, setLoading] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const usePool = recipePool !== undefined;

  // Reset on open
  useEffect(() => {
    if (!isOpen) return;
    setSelectedMealTypes(new Set([initialMealType as MealType]));
    setSelectedRecipeId(null);
    setServings(1);
    setPickerOpen(false);
    setSelectedDates(new Set(date ? [date] : [formatDateKey(new Date())]));

    // Use external weekStart prop if provided, otherwise derive from date
    if (weekStartProp) {
      setWeekStart(weekStartProp);
    } else {
      const parsedDate = date ? new Date(date + "T12:00:00") : new Date();
      const defaultDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
      setWeekStart(getMonday(defaultDate));
    }

    if (!usePool) {
      setLoading(true);
      supabase
        .from("recipes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)
        .then(({ data }) => {
          setAllRecipes((data as Recipe[]) || []);
          setLoading(false);
        });
    }
  }, [isOpen, date, initialMealType, usePool, weekStartProp]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close picker on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Clear recipe selection if it no longer matches any selected meal type
  useEffect(() => {
    if (!selectedRecipeId) return;
    const recipes = usePool ? recipePool! : allRecipes;
    const recipe = recipes.find((r) => r.id === selectedRecipeId);
    if (recipe) {
      const mt = (recipe.meal_type || "dinner") as MealType;
      if (!selectedMealTypes.has(mt)) setSelectedRecipeId(null);
    }
  }, [selectedMealTypes]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const baseRecipes = usePool ? recipePool! : allRecipes;

  // Show recipes matching ANY selected meal type
  const pickerRecipes = baseRecipes.filter((r) =>
    selectedMealTypes.has((r.meal_type || "dinner") as MealType)
  );
  // Fallback: if pool provided but nothing matches selected types, show full pool
  const displayRecipes =
    usePool && pickerRecipes.length === 0 ? baseRecipes : pickerRecipes;

  const selectedRecipe = baseRecipes.find((r) => r.id === selectedRecipeId);

  // Week grid: Mon → Sun
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = weekDays[6];
  const weekLabel = (() => {
    const startDay = weekStart.getDate();
    const endDay = weekEnd.getDate();
    const startMonth = weekStart.toLocaleDateString("en-US", { month: "long" });
    const endMonth = weekEnd.toLocaleDateString("en-US", { month: "long" });
    const year = weekEnd.getFullYear();
    if (weekStart.getMonth() === weekEnd.getMonth()) {
      return `${startMonth} ${startDay} – ${endDay}, ${year}`;
    }
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
  })();

  const todayKey = formatDateKey(new Date());

  function toggleMealType(mt: MealType) {
    setSelectedMealTypes((prev) => {
      const next = new Set(prev);
      if (next.has(mt)) {
        if (next.size > 1) next.delete(mt); // keep at least one
      } else {
        next.add(mt);
      }
      return next;
    });
  }

  function toggleDate(d: string) {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(d)) {
        if (next.size > 1) next.delete(d);
      } else {
        next.add(d);
      }
      return next;
    });
  }

  function handleAdd() {
    if (!selectedRecipeId || selectedDates.size === 0) return;
    // Use the recipe's own meal_type; fall back to first selected type
    const mealTypeToSave =
      selectedRecipe?.meal_type ||
      ([...selectedMealTypes][0] as string) ||
      "dinner";
    onAdd(selectedRecipeId, [...selectedDates], mealTypeToSave, servings);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[88vh] flex flex-col shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-semibold text-gray-900">Add to Plan</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4 space-y-5">

            {/* Meal type — multi-select */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Meal type</p>
              <div className="flex gap-1.5 flex-wrap">
                {MEAL_TYPES.map((mt) => {
                  const active = selectedMealTypes.has(mt);
                  return (
                    <button
                      key={mt}
                      onClick={() => toggleMealType(mt)}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium capitalize transition-colors ${
                        active
                          ? "bg-orange-500 text-white"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {mt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recipe picker */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Recipe</p>
              {loading ? (
                <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
              ) : (
                <div className="relative" ref={pickerRef}>
                  <button
                    onClick={() => setPickerOpen((o) => !o)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 border rounded-xl bg-white transition-colors text-left ${
                      pickerOpen ? "border-orange-400" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {selectedRecipe ? (
                      <>
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                          {selectedRecipe.image_url ? (
                            <img src={selectedRecipe.image_url} alt={selectedRecipe.title} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm">{MEAL_PLACEHOLDER[selectedRecipe.meal_type] || "🍳"}</span>
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-800 flex-1 line-clamp-1">{selectedRecipe.title}</span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-400 flex-1">Select a recipe…</span>
                    )}
                    <svg
                      className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${pickerOpen ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {pickerOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-52 overflow-y-auto">
                      {displayRecipes.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">No recipes found</p>
                      ) : (
                        displayRecipes.map((recipe) => (
                          <button
                            key={recipe.id}
                            onClick={() => { setSelectedRecipeId(recipe.id); setPickerOpen(false); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-orange-50 text-left transition-colors ${
                              recipe.id === selectedRecipeId ? "bg-orange-50" : ""
                            }`}
                          >
                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                              {recipe.image_url ? (
                                <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-sm">{MEAL_PLACEHOLDER[recipe.meal_type] || "🍳"}</span>
                              )}
                            </div>
                            <span className="text-sm font-medium text-gray-800 line-clamp-1 flex-1">{recipe.title}</span>
                            {recipe.id === selectedRecipeId && (
                              <svg className="w-4 h-4 text-orange-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Servings */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Servings</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setServings((s) => Math.max(1, s - 1))}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 font-bold text-lg leading-none"
                >−</button>
                <span className="text-base font-semibold text-gray-900 w-4 text-center">{servings}</span>
                <button
                  onClick={() => setServings((s) => s + 1)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 font-bold text-lg leading-none"
                >+</button>
              </div>
            </div>

            {/* When — week grid (navigation lives in the list view, not here) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">When</p>
                <span className="text-xs font-medium text-gray-500">{weekLabel}</span>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAY_LABELS.map((d) => (
                  <div key={d} className="text-center text-[10px] font-semibold text-gray-400 uppercase">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((day) => {
                  const key = formatDateKey(day);
                  const isSelected = selectedDates.has(key);
                  const isToday = key === todayKey;
                  return (
                    <button
                      key={key}
                      onClick={() => toggleDate(key)}
                      className={`flex items-center justify-center py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                        isSelected
                          ? "bg-orange-500 text-white"
                          : isToday
                          ? "bg-orange-100 text-orange-600 hover:bg-orange-200"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Add button */}
        <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={handleAdd}
            disabled={!selectedRecipeId || selectedDates.size === 0}
            className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold text-sm hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-40"
          >
            Add to plan{selectedDates.size > 1 ? ` (${selectedDates.size} days)` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
