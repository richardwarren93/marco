"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import RecipePromptInput from "@/components/meal-plan/RecipePromptInput";
import PromptResultCard from "@/components/meal-plan/PromptResultCard";
import type { PromptRecipeResult } from "@/lib/claude";

export default function DiscoverPage() {
  const router = useRouter();
  const supabase = createClient();

  const [results, setResults] = useState<PromptRecipeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");

  async function handleSearch(prompt: string) {
    setSearching(true);
    setError("");
    setSavedIndices(new Set());
    setResults([]);
    try {
      const res = await fetch("/api/meal-plan/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, context: "all" }),
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

  async function handleSave(result: PromptRecipeResult, index: number) {
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("meal_plans").insert({
      user_id: user.id,
      recipe_id: recipeId,
      planned_date: today,
      meal_type: mealType,
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Discover</h1>
          <p className="text-xs text-gray-400">Find new recipes with AI</p>
        </div>
      </div>

      <div className="space-y-5">
        <RecipePromptInput
          onSubmit={(prompt) => handleSearch(prompt)}
          loading={searching}
          pantryCount={0}
          hideContext
        />

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">{error}</div>
        )}

        {searching && (
          <div className="text-center py-10">
            <div className="inline-flex items-center gap-2 text-gray-400 text-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              Finding recipes for you…
            </div>
          </div>
        )}

        {results.length > 0 && !searching && (
          <div className="grid gap-4 sm:grid-cols-2">
            {results.map((result, i) => (
              <PromptResultCard
                key={i}
                result={result}
                onSave={(r) => handleSave(r, i)}
                onAddToPlan={handleAddToPlan}
                saving={savingIndex === i}
                saved={savedIndices.has(i)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
