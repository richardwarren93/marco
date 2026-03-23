"use client";

import type { MealPlan, Recipe } from "@/types";
import MealPlanListView from "./MealPlanListView";

export default function ScheduleScreen({
  mealPlans,
  householdPlans,
  selectedPool,
  allRecipes,
  currentWeekPickIds,
  onAddMeal,
  onRemoveMeal,
  onPlanThisWeek,
  calendarWeek,
  onCalendarWeekChange,
}: {
  mealPlans: MealPlan[];
  householdPlans: MealPlan[];
  selectedPool: Recipe[];
  allRecipes: Recipe[];
  currentWeekPickIds: string[];
  onAddMeal: (recipeId: string, dates: string[], mealType: string, servings?: number) => Promise<void>;
  onRemoveMeal: (planId: string) => void;
  onPlanThisWeek: () => void;
  calendarWeek: Date;
  onCalendarWeekChange: (w: Date) => void;
}) {
  const pool = selectedPool.length > 0 ? selectedPool : undefined;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Sticky header */}
      <div className="bg-white px-4 pt-5 pb-3 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Meal plan</h1>
          <button
            onClick={onPlanThisWeek}
            className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 px-3 py-1.5 rounded-full bg-orange-50 hover:bg-orange-100 border border-orange-100 transition-colors"
          >
            Plan week with
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/marco-icon.svg" alt="Marco" className="w-4 h-4 rounded-full" />
          </button>
        </div>
      </div>

      {/* Schedule content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4">
          <MealPlanListView
            mealPlans={mealPlans}
            householdPlans={householdPlans}
            onAddMeal={onAddMeal}
            onRemove={onRemoveMeal}
            recipePool={pool}
            allRecipes={allRecipes}
            weekPickIds={currentWeekPickIds}
            weekStart={calendarWeek}
            onWeekChange={onCalendarWeekChange}
            onPlanThisWeek={onPlanThisWeek}
          />
        </div>
      </div>
    </div>
  );
}
