"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRecipes, useMealPlans } from "@/lib/hooks/use-data";
import ChooseMealsScreen from "@/components/meal-plan/ChooseMealsScreen";
import ReviewMealsScreen from "@/components/meal-plan/ReviewMealsScreen";
import ScheduleScreen from "@/components/meal-plan/ScheduleScreen";
import AnalyzeScreen from "@/components/meal-plan/AnalyzeScreen";
import AssignDaysScreen, { type DayAssignment } from "@/components/meal-plan/AssignDaysScreen";
import type { MealPlan, Recipe } from "@/types";
import { useToast } from "@/components/ui/Toast";
import MobileHeader from "@/components/layout/MobileHeader";

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

export default function MealPlanPage() {
  return (
    <Suspense>
      <MealPlanInner />
    </Suspense>
  );
}

function MealPlanInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // ─── Step flow ───────────────────────────────────────────────────────────────
  // Default: step 3 (Schedule) — the app's main surface
  // If ?step=build, start in build mode (e.g. returning from recipe detail)
  const [step, setStep] = useState<1 | 2 | "assign" | 3 | "insights">(() => {
    const stepParam = searchParams.get("step");
    if (stepParam === "build") return 1;
    return 3;
  });

  // Which week the calendar is currently showing — jump to ?date= param if present
  const [calendarWeek, setCalendarWeek] = useState<Date>(() => {
    const dateParam = searchParams.get("date");
    if (dateParam) {
      const d = new Date(dateParam + "T12:00:00");
      if (!isNaN(d.getTime())) return getMonday(d);
    }
    return getMonday(new Date());
  });

  // The week we're currently planning meals for
  const [planningWeek, setPlanningWeek] = useState<string>(() =>
    formatDateKey(getMonday(new Date()))
  );

  // Per-week recipe picks: weekKey → recipe IDs selected in the Build flow
  const [weekPicks, setWeekPicks] = useState<Record<string, string[]>>({});

  // Recipes selected during the current Build flow pass
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { showToast } = useToast();

  // ─── Data (SWR-cached) ───────────────────────────────────────────────────────
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

  // Household size for default servings
  const [householdSize, setHouseholdSize] = useState(2);
  useEffect(() => {
    const sb = createClient();
    sb.from("user_preferences").select("household_size").single().then(({ data }: { data: { household_size?: number } | null }) => {
      if (data?.household_size) setHouseholdSize(data.household_size);
    });
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

  // ─── Scroll to specific day after loading (from ?date= param) ────────────────
  const scrollTargetDate = searchParams.get("date");
  useEffect(() => {
    if (!scrollTargetDate || loading) return;
    const rafId = requestAnimationFrame(() => {
      document.getElementById(`day-${scrollTargetDate}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(rafId);
  }, [loading, scrollTargetDate]);

  const supabase = createClient();

  // ─── Derived ─────────────────────────────────────────────────────────────────
  const currentWeekPickIds: string[] = weekPicks[formatDateKey(calendarWeek)] || [];
  const selectedRecipes = recipes.filter((r) => selectedIds.has(r.id));

  // ─── Handlers ────────────────────────────────────────────────────────────────
  function handleToggleRecipe(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handlePlanThisWeek(preSelectedRecipeId?: string) {
    const weekKey = formatDateKey(calendarWeek);
    setPlanningWeek(weekKey);
    const existing = new Set(weekPicks[weekKey] || []);
    // If a recipe was pre-selected from AddMealSheet, include it
    if (preSelectedRecipeId) existing.add(preSelectedRecipeId);
    setSelectedIds(existing);
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
    // Count total meal slots scheduled
    const totalSlots = assignments.reduce((sum, a) => sum + a.dates.length * a.mealTypes.length, 0);
    setSelectedIds(new Set());
    setStep(3);
    // Fire toast after step transition settles
    setTimeout(() => {
      showToast(`🎉 ${totalSlots} meal${totalSlots !== 1 ? "s" : ""} scheduled for this week!`, {
        action: {
          label: "View grocery list",
          onClick: () => router.push("/grocery"),
        },
      });
    }, 400);
  }

  async function handleCalendarAdd(
    recipeId: string,
    dates: string[],
    mealType: string,
    servings?: number,
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
    // Single-add toast is handled by AddMealSheet
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
    // Optimistic update: remove from cache immediately
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
      await mutateMealPlans(); // revert by refetching
    }
  }

  // ─── Loading ──────────────────────────────────────────────────────────────────
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

  // ─── Step 1: Select meals ─────────────────────────────────────────────────────
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

  // ─── Step 2: Review selection ─────────────────────────────────────────────────
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
      />
    );
  }

  // ─── Assign days ─────────────────────────────────────────────────────────────
  if (step === "assign") {
    return (
      <AssignDaysScreen
        selectedRecipes={selectedRecipes}
        planningWeek={planningWeek}
        existingMealPlans={mealPlans}
        onBack={() => setStep(2)}
        onDone={handleAssignDone}
        onRemoveMeal={handleCalendarRemove}
        defaultServings={householdSize}
      />
    );
  }

  // ─── Insights ────────────────────────────────────────────────────────────────
  if (step === "insights") {
    return (
      <AnalyzeScreen
        onBack={() => setStep(3)}
        calendarWeek={calendarWeek}
      />
    );
  }

  // ─── Step 3: Schedule (default) ───────────────────────────────────────────────
  return (
    <>
      <MobileHeader />
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
