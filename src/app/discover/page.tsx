"use client";

/* Discover — community recipes: search, recommended, trending, categories.
 *
 * This surface only existed as `/recipes?tab=discover`, reachable from a tab
 * bar nothing rendered any more, so it was effectively unreachable. It's a
 * route now, sitting in the Kitchen layer next to Recipes, Meal plan and
 * Groceries. */

import { useState, useMemo, Suspense } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { useRecipes } from "@/lib/hooks/use-data";
import PageHeader from "@/components/layout/PageHeader";
import KitchenSurface from "@/components/layout/KitchenSurface";
import KitchenTabs from "@/components/layout/KitchenTabs";

const DiscoverTab = dynamic(() => import("@/components/recipes/DiscoverTab"));
const AddMealSheet = dynamic(() => import("@/components/meal-plan/AddMealSheet"), { ssr: false });
const AddToCollectionModal = dynamic(() => import("@/components/collections/AddToCollectionModal"), { ssr: false });

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function DiscoverPage() {
  return (
    <Suspense>
      <DiscoverInner />
    </Suspense>
  );
}

function DiscoverInner() {
  const { data: recipes = [] } = useRecipes();
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [addSheetRecipeId, setAddSheetRecipeId] = useState<string | null>(null);
  const [addSheetMealTypes, setAddSheetMealTypes] = useState<string[]>(["dinner"]);
  const [collectionRecipeId, setCollectionRecipeId] = useState<string | null>(null);

  const supabase = createClient();
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const weekStart = useMemo(() => getMonday(new Date()), []);

  async function handleAddToMealPlan(recipeId: string, dates: string[], mealType: string, servings?: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await Promise.all(
      dates.map((date) =>
        supabase.from("meal_plans").insert({
          user_id: user.id,
          recipe_id: recipeId,
          planned_date: date,
          meal_type: mealType,
          servings: servings ?? 1,
          notes: null,
        })
      )
    );
  }

  return (
    <KitchenSurface>
      <PageHeader title="Discover" subtitle="find your next cook" avatar />
      <div className="px-4"><KitchenTabs /></div>
      <DiscoverTab
        onAddToMealPlan={(id) => {
          const recipe = recipes.find((r) => r.id === id);
          setAddSheetRecipeId(id);
          setAddSheetMealTypes(recipe?.meal_type ? [recipe.meal_type] : ["dinner"]);
          setAddSheetOpen(true);
        }}
        onAddToCollection={(id) => setCollectionRecipeId(id)}
      />

      <AddMealSheet
        isOpen={addSheetOpen}
        defaultDate={today}
        defaultRecipeId={addSheetRecipeId ?? undefined}
        defaultMealTypes={addSheetMealTypes}
        weekStart={weekStart}
        allRecipes={recipes}
        onClose={() => { setAddSheetOpen(false); setAddSheetRecipeId(null); }}
        onAdd={handleAddToMealPlan}
      />

      <AddToCollectionModal
        recipeId={collectionRecipeId ?? ""}
        isOpen={!!collectionRecipeId}
        onClose={() => setCollectionRecipeId(null)}
      />
    </KitchenSurface>
  );
}
