"use client";

import type { MealPlan } from "@/types";
import CalendarCell from "./CalendarCell";
import type { SheetConfig } from "./RecipeAssignmentSheet";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
const MEAL_LABELS: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍎",
};

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export { getMonday, formatDateKey, addDays };

export default function WeeklyCalendar({
  mealPlans,
  householdPlans = [],
  onOpenSheet,
  onRemoveMeal,
  onSaveDraft,
  weekStart,
  onWeekChange,
  newlyAddedIds = [],
}: {
  mealPlans: MealPlan[];
  householdPlans?: MealPlan[];
  onOpenSheet: (config: SheetConfig) => void;
  onRemoveMeal: (planId: string) => void;
  onSaveDraft?: (planId: string) => void;
  weekStart: Date;
  onWeekChange: (date: Date) => void;
  newlyAddedIds?: string[];
}) {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = formatDateKey(new Date());

  // Build a lookup: date -> mealType -> MealPlan[]
  const plansByDateMeal: Record<string, Record<string, MealPlan[]>> = {};
  const allPlans = [...mealPlans, ...householdPlans];
  for (const plan of allPlans) {
    if (!plansByDateMeal[plan.planned_date]) {
      plansByDateMeal[plan.planned_date] = {};
    }
    if (!plansByDateMeal[plan.planned_date][plan.meal_type]) {
      plansByDateMeal[plan.planned_date][plan.meal_type] = [];
    }
    plansByDateMeal[plan.planned_date][plan.meal_type].push(plan);
  }

  function handleAddClick(dateKey: string, mealType: string) {
    onOpenSheet({
      recipeId: null,
      draftNotes: null,
      recipeTitle: "",
      defaultMealType: mealType,
      contextDate: dateKey,
      startInSearchMode: true,
    });
  }

  function handleTapMeal(plan: MealPlan, isDraft: boolean) {
    let title = "Untitled";
    let draftNotes: string | null = null;

    if (isDraft && plan.notes) {
      try {
        const parsed = JSON.parse(plan.notes);
        title = parsed.title || "Untitled";
        draftNotes = plan.notes;
      } catch {}
    } else if (plan.recipe?.title) {
      title = plan.recipe.title;
    }

    onOpenSheet({
      recipeId: plan.recipe_id ?? null,
      draftNotes,
      recipeTitle: title,
      defaultMealType: plan.meal_type,
      contextDate: plan.planned_date,
      startInSearchMode: false,
    });
  }

  const weekEnd = addDays(weekStart, 6);
  const monthLabel =
    weekStart.getMonth() === weekEnd.getMonth()
      ? weekStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : `${weekStart.toLocaleDateString("en-US", { month: "short" })} – ${weekEnd.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => onWeekChange(addDays(weekStart, -7))}
          className="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">{monthLabel}</span>
          <button
            onClick={() => onWeekChange(getMonday(new Date()))}
            className="text-[10px] text-orange-600 hover:text-orange-700 font-medium px-2 py-0.5 rounded-full bg-orange-50 hover:bg-orange-100 transition-colors"
          >
            Today
          </button>
        </div>
        <button
          onClick={() => onWeekChange(addDays(weekStart, 7))}
          className="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Calendar grid — horizontally scrollable on mobile */}
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
        <div className="min-w-[600px]">
          {/* Day headers */}
          <div className="grid grid-cols-[48px_repeat(7,1fr)] gap-1 mb-1">
            <div /> {/* spacer for meal type column */}
            {weekDays.map((day) => {
              const dateKey = formatDateKey(day);
              const isToday = dateKey === today;
              return (
                <div
                  key={dateKey}
                  className={`text-center py-1.5 rounded-lg ${isToday ? "bg-orange-100" : ""}`}
                >
                  <p className={`text-[10px] font-medium ${isToday ? "text-orange-700" : "text-gray-400"}`}>
                    {day.toLocaleDateString("en-US", { weekday: "short" })}
                  </p>
                  <p className={`text-sm font-bold ${isToday ? "text-orange-700" : "text-gray-700"}`}>
                    {day.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Meal rows */}
          {MEAL_TYPES.map((mealType) => (
            <div key={mealType} className="grid grid-cols-[48px_repeat(7,1fr)] gap-1 mb-1">
              {/* Meal type label */}
              <div className="flex items-center justify-center">
                <span className="text-sm" title={mealType}>
                  {MEAL_LABELS[mealType]}
                </span>
              </div>

              {/* Day cells */}
              {weekDays.map((day) => {
                const dateKey = formatDateKey(day);
                const plans = plansByDateMeal[dateKey]?.[mealType] || [];
                const isToday = dateKey === today;
                const hasNewPlan = plans.some((p) => newlyAddedIds.includes(p.id));

                return (
                  <div
                    key={`${dateKey}-${mealType}`}
                    className={`min-h-[48px] p-1 rounded-lg border transition-all duration-500 ${
                      hasNewPlan
                        ? "border-orange-300 bg-orange-50/60 ring-1 ring-orange-200 ring-offset-0"
                        : isToday
                        ? "border-orange-200 bg-orange-50/30"
                        : "border-gray-100 bg-white hover:border-gray-200"
                    }`}
                  >
                    <CalendarCell
                      plans={plans}
                      onAdd={() => handleAddClick(dateKey, mealType)}
                      onRemove={onRemoveMeal}
                      onSaveDraft={onSaveDraft}
                      onTapMeal={handleTapMeal}
                      newlyAddedIds={newlyAddedIds}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
