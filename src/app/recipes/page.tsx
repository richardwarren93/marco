"use client";

import { useState, useCallback, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";
import useSWR from "swr";
import { useRecipes, useCollections, apiFetcher } from "@/lib/hooks/use-data";
import RecipeBrowser from "@/components/recipes/RecipeBrowser";
import PageHeader from "@/components/layout/PageHeader";
import KitchenSurface from "@/components/layout/KitchenSurface";
import KitchenTabs from "@/components/layout/KitchenTabs";

const ImportRecipeSheet = dynamic(() => import("@/components/recipes/ImportRecipeSheet"), { ssr: false });
const AddMealSheet = dynamic(() => import("@/components/meal-plan/AddMealSheet"), { ssr: false });
const AddToCollectionModal = dynamic(() => import("@/components/collections/AddToCollectionModal"), { ssr: false });

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

/* This page used to be the whole app: `?tab=` switched between recipes,
   discover, the meal plan, the grocery list and — by importing the route
   component — the profile page, each of which ALSO existed as its own route.
   Those are routes now, and these redirects keep old links (and anything
   still in a user's history) working. */
const LEGACY_TABS: Record<string, string> = {
  discover: "/discover",
  "meal-plan": "/meal-plan",
  grocery: "/grocery",
  profile: "/profile",
};

export default function RecipesPage() {
  return (
    <Suspense>
      <RecipesInner />
    </Suspense>
  );
}

function RecipesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  const legacyTarget = tabParam ? LEGACY_TABS[tabParam] : undefined;
  useEffect(() => {
    if (legacyTarget) router.replace(legacyTarget);
  }, [legacyTarget, router]);

  const { data: recipes = [], isLoading: recipesLoading } = useRecipes();
  const { data: collectionsData, isLoading: collectionsLoading, mutate: mutateCollections } = useCollections();
  const collections = collectionsData?.collections ?? [];
  const loading = recipesLoading || collectionsLoading;

  const { data: collRecipesData, mutate: mutateCollRecipes } = useSWR<{ recipe_ids: string[] }>(
    "/api/collections/recipe-ids",
    apiFetcher,
    { revalidateOnFocus: false }
  );
  const inCollectionIds = useMemo(() => new Set(collRecipesData?.recipe_ids ?? []), [collRecipesData]);

  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [addSheetRecipeId, setAddSheetRecipeId] = useState<string | null>(null);
  const [addSheetMealTypes, setAddSheetMealTypes] = useState<string[]>(["dinner"]);
  const [collectionRecipeId, setCollectionRecipeId] = useState<string | null>(null);

  /* The guide (and any ?import=1 link) opens the import sheet directly.
     Derived rather than set from an effect, so there's no extra render and no
     window where the sheet is open with the param already gone. */
  const importParam = searchParams.get("import");
  const [importClosedFor, setImportClosedFor] = useState<string | null>(null);
  const showImport = Boolean(importParam) && importClosedFor !== importParam;

  const supabase = createClient();
  const today = useMemo(() => formatDateKey(new Date()), []);
  const weekStart = useMemo(() => getMonday(new Date()), []);

  const handleAddToMealPlan = useCallback(
    async (recipeId: string, dates: string[], mealType: string, servings?: number) => {
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
    },
    [supabase]
  );

  const openMealSheet = (id: string) => {
    const recipe = recipes.find((r) => r.id === id);
    setAddSheetRecipeId(id);
    setAddSheetMealTypes(recipe?.meal_type ? [recipe.meal_type] : ["dinner"]);
    setAddSheetOpen(true);
  };

  if (legacyTarget) return null;

  return (
    <KitchenSurface>
      <PageHeader title="My Recipes" subtitle="everything you've saved" avatar />
      <div className="px-4"><KitchenTabs /></div>
      <RecipeBrowser
        mode="library"
        recipes={recipes}
        loading={loading}
        onAddToMealPlan={openMealSheet}
        onAddToCollection={(id) => setCollectionRecipeId(id)}
        inCollectionIds={inCollectionIds}
        onCollectionChanged={() => mutateCollRecipes()}
        collections={collections}
      />

      <AddMealSheet
        isOpen={addSheetOpen}
        defaultDate={today}
        defaultRecipeId={addSheetRecipeId ?? undefined}
        defaultMealTypes={addSheetMealTypes}
        weekStart={weekStart}
        allRecipes={recipes}
        onClose={() => {
          setAddSheetOpen(false);
          setAddSheetRecipeId(null);
        }}
        onAdd={handleAddToMealPlan}
      />

      <AddToCollectionModal
        recipeId={collectionRecipeId ?? ""}
        isOpen={!!collectionRecipeId}
        onClose={() => { setCollectionRecipeId(null); mutateCollections(); }}
      />

      <ImportRecipeSheet isOpen={showImport} onClose={() => setImportClosedFor(importParam)} />
    </KitchenSurface>
  );
}
