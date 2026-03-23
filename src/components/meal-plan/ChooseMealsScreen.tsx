"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Recipe } from "@/types";
import { recipeMatchesQuery } from "@/lib/recipeSearch";

const MEAL_TABS = ["breakfast", "lunch", "dinner", "snack"] as const;
type MealTab = (typeof MEAL_TABS)[number];
type ActiveTab = "all" | MealTab;

const TAB_LABELS: Record<ActiveTab, string> = {
  all: "All",
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const MEAL_PLACEHOLDER: Record<MealTab, string> = {
  breakfast: "🥞",
  lunch: "🥗",
  dinner: "🍽️",
  snack: "🍎",
};

const SEED_PILLS: Record<ActiveTab, string[]> = {
  all: ["Quick meals", "High protein", "Weeknight", "Comfort food"],
  breakfast: ["Quick & easy", "High protein", "Egg-based", "Overnight"],
  lunch: ["Salad", "Soup", "Grain bowl", "Wrap"],
  dinner: ["30 min", "One-pot", "Pasta", "Grilled"],
  snack: ["Healthy", "High protein", "Sweet", "No-bake"],
};

// ─── Discriminated prop union ─────────────────────────────────────────────────

type BuildProps = {
  mode: "build";
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onViewMeals: () => void;
  /** The week being planned (ISO Monday date) — used for the header sub-label */
  planningWeek?: string;
  /** Go back to schedule */
  onBack?: () => void;
};

type BrowseProps = {
  mode: "browse";
  /** e.g. "Tuesday, Mar 25 · Dinner" */
  browseLabel: string;
  /** Called immediately when user taps a recipe card */
  onBrowseSelect: (recipeId: string) => Promise<void>;
  onBack: () => void;
};

type ChooseMealsScreenProps = { recipes: Recipe[] } & (BuildProps | BrowseProps);

export default function ChooseMealsScreen(props: ChooseMealsScreenProps) {
  const router = useRouter();
  const { recipes } = props;

  const [activeTab, setActiveTab] = useState<ActiveTab>("dinner");
  const [search, setSearch] = useState("");
  const [browsing, setBrowsing] = useState<string | null>(null); // recipeId being assigned in browse mode

  // AI search state (build mode only)
  const [aiResults, setAiResults] = useState<Recipe[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const searchedQueries = useRef<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return recipes.filter((r) => {
      const matchesTab = activeTab === "all" || (r.meal_type || "dinner") === activeTab;
      const matchesSearch = !search.trim() || recipeMatchesQuery(r, search);
      return matchesTab && matchesSearch;
    });
  }, [recipes, activeTab, search]);

  const displayRecipes = aiResults ?? filtered;

  function handleSearchChange(val: string) {
    setSearch(val);
    setAiResults(null);
    setAiError("");
  }

  // ─── AI search (build mode only) ────────────────────────────────────────────

  async function runAiSearch(query: string) {
    searchedQueries.current.add(query);
    setAiLoading(true);
    setAiError("");
    try {
      const res = await fetch("/api/recipes/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, meal_type: activeTab === "all" ? null : activeTab }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI search failed");
      setAiResults(data.recipes as Recipe[]);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI search failed");
    } finally {
      setAiLoading(false);
    }
  }

  function isSimilarToSearched(query: string): boolean {
    const q = query.toLowerCase();
    const qWords = q.split(/\s+/).filter(Boolean);
    for (const prev of searchedQueries.current) {
      const p = prev.toLowerCase();
      if (q.includes(p) || p.includes(q)) return true;
      const pWords = p.split(/\s+/).filter(Boolean);
      const pSet = new Set(pWords);
      const intersection = qWords.filter((w) => pSet.has(w)).length;
      const union = new Set([...qWords, ...pWords]).size;
      if (union > 0 && intersection / union >= 0.6) return true;
    }
    return false;
  }

  useEffect(() => {
    if (props.mode !== "build") return; // No AI in browse mode
    const q = search.trim();
    if (!q || filtered.length > 0) {
      setAiResults(null);
      setAiLoading(false);
      return;
    }
    if (isSimilarToSearched(q)) return;
    const timer = setTimeout(() => runAiSearch(q), 900);
    return () => clearTimeout(timer);
  }, [search, filtered.length, props.mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Week label for build mode ────────────────────────────────────────────────
  const planningWeekLabel = useMemo(() => {
    if (props.mode !== "build" || !props.planningWeek) return null;
    try {
      const monday = new Date(props.planningWeek + "T12:00:00");
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      const fmt = (d: Date) =>
        d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return `${fmt(monday)} – ${fmt(sunday)}`;
    } catch {
      return null;
    }
  }, [props.mode, props.mode === "build" ? props.planningWeek : ""]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Header ───────────────────────────────────────────────────────────────────
  const headerTitle =
    props.mode === "browse" ? `Add to ${props.browseLabel}` : "Select your meals";

  const headerSub = props.mode === "build" && planningWeekLabel ? planningWeekLabel : null;

  const selectedCount = props.mode === "build" ? props.selectedIds.size : 0;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Sticky header */}
      <div className="bg-white px-4 pt-6 pb-3 space-y-3 sticky top-0 z-10 border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          {(props.mode === "browse" || (props.mode === "build" && props.onBack)) && (
            <button
              onClick={props.onBack}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 leading-tight">{headerTitle}</h1>
            {headerSub && (
              <p className="text-xs text-gray-400 mt-0.5">{headerSub}</p>
            )}
          </div>
        </div>

        {/* Meal type tabs — All + Breakfast/Lunch/Dinner/Snack */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          {(["all", ...MEAL_TABS] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                handleSearchChange("");
              }}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* Search + Discover (build mode only) */}
        {props.mode === "build" && (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={activeTab === "all" ? "Search all recipes…" : `Search ${TAB_LABELS[activeTab].toLowerCase()} recipes…`}
                className="w-full pl-9 pr-3 py-2.5 bg-gray-100 rounded-xl text-sm outline-none focus:bg-gray-200 transition-colors"
              />
              {search && (
                <button
                  onClick={() => handleSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <button
              onClick={() => router.push("/discover")}
              className="text-sm font-bold text-orange-500 hover:text-orange-600 flex-shrink-0 px-1 transition-colors"
            >
              Discover
            </button>
          </div>
        )}

        {/* Browse mode: simple search */}
        {props.mode === "browse" && (
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search recipes…"
              className="w-full pl-9 pr-3 py-2.5 bg-gray-100 rounded-xl text-sm outline-none focus:bg-gray-200 transition-colors"
            />
            {search && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Seed pills — build mode, no search */}
        {props.mode === "build" && !search && (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
            {SEED_PILLS[activeTab].map((pill) => (
              <button
                key={pill}
                onClick={() => handleSearchChange(pill)}
                className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors border border-orange-100"
              >
                {pill}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recipe grid */}
      <div className="flex-1 px-4 py-4 pb-28 overflow-y-auto">
        {/* AI search label (build mode) */}
        {props.mode === "build" && aiResults !== null && (
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-3.5 h-3.5 text-orange-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" />
            </svg>
            <span className="text-xs font-medium text-orange-500">
              {aiResults.length > 0
                ? `AI found ${aiResults.length} match${aiResults.length !== 1 ? "es" : ""} in your recipes`
                : "No matches found in your recipes"}
            </span>
            <button
              onClick={() => handleSearchChange("")}
              className="ml-auto text-xs text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          </div>
        )}

        {aiLoading ? (
          <div className="text-center py-20">
            <div className="inline-flex flex-col items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2.5 h-2.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2.5 h-2.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <p className="text-sm font-medium text-gray-500">Simmering… Hold tight</p>
              <p className="text-xs text-gray-300">Searching your recipe library with AI</p>
            </div>
          </div>
        ) : displayRecipes.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-gray-400 text-sm">
              {search
                ? aiResults !== null
                  ? `No saved recipes match "${search}"`
                  : `No ${activeTab === "all" ? "" : activeTab + " "}recipes saved yet for "${search}"`
                : `No ${activeTab === "all" ? "" : activeTab + " "}recipes saved yet`}
            </p>
            {search && aiResults !== null && props.mode === "build" && (
              <p className="text-xs text-gray-300">
                Try{" "}
                <button
                  onClick={() => router.push("/discover")}
                  className="text-orange-500 font-medium"
                >
                  Discover
                </button>{" "}
                to find new recipes
              </p>
            )}
            {aiError && <p className="text-xs text-red-500">{aiError}</p>}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {displayRecipes.map((recipe) => {
              const isBuild = props.mode === "build";
              const isSelected = isBuild && props.selectedIds.has(recipe.id);
              const totalTime =
                (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
              const isAssigning = props.mode === "browse" && browsing === recipe.id;

              return (
                <div
                  key={recipe.id}
                  className="relative bg-white rounded-2xl overflow-hidden shadow-sm cursor-pointer"
                  onClick={async () => {
                    if (props.mode === "browse") {
                      setBrowsing(recipe.id);
                      try {
                        await props.onBrowseSelect(recipe.id);
                      } finally {
                        setBrowsing(null);
                      }
                    } else {
                      router.push(`/recipes/${recipe.id}`);
                    }
                  }}
                >
                  {/* Image */}
                  <div className="relative h-36 bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
                    {recipe.image_url ? (
                      <img
                        src={recipe.image_url}
                        alt={recipe.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="text-4xl">
                        {MEAL_PLACEHOLDER[(recipe.meal_type || "dinner") as MealTab] || "🍳"}
                      </span>
                    )}

                    {/* Build mode: ✓ toggle button */}
                    {isBuild && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          props.onToggle(recipe.id);
                        }}
                        className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-all z-10 ${
                          isSelected
                            ? "bg-orange-500 text-white"
                            : "bg-white/90 text-gray-700 hover:bg-white"
                        }`}
                      >
                        {isSelected ? (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                        )}
                      </button>
                    )}

                    {/* Browse mode: assigning spinner */}
                    {props.mode === "browse" && isAssigning && (
                      <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Card content */}
                  <div className="p-2.5">
                    <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
                      {recipe.title}
                    </p>
                    {totalTime > 0 && (
                      <p className="text-xs text-gray-400 mt-1">{totalTime} min</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Build mode: "View meals · N" sticky CTA */}
      {props.mode === "build" && selectedCount > 0 && (
        <div className="fixed bottom-20 inset-x-0 flex justify-center z-20 pointer-events-none">
          <button
            onClick={props.onViewMeals}
            className="pointer-events-auto flex items-center gap-2 bg-gray-900 text-white px-6 py-3.5 rounded-full shadow-xl text-sm font-semibold hover:bg-gray-800 active:scale-95 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            View meals · {selectedCount}
          </button>
        </div>
      )}
    </div>
  );
}
