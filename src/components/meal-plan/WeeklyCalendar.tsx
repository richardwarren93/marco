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
  weekStart,
  onWeekChange,
  newlyAddedIds = [],
}: {
  mealPlans: MealPlan[];
  householdPlans?: MealPlan[];
  onOpenSheet: (config: SheetConfig) => void;
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
      existingPlanId: null,
      isDraft: false,
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
      existingPlanId: plan.id,
      isDraft,
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
        <div className="min-w-[560px]">

          {/* Single containing box — one border instead of 28 individual cell boxes */}
          <div className="rounded-xl border border-gray-100 overflow-hidden">

            {/* Day headers */}
            <div className="grid grid-cols-[32px_repeat(7,1fr)] border-b border-gray-100 bg-gray-50/40">
              <div /> {/* spacer for icon column */}
              {weekDays.map((day) => {
                const dateKey = formatDateKey(day);
                const isToday = dateKey === today;
                return (
                  <div
                    key={dateKey}
                    className={`text-center py-1.5 ${isToday ? "bg-orange-50" : ""}`}
                  >
                    <p className={`text-[10px] font-medium ${isToday ? "text-orange-500" : "text-gray-400"}`}>
                      {day.toLocaleDateString("en-US", { weekday: "short" })}
                    </p>
                    <p className={`text-sm font-bold ${isToday ? "text-orange-600" : "text-gray-700"}`}>
                      {day.getDate()}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Meal rows — separated by thin rules, no per-cell borders */}
            {MEAL_TYPES.map((mealType, rowIndex) => (
              <div
                key={mealType}
                className={`grid grid-cols-[32px_repeat(7,1fr)] ${
                  rowIndex < MEAL_TYPES.length - 1 ? "border-b border-gray-100/70" : ""
                }`}
              >
                {/* Meal type icon — subtle marker, not a focal element */}
                <div className="flex justify-center pt-2.5 opacity-40">
                  <span className="text-sm leading-none" title={mealType}>
                    {MEAL_LABELS[mealType]}
                  </span>
                </div>

                {/* Day cells — open, no individual borders */}
                {weekDays.map((day) => {
                  const dateKey = formatDateKey(day);
                  const plans = plansByDateMeal[dateKey]?.[mealType] || [];
                  const isToday = dateKey === today;
                  const hasNewPlan = plans.some((p) => newlyAddedIds.includes(p.id));

                  return (
                    <div
                      key={`${dateKey}-${mealType}`}
                      className={`min-h-[46px] px-0.5 py-1 transition-colors duration-300 ${
                        hasNewPlan
                          ? "bg-orange-50/80"
                          : isToday
                          ? "bg-orange-50/30"
                          : ""
                      }`}
                    >
                      <CalendarCell
                        plans={plans}
                        onAdd={() => handleAddClick(dateKey, mealType)}
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
    </div>
  );
}
