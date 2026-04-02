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
      {/* ── Banner (scrolls away) ────────────────────────────────── */}
      <div className="hidden sm:block px-4 pt-3" style={{ background: "#faf9f7" }}>
        <div className="max-w-5xl mx-auto">
          <div
            className="rounded-2xl h-20"
            style={{
              background: "linear-gradient(135deg, #fef3c7 0%, #fed7aa 40%, #fdba74 70%, #fb923c 100%)",
            }}
          />
        </div>
      </div>

      {/* ── Folder tabs (sticky on desktop) ──────────────────────── */}
      <div className="hidden sm:block sticky top-16 z-20 px-4" style={{ background: "#faf9f7" }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex gap-0 overflow-x-auto scrollbar-hide">
            {TAB_CONFIG.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex-shrink-0 relative group"
                  style={{ marginRight: -1 }}
                >
                  <div
                    className="rounded-t-xl px-5 py-2.5 flex items-center gap-1.5 transition-all duration-200 border border-b-0"
                    style={{
                      background: active ? "#fff" : "#f0ece7",
                      borderColor: active ? "#e8a050" : "#ddd5cc",
                      position: "relative",
                      zIndex: active ? 2 : 1,
                      boxShadow: active ? "0 -2px 8px rgba(249,115,22,0.08)" : "none",
                    }}
                  >
                    <span className="text-sm">{tab.emoji}</span>
                    <span
                      className="text-sm font-bold transition-colors duration-200"
                      style={{ color: active ? "#ea580c" : "#a09080" }}
                    >
                      {tab.label}
                    </span>
                  </div>
                </button>
              );
            })}
            {/* Filler to extend the bottom border */}
            <div className="flex-1 border-b" style={{ borderColor: "#e8a050" }} />
          </div>
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
