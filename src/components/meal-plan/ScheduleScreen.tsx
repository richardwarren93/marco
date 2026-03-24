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
  onShowInsights,
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
  onShowInsights: () => void;
  calendarWeek: Date;
  onCalendarWeekChange: (w: Date) => void;
}) {
  const pool = selectedPool.length > 0 ? selectedPool : undefined;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Sticky header */}
      <div className="bg-white px-4 pt-5 pb-3 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900">Meal plan</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={onShowInsights}
              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Insights
            </button>
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
      </div>

      {/* Schedule content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 max-w-3xl mx-auto">
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
