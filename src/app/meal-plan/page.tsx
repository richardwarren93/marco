"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import RecipePromptInput from "@/components/meal-plan/RecipePromptInput";
import PromptResultCard from "@/components/meal-plan/PromptResultCard";
import FriendsCookingSection from "@/components/meal-plan/FriendsCookingSection";
import type { MealPlan } from "@/types";
import type { PromptRecipeResult } from "@/lib/claude";
import { MealPlanIcon } from "@/components/icons/HandDrawnIcons";

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
  const [results, setResults] = useState<PromptRecipeResult[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [friendsCooking, setFriendsCooking] = useState<FriendCookingItem[]>([]);
  const [pantryCount, setPantryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const [plansRes, pantryRes, friendsRes] = await Promise.all([
        supabase
          .from("meal_plans")
          .select("*, recipe:recipes(*)")
          .order("planned_date", { ascending: true })
          .gte("planned_date", new Date().toISOString().split("T")[0]),
        supabase
          .from("pantry_items")
          .select("id", { count: "exact", head: true }),
        fetch("/api/meal-plan/friends-cooking"),
      ]);

      setMealPlans((plansRes.data as MealPlan[]) || []);
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
  }, [supabase]);

  async function handlePromptSubmit(prompt: string, context: "all" | "my_kitchen") {
    setSearching(true);
    setError("");
    setSavedIndices(new Set());
    setResults([]);

    try {
      const res = await fetch("/api/meal-plan/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSearching(false);
    }
  }

  async function handleSaveResult(result: PromptRecipeResult, index: number) {
    setSavingIndex(index);
    setError("");

    try {
      const res = await fetch("/api/recipes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: result.recipe.title,
          description: result.recipe.description,
          ingredients: result.recipe.ingredients,
          steps: result.recipe.steps,
          servings: result.recipe.servings,
          prep_time_minutes: result.recipe.prep_time_minutes,
          cook_time_minutes: result.recipe.cook_time_minutes,
          tags: result.recipe.tags,
          notes: `AI-suggested recipe.\n${result.reasoning}`,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      setSavedIndices((prev) => new Set(prev).add(index));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save recipe");
    } finally {
      setSavingIndex(null);
    }
  }

  async function handleAddToPlan(recipeId: string, mealType: string) {
    const today = new Date().toISOString().split("T")[0];
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("meal_plans").insert({
      user_id: user.id,
      recipe_id: recipeId,
      planned_date: today,
      meal_type: mealType,
    });

    if (error) {
      setError(error.message);
      return;
    }

    const { data } = await supabase
      .from("meal_plans")
      .select("*, recipe:recipes(*)")
      .order("planned_date", { ascending: true })
      .gte("planned_date", new Date().toISOString().split("T")[0]);
    setMealPlans((data as MealPlan[]) || []);
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-40" />
          <div className="h-24 bg-gray-200 rounded-2xl" />
          <div className="h-40 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <MealPlanIcon className="w-7 h-7 text-orange-600" /> Meal Plan
      </h1>

      {/* AI Prompt Input */}
      <RecipePromptInput
        onSubmit={handlePromptSubmit}
        loading={searching}
        pantryCount={pantryCount}
      />

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Loading state */}
      {searching && (
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 text-gray-400 text-sm">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            Finding recipes for you...
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && !searching && (
        <div className="grid gap-4 sm:grid-cols-2">
          {results.map((result, i) => (
            <PromptResultCard
              key={i}
              result={result}
              onSave={(r) => handleSaveResult(r, i)}
              onAddToPlan={handleAddToPlan}
              saving={savingIndex === i}
              saved={savedIndices.has(i)}
            />
          ))}
        </div>
      )}

      {/* Upcoming Plans */}
      {mealPlans.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            Upcoming Meals
          </h2>
          <div className="space-y-2">
            {mealPlans.map((plan) => (
              <div
                key={plan.id}
                className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm"
              >
                <div>
                  <span className="font-medium text-gray-900 text-sm">
                    {plan.recipe?.title || "Untitled"}
                  </span>
                  <span className="text-gray-400 text-xs ml-2">
                    {plan.planned_date} ·{" "}
                    <span className="capitalize">{plan.meal_type}</span>
                  </span>
                </div>
                <button
                  onClick={async () => {
                    await supabase
                      .from("meal_plans")
                      .delete()
                      .eq("id", plan.id);
                    setMealPlans(mealPlans.filter((p) => p.id !== plan.id));
                  }}
                  className="text-gray-400 hover:text-red-500 text-xs"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends Cooking */}
      <FriendsCookingSection items={friendsCooking} />
    </div>
  );
}
