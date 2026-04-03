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
  onPlanThisWeek: (preSelectedRecipeId?: string) => void;
  onShowInsights: () => void;
  calendarWeek: Date;
  onCalendarWeekChange: (w: Date) => void;
}) {
  const pool = selectedPool.length > 0 ? selectedPool : undefined;

  return (
    <div style={{ background: "#f4f3f1", minHeight: "100%" }}>
      {/* Content — sticky header now lives inside MealPlanListView */}
      <div className="px-4 pt-0 pb-28 max-w-3xl mx-auto">
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
