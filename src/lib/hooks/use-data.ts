"use client";

import useSWR, { type SWRConfiguration } from "swr";
import { createClient } from "@/lib/supabase/client";
import type { Recipe, Collection, MealPlan } from "@/types";

// ─── Generic fetcher for API routes ───────────────────────────────────────────
export const apiFetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── Recipes (direct Supabase query, cached via SWR) ──────────────────────────
async function fetchRecipes(): Promise<Recipe[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("recipes")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as Recipe[]) ?? [];
}

export function useRecipes(config?: SWRConfiguration<Recipe[]>) {
  return useSWR<Recipe[]>("supabase:recipes", fetchRecipes, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
    ...config,
  });
}

// ─── Collections ──────────────────────────────────────────────────────────────
export function useCollections(config?: SWRConfiguration) {
  return useSWR<{ collections: Collection[] }>(
    "/api/collections",
    apiFetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000, ...config }
  );
}

// ─── Meal Plans ───────────────────────────────────────────────────────────────
interface MealPlanData {
  plans: MealPlan[];
  householdPlans: MealPlan[];
}

async function fetchMealPlans([, startStr, endStr]: [string, string, string]): Promise<MealPlanData> {
  const supabase = createClient();

  // Parallel: user plans + household plans
  const [{ data }, hhRes] = await Promise.all([
    supabase
      .from("meal_plans")
      .select("*, recipe:recipes(*)")
      .order("planned_date", { ascending: true })
      .gte("planned_date", startStr)
      .lte("planned_date", endStr),
    fetch(`/api/meal-plan/household?start=${startStr}&end=${endStr}`)
      .then((r) => r.json())
      .catch(() => ({ plans: [] })),
  ]);

  return {
    plans: (data as MealPlan[]) || [],
    householdPlans: (hhRes.plans as MealPlan[]) || [],
  };
}

export function useMealPlans(startStr: string, endStr: string, config?: SWRConfiguration<MealPlanData>) {
  return useSWR<MealPlanData>(
    ["supabase:meal-plans", startStr, endStr],
    fetchMealPlans,
    { revalidateOnFocus: false, dedupingInterval: 5000, ...config }
  );
}

// ─── Single Recipe ────────────────────────────────────────────────────────────
async function fetchRecipeById([, id]: [string, string]): Promise<Recipe | null> {
  const supabase = createClient();

  // Try direct query (RLS for own recipes)
  const { data } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .single();

  if (data) return data as Recipe;

  // Fallback: API for household/shared
  try {
    const res = await fetch(`/api/recipes/${id}`);
    if (res.ok) {
      const json = await res.json();
      return json.recipe as Recipe;
    }
  } catch {
    // fetch failed
  }
  return null;
}

export function useRecipe(id: string, config?: SWRConfiguration<Recipe | null>) {
  return useSWR<Recipe | null>(
    id ? ["supabase:recipe", id] : null,
    fetchRecipeById,
    { revalidateOnFocus: false, dedupingInterval: 10000, ...config }
  );
}

// ─── Profile ──────────────────────────────────────────────────────────────────
export function useProfile(config?: SWRConfiguration) {
  return useSWR("/api/profile", apiFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
    ...config,
  });
}

// ─── Grocery List ─────────────────────────────────────────────────────────────
export function useGroceryList(dateStart: string, dateEnd: string, config?: SWRConfiguration) {
  return useSWR(
    `/api/grocery-list?date_start=${dateStart}&date_end=${dateEnd}`,
    apiFetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000, ...config }
  );
}

// ─── Trending ─────────────────────────────────────────────────────────────────
export function useTrending(config?: SWRConfiguration) {
  return useSWR("/api/recipes/trending", apiFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000, // trending changes slowly
    ...config,
  });
}
