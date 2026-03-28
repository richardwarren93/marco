"use client";

import type { MealPlan, Recipe } from "@/types";
import MealPlanListView from "./MealPlanListView";
import MobileTopActions from "@/components/layout/MobileTopActions";

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

  // ── Count meals for the current calendar week
  const weekStartStr = calendarWeek.toISOString().split("T")[0];
  const weekEndDate = new Date(calendarWeek);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekEndStr = weekEndDate.toISOString().split("T")[0];
  const weekMealCount = mealPlans.filter(
    (p) => p.planned_date >= weekStartStr && p.planned_date <= weekEndStr
  ).length;

  return (
    <div style={{ background: "#f4f3f1", minHeight: "100%" }}>
      {/* Header — matches Recipes page style exactly */}
      <div className="sticky top-0 z-10 px-4 pt-5 pb-0" style={{ background: "#f4f3f1" }}>
        <div className="flex items-center justify-between max-w-3xl mx-auto mb-2">
          <div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: "#1a1410" }}>
              Meal Plan
            </h1>
            {weekMealCount > 0 && (
              <p className="text-xs font-medium mt-1" style={{ color: "#999" }}>
                {weekMealCount} meal{weekMealCount !== 1 ? "s" : ""} this week
              </p>
            )}
          </div>

          {/* Bell + hamburger — mobile only (sm:hidden since desktop uses Navbar) */}
          <div className="sm:hidden">
            <MobileTopActions />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-3 pb-28 max-w-3xl mx-auto">
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
          onShowInsights={onShowInsights}
        />
      </div>

    </div>
  );
}
