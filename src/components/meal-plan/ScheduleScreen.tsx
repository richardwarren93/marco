"use client";

import type { MealPlan, Recipe } from "@/types";
import MealPlanListView from "./MealPlanListView";

const ACCENT = "#3f7058";

export default function ScheduleScreen({
  mealPlans,
  householdPlans,
  selectedPool,
  allRecipes,
  currentWeekPickIds,
  onAddMeal,
  onRemoveMeal,
  onEditMeal,
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
  onEditMeal?: (planId: string, updates: { meal_type?: string; recipe_id?: string; servings?: number }) => Promise<void>;
  onPlanThisWeek: () => void;
  onShowInsights: () => void;
  calendarWeek: Date;
  onCalendarWeekChange: (w: Date) => void;
}) {
  const pool = selectedPool.length > 0 ? selectedPool : undefined;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#f6f6f4" }}>
      {/* Header */}
      <div
        className="px-4 sticky top-0 z-10"
        style={{ background: "#f6f6f4", borderBottom: "1px solid #eaeae8" }}
      >
        <div className="flex items-center justify-between max-w-3xl mx-auto h-14">
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "#1a1a1a" }}>
            Meal Plan
          </h1>
          <div className="flex items-center gap-2">
            {/* Insights */}
            <button
              onClick={onShowInsights}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-2xl transition-colors active:scale-95"
              style={{ background: "white", color: "#888", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Insights
            </button>
            {/* Build plan */}
            <button
              onClick={onPlanThisWeek}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-2xl transition-colors active:scale-95 text-white"
              style={{ background: ACCENT }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Plan week
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 max-w-3xl mx-auto">
          <MealPlanListView
            mealPlans={mealPlans}
            householdPlans={householdPlans}
            onAddMeal={onAddMeal}
            onRemove={onRemoveMeal}
            onEditMeal={onEditMeal}
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
