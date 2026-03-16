"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import SuggestionCard from "@/components/meal-plan/SuggestionCard";
import DiscoveryCard from "@/components/meal-plan/DiscoveryCard";
import type { Recipe, PantryItem, MealPlan } from "@/types";
import type { DiscoveredRecipe } from "@/lib/claude";

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
  const [discoveries, setDiscoveries] = useState<DiscoveredRecipe[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"discover" | "saved">("discover");
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

  async function handleDiscover() {
    if (pantryItems.length === 0) {
      setError("Add some ingredients to your pantry first.");
      return;
    }
    setDiscovering(true);
    setError("");
    setSavedIndices(new Set());

    try {
      const resp = await fetch("/api/meal-plan/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pantryItems }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      setDiscoveries(data.recipes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to discover recipes");
    } finally {
      setDiscovering(false);
    }
  }

  async function handleSaveDiscovery(recipe: DiscoveredRecipe, index: number) {
    setSavingIndex(index);
    setError("");

    try {
      const res = await fetch("/api/recipes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: recipe.title,
          description: recipe.description,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          servings: recipe.servings,
          prep_time_minutes: recipe.prep_time_minutes,
          cook_time_minutes: recipe.cook_time_minutes,
          tags: recipe.tags,
          notes: `AI-suggested recipe based on pantry ingredients.\n${recipe.reasoning}`,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save recipe");
      }

      setSavedIndices((prev) => new Set(prev).add(index));

      // Refresh recipes list
      const { data: newRecipes } = await supabase
        .from("recipes")
        .select("*")
        .order("created_at", { ascending: false });
      setRecipes((newRecipes as Recipe[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save recipe");
    } finally {
      setSavingIndex(null);
    }
  }

  async function handleSuggest() {
    if (recipes.length === 0) {
      setError("Save some recipes first to get suggestions from your collection.");
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

      {/* Tab selector */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("discover")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === "discover"
              ? "border-orange-600 text-orange-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Discover New Recipes
        </button>
        <button
          onClick={() => setActiveTab("saved")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === "saved"
              ? "border-orange-600 text-orange-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          From My Recipes ({recipes.length})
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {/* Discover Tab */}
      {activeTab === "discover" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">
              Get AI-generated recipe ideas based on your {pantryItems.length} pantry items.
              Save the ones you like!
            </p>
            <button
              onClick={handleDiscover}
              disabled={discovering}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 flex-shrink-0 ml-4"
            >
              {discovering ? "Thinking..." : "Discover Recipes"}
            </button>
          </div>

          {discovering && (
            <p className="text-gray-500 text-center py-8">
              Creating recipe ideas from your pantry...
            </p>
          )}

          {discoveries.length > 0 && !discovering && (
            <div className="grid gap-4 sm:grid-cols-2 mt-4">
              {discoveries.map((recipe, i) => (
                <DiscoveryCard
                  key={i}
                  recipe={recipe}
                  onSave={(r) => handleSaveDiscovery(r, i)}
                  saving={savingIndex === i}
                  saved={savedIndices.has(i)}
                />
              ))}
            </div>
          )}

          {!discovering && discoveries.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="mb-1">Click &quot;Discover Recipes&quot; to get started</p>
              <p className="text-xs">
                {pantryItems.length === 0
                  ? "Add ingredients to your pantry first"
                  : `We'll suggest recipes using your ${pantryItems.length} pantry items`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Saved Recipes Tab */}
      {activeTab === "saved" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">
              Suggestions from your {recipes.length} saved recipes and {pantryItems.length} pantry items.
            </p>
            <button
              onClick={handleSuggest}
              disabled={suggesting}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 flex-shrink-0 ml-4"
            >
              {suggesting ? "Thinking..." : "Get Suggestions"}
            </button>
          </div>

          {suggesting && (
            <p className="text-gray-500 text-center py-8">
              Analyzing your pantry and recipes...
            </p>
          )}

          {suggestions.length > 0 && !suggesting && (
            <div className="grid gap-4 sm:grid-cols-2 mt-4">
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

          {!suggesting && suggestions.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="mb-1">Click &quot;Get Suggestions&quot; to match your saved recipes</p>
              <p className="text-xs">
                {recipes.length === 0
                  ? "Save some recipes first"
                  : `We'll find the best matches from your ${recipes.length} recipes`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
