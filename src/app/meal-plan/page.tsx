"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import SuggestionCard from "@/components/meal-plan/SuggestionCard";
import type { Recipe, PantryItem, MealPlan } from "@/types";

interface Suggestion {
  recipeId: string;
  matchingIngredients: string[];
  missingIngredients: string[];
  substitutions: { original: string; substitute: string }[];
  reasoning: string;
}

export default function MealPlanPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const [recipesRes, pantryRes, plansRes] = await Promise.all([
        supabase.from("recipes").select("*").order("created_at", { ascending: false }),
        supabase.from("pantry_items").select("*"),
        supabase
          .from("meal_plans")
          .select("*, recipe:recipes(*)")
          .order("planned_date", { ascending: true })
          .gte("planned_date", new Date().toISOString().split("T")[0]),
      ]);
      setRecipes((recipesRes.data as Recipe[]) || []);
      setPantryItems((pantryRes.data as PantryItem[]) || []);
      setMealPlans((plansRes.data as MealPlan[]) || []);
      setLoading(false);
    }
    fetchData();
  }, [supabase]);

  async function handleSuggest() {
    if (recipes.length === 0) {
      setError("Save some recipes first to get suggestions.");
      return;
    }
    setSuggesting(true);
    setError("");

    try {
      const resp = await fetch("/api/meal-plan/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pantryItems, recipes }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      setSuggestions(data.suggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get suggestions");
    } finally {
      setSuggesting(false);
    }
  }

  async function handleAddToPlan(recipeId: string) {
    const today = new Date().toISOString().split("T")[0];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated"); return; }

    const { error } = await supabase.from("meal_plans").insert({
      user_id: user.id,
      recipe_id: recipeId,
      planned_date: today,
      meal_type: "dinner",
    });
    if (error) {
      setError(error.message);
      return;
    }
    // Refresh meal plans
    const { data } = await supabase
      .from("meal_plans")
      .select("*, recipe:recipes(*)")
      .order("planned_date", { ascending: true })
      .gte("planned_date", new Date().toISOString().split("T")[0]);
    setMealPlans((data as MealPlan[]) || []);
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Meal Plan</h1>

      {/* Upcoming Plans */}
      {mealPlans.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Upcoming Meals
          </h2>
          <div className="space-y-2">
            {mealPlans.map((plan) => (
              <div
                key={plan.id}
                className="flex items-center justify-between bg-white px-4 py-3 rounded-lg border border-gray-200"
              >
                <div>
                  <span className="font-medium text-gray-900">
                    {plan.recipe?.title || "Untitled"}
                  </span>
                  <span className="text-gray-400 text-sm ml-3">
                    {plan.planned_date} &middot;{" "}
                    <span className="capitalize">{plan.meal_type}</span>
                  </span>
                </div>
                <button
                  onClick={async () => {
                    await supabase.from("meal_plans").delete().eq("id", plan.id);
                    setMealPlans(mealPlans.filter((p) => p.id !== plan.id));
                  }}
                  className="text-gray-400 hover:text-red-500 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Suggestions */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">
            AI Suggestions
          </h2>
          <button
            onClick={handleSuggest}
            disabled={suggesting}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
          >
            {suggesting ? "Thinking..." : "Get Suggestions"}
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Based on {pantryItems.length} pantry items and {recipes.length} saved
          recipes.
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {suggesting && (
          <p className="text-gray-500 text-center py-8">
            Analyzing your pantry and recipes...
          </p>
        )}

        {suggestions.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {suggestions.map((s) => {
              const recipe = recipes.find((r) => r.id === s.recipeId);
              if (!recipe) return null;
              return (
                <SuggestionCard
                  key={s.recipeId}
                  recipe={recipe}
                  matchingIngredients={s.matchingIngredients}
                  missingIngredients={s.missingIngredients}
                  substitutions={s.substitutions}
                  reasoning={s.reasoning}
                  onAddToPlan={handleAddToPlan}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
