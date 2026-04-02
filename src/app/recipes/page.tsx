"use client";

import { useState, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";
import type { Recipe, Collection } from "@/types";
import { useRecipes, useCollections } from "@/lib/hooks/use-data";
import RecipeBrowser from "@/components/recipes/RecipeBrowser";

// ── Lazy-load inactive tabs & modals ──────────────────────────────────────────
const DiscoverTab = dynamic(() => import("@/components/recipes/DiscoverTab"));
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

type ActiveTab = "recipes" | "discover";

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

  // ── SWR data ────────────────────────────────────────────────────────────────
  const { data: recipes = [], isLoading: recipesLoading } = useRecipes();
  const { data: collectionsData, isLoading: collectionsLoading, mutate: mutateCollections } = useCollections();
  const collections: Collection[] = collectionsData?.collections ?? [];
  const loading = recipesLoading || collectionsLoading;

  const [activeTab, setActiveTab] = useState<ActiveTab>(
    searchParams.get("tab") === "discover" ? "discover" : "recipes"
  );
  // Quick-add sheet state
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [addSheetRecipeId, setAddSheetRecipeId] = useState<string | null>(null);
  const [addSheetMealTypes, setAddSheetMealTypes] = useState<string[]>(["dinner"]);

  // Add to collection modal state
  const [collectionRecipeId, setCollectionRecipeId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

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
      // After adding, navigate to meal plan and jump to the week of the first selected date
      const firstDate = [...dates].sort()[0];
      router.push(firstDate ? `/meal-plan?date=${firstDate}` : "/meal-plan");
    },
    [supabase, router]
  );

  return (
    <>
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 px-4 pt-4 pb-0" style={{ background: "#faf9f7" }}>
        <div className="max-w-5xl mx-auto">
          {/* Title row */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight" style={{ color: "#1a1410" }}>
                Recipes
              </h1>
              {!loading && recipes.length > 0 && (
                <p className="text-xs font-medium mt-0.5" style={{ color: "#a09890" }}>
                  {recipes.length} saved
                </p>
              )}
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-0">
            {(["recipes", "discover"] as ActiveTab[]).map((tab) => {
              const labels: Record<ActiveTab, string> = { recipes: "My Recipes", discover: "Discover" };
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="flex-shrink-0 px-4 py-2.5 text-sm font-bold rounded-t-2xl transition-all relative"
                  style={active
                    ? { background: "#fff", color: "#f97316", borderTop: "2px solid #f97316" }
                    : { background: "transparent", color: "#a09890", borderTop: "2px solid transparent" }}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recipes tab */}
      {activeTab === "recipes" && (
        <RecipeBrowser
          mode="library"
          recipes={recipes}
          collections={collections}
          loading={loading}
          mutateCollections={mutateCollections}
          onAddToMealPlan={(id) => {
            const recipe = recipes.find((r) => r.id === id);
            setAddSheetRecipeId(id);
            setAddSheetMealTypes(recipe?.meal_type ? [recipe.meal_type] : ["dinner"]);
            setAddSheetOpen(true);
          }}
          onAddToCollection={(id) => setCollectionRecipeId(id)}
        />
      )}

      {/* Discover tab — AI discovery + friends + community feed */}
      {activeTab === "discover" && (
        <DiscoverTab
          onAddToMealPlan={(id) => {
            const recipe = recipes.find((r) => r.id === id);
            setAddSheetRecipeId(id);
            setAddSheetMealTypes(recipe?.meal_type ? [recipe.meal_type] : ["dinner"]);
            setAddSheetOpen(true);
          }}
          onAddToCollection={(id) => setCollectionRecipeId(id)}
        />
      )}

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

      <ImportRecipeSheet isOpen={showImport} onClose={() => setShowImport(false)} />
    </>
  );
}
