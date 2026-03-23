"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Recipe, Collection } from "@/types";
import { recipeMatchesQuery } from "@/lib/recipeSearch";

// ─── Types ────────────────────────────────────────────────────────────────────

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

type LibraryMode = {
  mode: "library";
  recipes: Recipe[];
  collections: Collection[];
  loading?: boolean;
  /** Called when user taps "+" on a card — parent opens AddMealSheet */
  onAddToMealPlan?: (recipeId: string) => void;
};

type PickMode = {
  mode: "pick";
  recipes: Recipe[];
  onPick: (id: string) => Promise<void>;
  onBack: () => void;
};

export type RecipeBrowserProps = LibraryMode | PickMode;

// ─── Constants ────────────────────────────────────────────────────────────────

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const MEAL_EMOJIS: Record<MealType, string> = {
  breakfast: "🥞",
  lunch: "🥗",
  dinner: "🍽️",
  snack: "🍎",
};

// ─── Recipe card ──────────────────────────────────────────────────────────────

function BrowserCard({
  recipe,
  mode,
  onAdd,
  onPick,
  isPicking,
}: {
  recipe: Recipe;
  mode: "library" | "pick";
  onAdd?: () => void;
  onPick?: () => void;
  isPicking?: boolean;
}) {
  const router = useRouter();
  const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);
  const emoji = MEAL_EMOJIS[(recipe.meal_type as MealType) ?? "dinner"] ?? "🍳";

  function handleCardClick() {
    if (mode === "pick") {
      onPick?.();
    } else {
      router.push(`/recipes/${recipe.id}`);
    }
  }

  return (
    <div
      className="relative bg-white rounded-xl overflow-hidden shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
      onClick={handleCardClick}
    >
      {/* Image */}
      <div className="relative h-28 bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center overflow-hidden">
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
          <span className="text-3xl">{emoji}</span>
        )}

        {mode === "pick" && isPicking && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {mode === "library" && onAdd && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow hover:bg-white transition-colors z-10"
            aria-label="Add to meal plan"
          >
            <svg
              className="w-3 h-3 text-gray-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-2">
        <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-snug">
          {recipe.title}
        </p>
        {totalTime > 0 && (
          <p className="text-[10px] text-gray-400 mt-0.5">{totalTime} min</p>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RecipeBrowser(props: RecipeBrowserProps) {
  const { recipes } = props;

  const [search, setSearch] = useState("");
  const [activeMealType, setActiveMealType] = useState<MealType | "all">("all");
  const [sort, setSort] = useState<"newest" | "prep_time">("newest");
  const [showMealMenu, setShowMealMenu] = useState(false);
  const mealMenuRef = useRef<HTMLDivElement>(null);

  // Pick mode: which card is mid-selection
  const [selectingId, setSelectingId] = useState<string | null>(null);

  // Close meal menu on outside click
  useEffect(() => {
    if (!showMealMenu) return;
    function onDown(e: MouseEvent) {
      if (mealMenuRef.current && !mealMenuRef.current.contains(e.target as Node)) {
        setShowMealMenu(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showMealMenu]);

  const hasFilters = !!(search.trim() || activeMealType !== "all");

  // Filtered recipe list (sorted newest first)
  const filtered = useMemo(() => {
    let result = recipes;

    if (search.trim()) {
      result = result.filter((r) => recipeMatchesQuery(r, search));
    }
    if (activeMealType !== "all") {
      result = result.filter((r) =>
        (r.meal_type ?? "dinner") === activeMealType
      );
    }

    if (sort === "prep_time") {
      return [...result].sort((a, b) => {
        const aTime = (a.prep_time_minutes ?? 0) + (a.cook_time_minutes ?? 0);
        const bTime = (b.prep_time_minutes ?? 0) + (b.cook_time_minutes ?? 0);
        if (aTime === 0 && bTime === 0) return 0;
        if (aTime === 0) return 1;
        if (bTime === 0) return -1;
        return aTime - bTime;
      });
    }
    return [...result].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [recipes, search, activeMealType, sort]);

  function clearFilters() {
    setSearch("");
    setActiveMealType("all");
  }

  async function handlePick(recipeId: string) {
    if (props.mode !== "pick") return;
    setSelectingId(recipeId);
    try {
      await props.onPick(recipeId);
    } finally {
      setSelectingId(null);
    }
  }

  const isLoading = props.mode === "library" && props.loading;

  return (
    <div className="flex flex-col bg-gray-50">
      {/* ── Sticky header ─────────────────────────────────────────── */}
      <div className="bg-white sticky top-0 z-10 border-b border-gray-100 shadow-sm">

        {/* Pick mode: back button + title */}
        {props.mode === "pick" && (
          <div className="flex items-center gap-2 px-4 pt-4 pb-2">
            <button
              onClick={props.onBack}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0 -ml-1"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-gray-900">Browse recipes</h1>
          </div>
        )}

        {/* Search */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, ingredient, tag…"
              className="w-full pl-9 pr-9 py-2.5 bg-gray-100 rounded-xl text-sm outline-none focus:bg-gray-50 focus:ring-2 focus:ring-orange-200 transition-all"
              autoComplete="off"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Sort + meal type filters */}
        <div className="flex items-center gap-2 px-4 pb-2.5">
          {/* Sort pills */}
          <button
            onClick={() => setSort("newest")}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              sort === "newest"
                ? "bg-orange-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Newest
          </button>
          <button
            onClick={() => setSort("prep_time")}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              sort === "prep_time"
                ? "bg-orange-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Prep time
          </button>

          {/* Meal type dropdown */}
          <div className="relative" ref={mealMenuRef}>
            <button
              onClick={() => setShowMealMenu((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeMealType !== "all"
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {activeMealType !== "all" ? MEAL_TYPE_LABELS[activeMealType] : "Meal type"}
              <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showMealMenu && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1 min-w-[140px]">
                {([["all", "All"], ...MEAL_TYPES.map((mt) => [mt, MEAL_TYPE_LABELS[mt]])] as [string, string][]).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => { setActiveMealType(value as MealType | "all"); setShowMealMenu(false); }}
                    className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span>{label}</span>
                    {activeMealType === value && (
                      <svg className="w-3.5 h-3.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          {activeMealType !== "all" && (
            <button
              onClick={() => setActiveMealType("all")}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Scrollable body ────────────────────────────────────────── */}
      <div className="flex-1 px-4 py-4 pb-28 overflow-y-auto">

        {/* Collections row — library only */}
        {props.mode === "library" && props.collections.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Collections
            </p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-0.5 px-0.5">
              {props.collections.map((col) => (
                <Link
                  key={col.id}
                  href={`/collections/${col.id}`}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-gray-200 shadow-sm hover:border-orange-300 hover:shadow transition-all whitespace-nowrap"
                >
                  <span className="text-xs font-medium text-gray-700">
                    {col.name}
                  </span>
                  {col.recipe_count !== undefined && col.recipe_count > 0 && (
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                      {col.recipe_count}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm">
                <div className="h-28 bg-gray-100 animate-pulse" />
                <div className="p-2 space-y-1.5">
                  <div className="h-2.5 bg-gray-100 rounded-full animate-pulse w-4/5" />
                  <div className="h-2.5 bg-gray-100 rounded-full animate-pulse w-2/5" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          /* Empty state */
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">
              {hasFilters
                ? "No recipes match your filters"
                : "No recipes saved yet"}
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mt-3 text-sm text-orange-500 font-medium hover:text-orange-600"
              >
                Clear filters
              </button>
            )}
            {!hasFilters && props.mode === "library" && (
              <Link
                href="/recipes/new"
                className="mt-3 inline-block text-sm text-orange-500 font-medium hover:text-orange-600"
              >
                Save your first recipe →
              </Link>
            )}
          </div>
        ) : (
          /* Recipe grid */
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((recipe) => (
              <BrowserCard
                key={recipe.id}
                recipe={recipe}
                mode={props.mode}
                onAdd={
                  props.mode === "library" && props.onAddToMealPlan
                    ? () => props.onAddToMealPlan!(recipe.id)
                    : undefined
                }
                onPick={
                  props.mode === "pick" ? () => handlePick(recipe.id) : undefined
                }
                isPicking={selectingId === recipe.id}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
