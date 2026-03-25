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
            {(["recipes", "collections", "table", "explore"] as ActiveTab[]).map((tab) => {
              const labels: Record<ActiveTab, string> = { recipes: "My Recipes", collections: "Collections", table: "Friends", explore: "Explore" };
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
        <div className="max-w-5xl mx-auto px-4 pb-8 pt-5 animate-fade-slide-up" style={{ background: "#faf9f7" }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-black tracking-tight" style={{ color: "#1a1410" }}>Collections</h2>
              {collections.length > 0 && (
                <p className="text-xs font-medium mt-0.5" style={{ color: "#a09890" }}>{collections.length} collection{collections.length !== 1 ? "s" : ""}</p>
              )}
            </div>
            <button
              onClick={() => setShowCollectionForm(!showCollectionForm)}
              className="text-white px-4 py-2 rounded-2xl text-sm font-bold active:scale-95 transition-transform"
              style={{ background: showCollectionForm ? "#6b6560" : "#1a1410" }}
            >
              {showCollectionForm ? "Cancel" : "+ New"}
            </button>
          </div>

          {showCollectionForm && (
            <div className="mb-5 animate-card-pop">
              <CreateCollectionForm onCreated={() => { setShowCollectionForm(false); fetchCollections(); }} />
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-28 skeleton-warm rounded-3xl" />
              ))}
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-20 rounded-3xl bg-white" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
              <div className="flex justify-center mb-4 opacity-30">
                <CollectionsIcon className="w-14 h-14" />
              </div>
              <p className="font-black text-gray-700 text-base mb-1">No collections yet</p>
              <p className="text-gray-400 text-sm mb-5">Group your recipes into curated collections</p>
              <button onClick={() => setShowCollectionForm(true)} className="px-5 py-2.5 rounded-2xl text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 transition-colors">
                Create first collection
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {collections.map((collection, i) => (
                <div key={collection.id} style={{ animation: `cardPop 0.4s ease ${i * 60}ms both` }}>
                  <CollectionCard collection={collection} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Explore tab — AI recipe discovery */}
      {activeTab === "explore" && (
        <div style={{ background: "#faf9f7", minHeight: "100%" }}>
          <ExploreTab />
        </div>
      )}

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
        onClose={() => { setCollectionRecipeId(null); fetchCollections(); }}
      />

      <ImportRecipeSheet isOpen={showImport} onClose={() => setShowImport(false)} />
    </>
  );
}
