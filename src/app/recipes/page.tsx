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
const GroceryPageContent = dynamic(() => import("@/components/grocery/GroceryPageContent"), { ssr: false });
const MealPlanPageContent = dynamic(() => import("@/components/meal-plan/MealPlanPageContent"), { ssr: false });
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

type ActiveTab = "recipes" | "discover" | "grocery" | "meal-plan";

const TAB_CONFIG: { key: ActiveTab; label: string; emoji: string }[] = [
  { key: "recipes", label: "My Recipes", emoji: "📖" },
  { key: "discover", label: "Discover", emoji: "🔍" },
  { key: "meal-plan", label: "Meal Plan", emoji: "📅" },
  { key: "grocery", label: "Grocery", emoji: "🛒" },
];

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

  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<ActiveTab>(
    (["recipes", "discover", "grocery", "meal-plan"].includes(tabParam ?? "") ? tabParam : "recipes") as ActiveTab
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
      // After adding, switch to meal plan tab and set date
      setActiveTab("meal-plan");
    },
    [supabase]
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

          {/* ── Folder tab bar ──────────────────────────────────────── */}
          <div className="flex gap-0 overflow-x-auto scrollbar-hide pb-0 -mb-px">
            {TAB_CONFIG.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex-shrink-0 relative group"
                >
                  {/* Gradient border wrapper */}
                  <div
                    className="rounded-t-2xl p-[1.5px] transition-all duration-200"
                    style={{
                      background: active
                        ? "linear-gradient(135deg, #f97316, #fb923c, #fbbf24)"
                        : "transparent",
                    }}
                  >
                    <div
                      className="rounded-t-[14px] px-4 py-2.5 flex items-center gap-1.5 transition-all duration-200"
                      style={{
                        background: active ? "#fff" : "transparent",
                      }}
                    >
                      <span className="text-xs">{tab.emoji}</span>
                      <span
                        className="text-sm font-bold transition-colors duration-200"
                        style={{ color: active ? "#f97316" : "#a09890" }}
                      >
                        {tab.label}
                      </span>
                    </div>
                  </div>

                  {/* Inactive hover underline hint */}
                  {!active && (
                    <div className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Active tab bottom border line */}
          <div className="h-[1.5px]" style={{ background: "linear-gradient(90deg, #f97316, #fb923c, #fbbf24)" }} />
        </div>
      </div>

      {/* ── Tab content ────────────────────────────────────────────── */}

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

      {/* Discover tab */}
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

      {/* Meal Plan tab */}
      {activeTab === "meal-plan" && (
        <MealPlanPageContent />
      )}

      {/* Grocery tab */}
      {activeTab === "grocery" && (
        <GroceryPageContent />
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
