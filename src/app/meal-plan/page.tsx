"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import RecipePromptInput from "@/components/meal-plan/RecipePromptInput";
import type { PlanSources } from "@/components/meal-plan/RecipePromptInput";
import SuggestionRow from "@/components/meal-plan/SuggestionRow";
import FriendsCookingSection from "@/components/meal-plan/FriendsCookingSection";
import WeeklyCalendar, { getMonday, formatDateKey, addDays } from "@/components/meal-plan/WeeklyCalendar";
import RecipeAssignmentSheet from "@/components/meal-plan/RecipeAssignmentSheet";
import type { SheetConfig } from "@/components/meal-plan/RecipeAssignmentSheet";
import GroceryList from "@/components/grocery/GroceryList";
import type { MealPlan } from "@/types";
import type { SuggestedRecipe } from "@/lib/claude";

interface FriendCookingItem {
  id: string;
  friendName: string;
  cookedAt: string;
  recipe: {
    id: string;
    title: string;
    description: string | null;
    tags: string[];
    image_url: string | null;
    prep_time_minutes: number | null;
    cook_time_minutes: number | null;
    servings: number | null;
  };
}

export default function MealPlanPage() {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [householdPlans, setHouseholdPlans] = useState<MealPlan[]>([]);
  const [friendsCooking, setFriendsCooking] = useState<FriendCookingItem[]>([]);
  const [pantryCount, setPantryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showGrocery, setShowGrocery] = useState(false);

  // Suggestion state
  const [suggestions, setSuggestions] = useState<SuggestedRecipe[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);

  // Assignment sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetConfig, setSheetConfig] = useState<SheetConfig | null>(null);
  const [assignBanner, setAssignBanner] = useState<string | null>(null);

  // Calendar week
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [newlyAddedIds, setNewlyAddedIds] = useState<string[]>([]);

  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = createClient();

  const fetchMealPlans = useCallback(async () => {
    const monday = getMonday(new Date());
    const start = new Date(monday);
    start.setDate(start.getDate() - 28);
    const end = new Date(monday);
    end.setDate(end.getDate() + 35);
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];

    const { data } = await supabase
      .from("meal_plans")
      .select("*, recipe:recipes(*)")
      .order("planned_date", { ascending: true })
      .gte("planned_date", startStr)
      .lte("planned_date", endStr);
    setMealPlans((data as MealPlan[]) || []);

    try {
      const hhRes = await fetch(`/api/meal-plan/household?start=${startStr}&end=${endStr}`);
      const hhData = await hhRes.json();
      setHouseholdPlans((hhData.plans as MealPlan[]) || []);
    } catch {
      setHouseholdPlans([]);
    }
  }, [supabase]);

  useEffect(() => {
    async function fetchData() {
      const [, pantryRes, friendsRes] = await Promise.all([
        fetchMealPlans(),
        supabase.from("pantry_items").select("id", { count: "exact", head: true }),
        fetch("/api/meal-plan/friends-cooking"),
      ]);
      setPantryCount(pantryRes.count || 0);
      try {
        const friendsData = await friendsRes.json();
        setFriendsCooking(friendsData.items || []);
      } catch {
        setFriendsCooking([]);
      }
      setLoading(false);
    }
    fetchData();
  }, [supabase, fetchMealPlans]);

  function getVisibleWeekDates(): string[] {
    return Array.from({ length: 7 }, (_, i) => formatDateKey(addDays(weekStart, i)));
  }

  // ── Prompt → suggestions only, no calendar mutation ──────────────────────
  async function handleSuggest(prompt: string, sources: PlanSources) {
    setSuggestLoading(true);
    setSuggestions([]);
    setError("");
    try {
      const res = await fetch("/api/meal-plan/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, sources }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get suggestions");
      setSuggestions(data.suggestions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSuggestLoading(false);
    }
  }

  // ── Tap suggestion → open sheet ──────────────────────────────────────────
  function handleSuggestionTap(suggestion: SuggestedRecipe) {
    setSheetConfig({
      recipeId: null,
      draftNotes: JSON.stringify({
        __draft__: true,
        title: suggestion.title,
        description: suggestion.description,
        ingredients: suggestion.ingredients,
        steps: suggestion.steps,
        servings: suggestion.servings,
        prep_time_minutes: suggestion.prep_time_minutes,
        cook_time_minutes: suggestion.cook_time_minutes,
        tags: suggestion.tags,
        reasoning: suggestion.reasoning,
      }),
      recipeTitle: suggestion.title,
      defaultMealType: suggestion.suggestedMealType,
      contextDate: null,
      startInSearchMode: false,
      existingPlanId: null,
      isDraft: false,
    });
    setSheetOpen(true);
  }

  // ── + button in calendar → open sheet in search mode ─────────────────────
  function handleOpenSheet(config: SheetConfig) {
    setSheetConfig(config);
    setSheetOpen(true);
  }

  // ── Confirm assignment → write to calendar ───────────────────────────────
  async function handleAssign(
    slots: { date: string; mealType: string }[],
    replace: boolean,
    recipeId: string | null,
    draftNotes: string | null,
    existingPlanId: string | null
  ) {
    // If moving/reassigning an existing meal, remove the original first
    if (existingPlanId) {
      await fetch("/api/meal-plan/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: existingPlanId }),
      });
      setMealPlans((prev) => prev.filter((p) => p.id !== existingPlanId));
    }

    const res = await fetch("/api/meal-plan/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipeId, draftNotes, slots, replace }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to assign");

    const ids: string[] = data.planIds || [];
    await fetchMealPlans();

    // Staggered highlight
    setNewlyAddedIds([]);
    ids.forEach((id, i) => {
      setTimeout(() => setNewlyAddedIds((prev) => [...prev, id]), i * 100);
    });
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(
      () => setNewlyAddedIds([]),
      ids.length * 100 + 3000
    );

    // Confirmation banner
    const count = ids.length;
    const mealTypeLabel = slots[0]?.mealType ?? "meal";
    setAssignBanner(
      count === 1
        ? `Added to ${new Date(slots[0].date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" })}`
        : `Added to ${count} ${mealTypeLabel}s`
    );
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => setAssignBanner(null), 3500);

    setSheetOpen(false);
  }

  async function handleSaveDraft(planId: string) {
    const res = await fetch("/api/meal-plan/save-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan_id: planId }),
    });
    if (res.ok) {
      await fetchMealPlans();
      setSheetOpen(false);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save recipe");
    }
  }

  async function handleCalendarRemove(planId: string) {
    const prev = mealPlans;
    setMealPlans(mealPlans.filter((p) => p.id !== planId));
    try {
      const res = await fetch("/api/meal-plan/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId }),
      });
      if (!res.ok) throw new Error("Delete failed");
    } catch (err) {
      console.error("Remove meal plan error:", err);
      setMealPlans(prev);
      await fetchMealPlans();
    }
  }

  async function handleSheetDelete(planId: string) {
    await handleCalendarRemove(planId);
    setSheetOpen(false);
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-3">
          <div className="h-7 bg-gray-200 rounded w-32" />
          <div className="h-16 bg-gray-200 rounded-xl" />
          <div className="h-56 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  const hasSuggestionArea = suggestLoading || suggestions.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 sm:py-7 space-y-3">
      {/* Header */}
      <h1 className="text-xl font-bold text-gray-900">🗓 Meal Plan</h1>

      {/* Command bar */}
      <RecipePromptInput
        onSubmit={handleSuggest}
        loading={suggestLoading}
        pantryCount={pantryCount}
      />

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-600 px-3 py-2.5 rounded-xl text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            className="text-red-400 hover:text-red-600 ml-3 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Assign confirmation */}
      {assignBanner && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2.5 rounded-xl text-sm flex items-center justify-between">
          <span>✓ {assignBanner}</span>
          <button
            onClick={() => setAssignBanner(null)}
            className="text-green-400 hover:text-green-600 text-lg leading-none ml-3"
          >
            ×
          </button>
        </div>
      )}

      {/* Calendar + suggestions — one unified surface */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Suggestions / loading header — sits directly above the calendar grid */}
        {hasSuggestionArea && (
          <div className="border-b border-gray-100">
            {suggestLoading ? (
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-sm text-orange-600 font-medium">Finding ideas for you…</span>
              </div>
            ) : (
              <div className="pt-3">
                <SuggestionRow
                  suggestions={suggestions}
                  onTap={handleSuggestionTap}
                  onDismiss={() => setSuggestions([])}
                />
              </div>
            )}
          </div>
        )}

        {/* Calendar */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">This week</h2>
            <button
              onClick={() => setShowGrocery(!showGrocery)}
              className="text-xs font-medium text-orange-600 hover:text-orange-700 px-2.5 py-1 bg-orange-50 rounded-full hover:bg-orange-100 transition-colors"
            >
              🛒 Grocery
            </button>
          </div>
          <WeeklyCalendar
            mealPlans={mealPlans}
            householdPlans={householdPlans}
            onOpenSheet={handleOpenSheet}
            weekStart={weekStart}
            onWeekChange={setWeekStart}
            newlyAddedIds={newlyAddedIds}
          />
        </div>
      </div>

      {/* Draft legend */}
      {mealPlans.some((p) => !p.recipe_id && p.notes?.startsWith("{")) && (
        <p className="text-xs text-gray-400 flex items-center gap-1.5 px-1">
          <span className="inline-block w-3 h-3 rounded border border-dashed border-gray-400 bg-gray-50" />
          Dashed border = idea not yet saved. Tap to save or remove.
        </p>
      )}

      {/* Grocery list */}
      {showGrocery && <GroceryList onClose={() => setShowGrocery(false)} />}

      {/* Friends cooking */}
      <FriendsCookingSection items={friendsCooking} />

      {/* Assignment sheet */}
      <RecipeAssignmentSheet
        isOpen={sheetOpen}
        config={sheetConfig}
        weekDays={getVisibleWeekDates()}
        mealPlans={[...mealPlans, ...householdPlans]}
        onAssign={handleAssign}
        onDelete={handleSheetDelete}
        onSaveDraft={handleSaveDraft}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}
