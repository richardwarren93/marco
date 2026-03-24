"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Recipe, Collection } from "@/types";
import RecipeBrowser from "@/components/recipes/RecipeBrowser";
import AddMealSheet from "@/components/meal-plan/AddMealSheet";
import CollectionCard from "@/components/collections/CollectionCard";
import CreateCollectionForm from "@/components/collections/CreateCollectionForm";
import AddToCollectionModal from "@/components/collections/AddToCollectionModal";
import { CollectionsIcon } from "@/components/icons/HandDrawnIcons";
import FriendsRecipeTable from "@/components/recipes/FriendsRecipeTable";
import ExploreTab from "@/components/recipes/ExploreTab";
import ImportRecipeSheet from "@/components/recipes/ImportRecipeSheet";

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

type ActiveTab = "recipes" | "collections" | "table" | "explore";

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
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>(
    searchParams.get("tab") === "collections"
      ? "collections"
      : searchParams.get("tab") === "table"
      ? "table"
      : searchParams.get("tab") === "explore"
      ? "explore"
      : "recipes"
  );
  const [showCollectionForm, setShowCollectionForm] = useState(false);

  // Quick-add sheet state
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [addSheetRecipeId, setAddSheetRecipeId] = useState<string | null>(null);
  const [addSheetMealTypes, setAddSheetMealTypes] = useState<string[]>(["dinner"]);

  // Add to collection modal state
  const [collectionRecipeId, setCollectionRecipeId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const supabase = createClient();

  async function fetchCollections() {
    try {
      const res = await fetch("/api/collections");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCollections(data.collections || []);
    } catch (error) {
      console.error("Fetch collections error:", error);
    }
  }

  useEffect(() => {
    async function fetchData() {
      const [recipesRes, collectionsRes] = await Promise.all([
        supabase.from("recipes").select("*").order("created_at", { ascending: false }),
        fetch("/api/collections").then((r) => r.json()),
      ]);
      setRecipes((recipesRes.data as Recipe[]) ?? []);
      setCollections(collectionsRes.collections ?? []);
      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      {/* ── Sticky page header ─────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between h-14">
          <h1 className="text-xl font-bold text-gray-900">Recipes</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-3 sm:pt-4">
        {/* Segmented control + Import button */}
        <div className="flex items-center justify-between mb-4 sm:mb-5">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 max-w-[440px]">
          <button
            onClick={() => setActiveTab("recipes")}
            className={`flex-1 text-sm font-medium py-1.5 px-3 rounded-lg transition-all ${
              activeTab === "recipes"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Recipes
          </button>
          <button
            onClick={() => setActiveTab("collections")}
            className={`flex-1 text-sm font-medium py-1.5 px-3 rounded-lg transition-all ${
              activeTab === "collections"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Collections
          </button>
          <button
            onClick={() => setActiveTab("table")}
            className={`flex-1 text-sm font-medium py-1.5 px-3 rounded-lg transition-all ${
              activeTab === "table"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Table
          </button>
          <button
            onClick={() => setActiveTab("explore")}
            className={`flex-1 text-sm font-medium py-1.5 px-3 rounded-lg transition-all ${
              activeTab === "explore"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Explore
          </button>
        </div>
          {/* Import Recipe — inline, desktop only (mobile uses center + in BottomTabBar) */}
          <button
            onClick={() => setShowImport(true)}
            className="hidden sm:flex items-center gap-1.5 bg-orange-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors shadow-sm flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Import
          </button>
        </div>
      </div>

      {/* Recipes tab */}
      {activeTab === "recipes" && (
        <RecipeBrowser
          mode="library"
          recipes={recipes}
          collections={collections}
          loading={loading}
          onAddToMealPlan={(id) => {
            const recipe = recipes.find((r) => r.id === id);
            setAddSheetRecipeId(id);
            setAddSheetMealTypes(recipe?.meal_type ? [recipe.meal_type] : ["dinner"]);
            setAddSheetOpen(true);
          }}
          onAddToCollection={(id) => setCollectionRecipeId(id)}
        />
      )}

      {/* Collections tab */}
      {activeTab === "collections" && (
        <div className="max-w-5xl mx-auto px-4 pb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <CollectionsIcon className="w-6 h-6 text-orange-600" />
              Collections
            </h2>
            <button
              onClick={() => setShowCollectionForm(!showCollectionForm)}
              className="bg-orange-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-orange-700 transition-colors shadow-sm"
            >
              {showCollectionForm ? "Cancel" : "+ New"}
            </button>
          </div>

          {showCollectionForm && (
            <div className="mb-5">
              <CreateCollectionForm
                onCreated={() => {
                  setShowCollectionForm(false);
                  fetchCollections();
                }}
              />
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
              <div className="text-gray-300 flex justify-center mb-3">
                <CollectionsIcon className="w-12 h-12" />
              </div>
              <p className="text-gray-500 mb-3">No collections yet</p>
              <button
                onClick={() => setShowCollectionForm(true)}
                className="text-orange-600 hover:text-orange-700 font-medium text-sm"
              >
                Create your first collection →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {collections.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Explore tab — AI recipe discovery */}
      {activeTab === "explore" && <ExploreTab />}

      {/* Table tab — friends' recipes */}
      {activeTab === "table" && (
        <div className="max-w-5xl mx-auto">
          <FriendsRecipeTable
            onAddToMealPlan={(id) => {
              const recipe = recipes.find((r) => r.id === id);
              setAddSheetRecipeId(id);
              setAddSheetMealTypes(recipe?.meal_type ? [recipe.meal_type] : ["dinner"]);
              setAddSheetOpen(true);
            }}
            onAddToCollection={(id) => setCollectionRecipeId(id)}
          />
        </div>
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
        onClose={() => setCollectionRecipeId(null)}
      />

      <ImportRecipeSheet isOpen={showImport} onClose={() => setShowImport(false)} />
    </>
  );
}
