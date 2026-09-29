"use client";

import { useState, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";
import useSWR from "swr";
import { useRecipes, useCollections, apiFetcher } from "@/lib/hooks/use-data";
import RecipeBrowser from "@/components/recipes/RecipeBrowser";
import ChaosHeader from "@/components/layout/ChaosHeader";
import { useToast } from "@/components/ui/Toast";

// ── Lazy-load inactive tabs & modals ──────────────────────────────────────────
const DiscoverTab = dynamic(() => import("@/components/recipes/DiscoverTab"));
const GroceryPageContent = dynamic(() => import("@/components/grocery/GroceryPageContent"), { ssr: false });
const MealPlanPageContent = dynamic(() => import("@/components/meal-plan/MealPlanPageContent"), { ssr: false });
const ProfilePage = dynamic(() => import("@/app/profile/page"), { ssr: false });
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

type ActiveTab = "recipes" | "discover" | "grocery" | "meal-plan" | "profile";

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
  const collections = collectionsData?.collections ?? [];
  const loading = recipesLoading || collectionsLoading;

  // Fetch all recipe IDs that are in any collection
  const { data: collRecipesData, mutate: mutateCollRecipes } = useSWR<{ recipe_ids: string[] }>(
    "/api/collections/recipe-ids",
    apiFetcher,
    { revalidateOnFocus: false }
  );
  const inCollectionIds = useMemo(() => new Set(collRecipesData?.recipe_ids ?? []), [collRecipesData]);

  const tabParam = searchParams.get("tab");
  const activeTab: ActiveTab = (["recipes", "discover", "grocery", "meal-plan", "profile"].includes(tabParam ?? "") ? tabParam : "recipes") as ActiveTab;

  // Quick-add sheet state
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [addSheetRecipeId, setAddSheetRecipeId] = useState<string | null>(null);
  const [addSheetMealTypes, setAddSheetMealTypes] = useState<string[]>(["dinner"]);

  // Add to collection modal state
  const [collectionRecipeId, setCollectionRecipeId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const supabase = createClient();
  const { showToast } = useToast();

  const today = useMemo(() => formatDateKey(new Date()), []);
  const weekStart = useMemo(() => getMonday(new Date()), []);

  const handleAddToMealPlan = useCallback(
    async (recipeId: string, dates: string[], mealType: string, servings?: number) => {
      console.log("[MealAdd] handleAddToMealPlan called", { recipeId, dates, mealType });
      const { data: { user } } = await supabase.auth.getUser();
      console.log("[MealAdd] user:", user?.id || "NO USER");
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

      // Sheet handles toast + closing via AddMealSheet
    },
    [supabase]
  );

  return (
    <>
      {/* Every tab now wears the same identity header as the Table (friends)
          tab — Marker Felt wordmark + handwritten subtitle + avatar — on the
          shared dotted-cream background, instead of the old utility top nav. */}

      {/* Recipes tab */}
      {activeTab === "recipes" && (
        <div style={{ minHeight: "100dvh", background: "#E9E2D3", backgroundImage: "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)", backgroundSize: "13px 13px" }}>
          <ChaosHeader title="My Recipes" subtitle="everything you've saved" />
          <RecipeBrowser
            mode="library"
            recipes={recipes}
            loading={loading}
            onAddToMealPlan={(id) => {
              const recipe = recipes.find((r) => r.id === id);
              setAddSheetRecipeId(id);
              setAddSheetMealTypes(recipe?.meal_type ? [recipe.meal_type] : ["dinner"]);
              setAddSheetOpen(true);
            }}
            onAddToCollection={(id) => setCollectionRecipeId(id)}
            inCollectionIds={inCollectionIds}
            onCollectionChanged={() => mutateCollRecipes()}
            collections={collections}
          />
        </div>
      )}

      {/* Discover tab */}
      {activeTab === "discover" && (
        <>
          <ChaosHeader title="Explore" subtitle="find your next cook" />
          <DiscoverTab
            onAddToMealPlan={(id) => {
              const recipe = recipes.find((r) => r.id === id);
              setAddSheetRecipeId(id);
              setAddSheetMealTypes(recipe?.meal_type ? [recipe.meal_type] : ["dinner"]);
              setAddSheetOpen(true);
            }}
            onAddToCollection={(id) => setCollectionRecipeId(id)}
          />
        </>
      )}

      {/* Meal Plan tab */}
      {activeTab === "meal-plan" && (
        <>
          <ChaosHeader title="Meal Plan" subtitle="your week, sorted" />
          <MealPlanPageContent />
        </>
      )}

      {/* Grocery tab */}
      {activeTab === "grocery" && (
        <>
          <ChaosHeader title="Grocery" subtitle="what to grab" />
          <GroceryPageContent />
        </>
      )}

      {/* Profile tab renders its own header. */}
      {activeTab === "profile" && <ProfilePage />}

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
