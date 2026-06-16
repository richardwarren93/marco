"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mutate as swrMutate } from "swr";
import type { Recipe } from "@/types";
import { useToast } from "@/components/ui/Toast";

/**
 * Shared save flow for Discover surfaces. Saving a community recipe = fetch its
 * full detail, POST to /api/recipes/save, and optimistically inject it into the
 * My Recipes SWR cache. Captures the saved copy's id so "add to collection" can
 * open the modal on the owned row. Extracted from the old Community/Friends
 * feeds so the redesigned Discover reuses the exact same behavior.
 */

export interface SaveableRecipe {
  recipeId: string;
  title: string;
  image_url: string | null;
  meal_type: string;
  prep_time_minutes?: number | null;
  cook_time_minutes?: number | null;
  tags?: string[];
}

export function useDiscoverSave(onAddToCollection?: (savedRecipeId: string) => void) {
  const router = useRouter();
  const { showToast } = useToast();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savedIdMap, setSavedIdMap] = useState<Map<string, string>>(new Map());

  async function saveRecipe(recipe: SaveableRecipe, opts: { showToast?: boolean } = {}): Promise<string | null> {
    if (savedIds.has(recipe.recipeId)) return savedIdMap.get(recipe.recipeId) ?? null;
    if (savingIds.has(recipe.recipeId)) return null;

    setSavedIds((prev) => new Set(prev).add(recipe.recipeId));
    if (opts.showToast !== false) {
      showToast("Recipe saved!", {
        duration: 5000,
        action: { label: "Add to meal plan", onClick: () => router.push("/recipes?tab=meal-plan") },
      });
    }

    const placeholder: Recipe = {
      id: recipe.recipeId,
      user_id: "",
      title: recipe.title,
      source_url: null,
      source_platform: null,
      description: null,
      ingredients: [],
      steps: [],
      servings: null,
      prep_time_minutes: recipe.prep_time_minutes ?? null,
      cook_time_minutes: recipe.cook_time_minutes ?? null,
      tags: recipe.tags ?? [],
      meal_type: (recipe.meal_type as Recipe["meal_type"]) || "dinner",
      image_url: recipe.image_url ?? null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    swrMutate(
      "supabase:recipes",
      (current: Recipe[] | undefined) => {
        const list = current ?? [];
        if (list.some((row) => row.id === recipe.recipeId)) return list;
        return [placeholder, ...list];
      },
      false,
    );

    setSavingIds((prev) => new Set(prev).add(recipe.recipeId));
    try {
      const detailRes = await fetch(`/api/recipes/${recipe.recipeId}`);
      if (!detailRes.ok) throw new Error("Could not load recipe");
      const detail = await detailRes.json();
      const r = detail.recipe || detail;
      const res = await fetch("/api/recipes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: r.title,
          description: r.description,
          ingredients: r.ingredients,
          steps: r.steps,
          servings: r.servings,
          prep_time_minutes: r.prep_time_minutes,
          cook_time_minutes: r.cook_time_minutes,
          tags: r.tags,
          meal_type: r.meal_type,
          source_url: r.source_url,
          source_platform: r.source_platform,
          image_url: r.image_url,
          calories: r.calories,
          protein_g: r.protein_g,
          carbs_g: r.carbs_g,
          fat_g: r.fat_g,
          fiber_g: r.fiber_g,
          notes: "Saved from Discover",
        }),
      });
      let savedId: string | null = null;
      let savedRecipe: Recipe | null = null;
      if (res.ok) {
        const data = await res.json();
        savedRecipe = (data.recipe as Recipe) ?? null;
        savedId = savedRecipe?.id ?? null;
      } else {
        const errData = await res.json();
        if (errData.duplicate && errData.recipeId) savedId = errData.recipeId;
        else throw new Error(errData.error || "Failed to save");
      }
      if (savedId) setSavedIdMap((m) => new Map(m).set(recipe.recipeId, savedId!));
      if (savedRecipe) {
        const realRow = savedRecipe;
        swrMutate(
          "supabase:recipes",
          (current: Recipe[] | undefined) => {
            const list = (current ?? []).filter((row) => row.id !== recipe.recipeId);
            if (list.some((row) => row.id === realRow.id)) return list;
            return [realRow, ...list];
          },
          false,
        );
      } else {
        swrMutate(
          "supabase:recipes",
          (current: Recipe[] | undefined) => (current ?? []).filter((row) => row.id !== recipe.recipeId),
          false,
        );
        swrMutate("supabase:recipes");
      }
      return savedId;
    } catch (err) {
      console.error("[Discover] save failed:", err);
      setSavedIds((prev) => { const n = new Set(prev); n.delete(recipe.recipeId); return n; });
      swrMutate(
        "supabase:recipes",
        (current: Recipe[] | undefined) => (current ?? []).filter((row) => row.id !== recipe.recipeId),
        false,
      );
      showToast("Failed to save recipe");
      return null;
    } finally {
      setSavingIds((prev) => { const n = new Set(prev); n.delete(recipe.recipeId); return n; });
    }
  }

  function handleSave(recipe: SaveableRecipe) {
    void saveRecipe(recipe);
  }

  async function handleSaveToCollection(recipe: SaveableRecipe) {
    if (!onAddToCollection) return;
    const cached = savedIdMap.get(recipe.recipeId);
    const id = cached ?? (await saveRecipe(recipe, { showToast: false }));
    if (id) onAddToCollection(id);
  }

  return { savedIds, savingIds, savedIdMap, handleSave, handleSaveToCollection };
}
