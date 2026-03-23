"use client";

import WeeklyCalendar from "./WeeklyCalendar";
import type { MealPlan, Recipe } from "@/types";

export default function CalendarView({
  mealPlans,
  householdPlans,
  onAddMeal,
  onRemoveMeal,
  recipePool,
}: {
  mealPlans: MealPlan[];
  householdPlans?: MealPlan[];
  onAddMeal: (recipeId: string, dates: string[], mealType: string, servings?: number) => void;
  onRemoveMeal: (planId: string) => void;
  recipePool?: Recipe[];
}) {
  return (
    <WeeklyCalendar
      mealPlans={mealPlans}
      householdPlans={householdPlans}
      onAddMeal={onAddMeal}
      onRemoveMeal={onRemoveMeal}
      recipePool={recipePool}
    />
  );
}
