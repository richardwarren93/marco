"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRecipes, useMealPlans } from "@/lib/hooks/use-data";
import ChooseMealsScreen from "@/components/meal-plan/ChooseMealsScreen";
import ReviewMealsScreen from "@/components/meal-plan/ReviewMealsScreen";
import ScheduleScreen from "@/components/meal-plan/ScheduleScreen";
import AnalyzeScreen from "@/components/meal-plan/AnalyzeScreen";
import AssignDaysScreen, { type DayAssignment } from "@/components/meal-plan/AssignDaysScreen";
import type { MealPlan, Recipe } from "@/types";

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default function MealPlanPageContent() {
  return (
    <Suspense>
      <MealPlanInner />
    </Suspense>
  );
}

function MealPlanInner() {
  const searchParams = useSearchParams();

  const [step, setStep] = useState<1 | 2 | "assign" | 3 | "insights">(3);

  const [calendarWeek, setCalendarWeek] = useState<Date>(() => {
    const dateParam = searchParams.get("date");
    if (dateParam) {
      const d = new Date(dateParam + "T12:00:00");
      if (!isNaN(d.getTime())) return getMonday(d);
    }
    return getMonday(new Date());
  });

  const [planningWeek, setPlanningWeek] = useState<string>(() =>
    formatDateKey(getMonday(new Date()))
  );

  const [weekPicks, setWeekPicks] = useState<Record<string, string[]>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const dateRange = useMemo(() => {
    const monday = getMonday(new Date());
    const start = new Date(monday);
    start.setDate(start.getDate() - 28);
    const end = new Date(monday);
    end.setDate(end.getDate() + 35);
    return {
      startStr: start.toISOString().split("T")[0],
      endStr: end.toISOString().split("T")[0],
    };
  }, []);

  const { data: recipesData = [], isLoading: recipesLoading } = useRecipes();
  const recipes: Recipe[] = recipesData;
  const {
    data: mealPlanData,
    isLoading: plansLoading,
    mutate: mutateMealPlans,
  } = useMealPlans(dateRange.startStr, dateRange.endStr);

  const mealPlans: MealPlan[] = mealPlanData?.plans ?? [];
  const householdPlans: MealPlan[] = mealPlanData?.householdPlans ?? [];
  const loading = recipesLoading || plansLoading;
  const [error, setError] = useState("");

  // Sync calendar week when date param changes (e.g. after adding a meal from another tab)
  const dateParam = searchParams.get("date");
  useEffect(() => {
    if (!dateParam) return;
    const d = new Date(dateParam + "T12:00:00");
    if (!isNaN(d.getTime())) {
      setCalendarWeek(getMonday(d));
    }
  }, [dateParam]);

  useEffect(() => {
    if (!dateParam || loading) return;
    const rafId = requestAnimationFrame(() => {
      document.getElementById(`day-${dateParam}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(rafId);
  }, [loading, dateParam]);

  const supabase = createClient();

  const currentWeekPickIds: string[] = weekPicks[formatDateKey(calendarWeek)] || [];
  const selectedRecipes = recipes.filter((r) => selectedIds.has(r.id));

  function handleToggleRecipe(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handlePlanThisWeek() {
    const weekKey = formatDateKey(calendarWeek);
    setPlanningWeek(weekKey);
    setSelectedIds(new Set(weekPicks[weekKey] || []));
    setStep(1);
  }

  function handleBuildSchedule() {
    setStep("assign");
  }

  async function handleAssignDone(assignments: DayAssignment[]) {
    await Promise.all(
      assignments.flatMap((a) =>
        a.mealTypes.map((mt) => handleCalendarAdd(a.recipeId, a.dates, mt, a.servings))
      )
    );
    setSelectedIds(new Set());
    setStep(3);
  }

  async function handleCalendarAdd(
    recipeId: string,
    dates: string[],
    mealType: string,
    servings?: number
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const rows = dates.map((planned_date) => ({
      user_id: user.id,
      recipe_id: recipeId,
      planned_date,
      meal_type: mealType,
      ...(servings ? { servings } : {}),
    }));

    const { error: insertError } = await supabase.from("meal_plans").insert(rows);
    if (insertError) { setError(insertError.message); return; }
    await mutateMealPlans();
  }

  async function handleEditMealSave(
    planId: string,
    updates: { meal_type?: string; recipe_id?: string; servings?: number }
  ) {
    const { error: updateError } = await supabase
      .from("meal_plans")
      .update(updates)
      .eq("id", planId);
    if (updateError) { setError(updateError.message); return; }
    await mutateMealPlans();
  }

  async function handleCalendarRemove(planId: string) {
    const optimistic = mealPlanData
      ? { ...mealPlanData, plans: mealPlanData.plans.filter((p) => p.id !== planId) }
      : undefined;
    mutateMealPlans(optimistic, false);

    try {
      const res = await fetch("/api/meal-plan/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId }),
      });
      if (!res.ok) throw new Error("Delete failed");
    } catch (err) {
      console.error("Remove meal plan error:", err);
      await mutateMealPlans();
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-40" />
          <div className="h-24 bg-gray-200 rounded-2xl" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <ChooseMealsScreen
        mode="build"
        recipes={recipes}
        selectedIds={selectedIds}
        onToggle={handleToggleRecipe}
        onViewMeals={() => setStep(2)}
        planningWeek={planningWeek}
        onBack={() => setStep(3)}
      />
    );
  }

  if (step === 2) {
    return (
      <ReviewMealsScreen
        selectedRecipes={selectedRecipes}
        onRemove={(id) =>
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          })
        }
        onBack={() => setStep(1)}
        onBuild={handleBuildSchedule}
        onAddMore={() => setStep(1)}
      />
    );
  }

  if (step === "assign") {
    return (
      <AssignDaysScreen
        selectedRecipes={selectedRecipes}
        planningWeek={planningWeek}
        existingMealPlans={mealPlans}
        onBack={() => setStep(2)}
        onDone={handleAssignDone}
      />
    );
  }

  if (step === "insights") {
    return (
      <AnalyzeScreen
        onBack={() => setStep(3)}
        calendarWeek={calendarWeek}
      />
    );
  }

  return (
    <>
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-2 text-sm">{error}</div>
      )}
      <ScheduleScreen
        mealPlans={mealPlans}
        householdPlans={householdPlans}
        selectedPool={selectedRecipes}
        allRecipes={recipes}
        currentWeekPickIds={currentWeekPickIds}
        onAddMeal={handleCalendarAdd}
        onRemoveMeal={handleCalendarRemove}
        onEditMeal={handleEditMealSave}
        onPlanThisWeek={handlePlanThisWeek}
        onShowInsights={() => setStep("insights")}
        calendarWeek={calendarWeek}
        onCalendarWeekChange={setCalendarWeek}
      />
    </>
  );
}
