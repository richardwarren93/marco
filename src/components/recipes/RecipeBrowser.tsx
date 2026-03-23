"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Recipe, Collection } from "@/types";
import { recipeMatchesQuery } from "@/lib/recipeSearch";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = "newest" | "oldest" | "alpha" | "cook_time";
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

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "alpha", label: "A–Z" },
  { value: "cook_time", label: "⏱ Cook time" },
];

const TAG_LIMIT = 8;

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
      className="relative bg-white rounded-2xl overflow-hidden shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
      onClick={handleCardClick}
    >
      {/* Image */}
      <div className="relative h-36 bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center overflow-hidden">
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
          <span className="text-4xl">{emoji}</span>
        )}

        {/* Pick mode: spinner while selecting */}
        {mode === "pick" && isPicking && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Library mode: + Add button */}
        {mode === "library" && onAdd && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-white hover:scale-110 transition-all z-10"
            aria-label="Add to meal plan"
          >
            <svg
              className="w-3.5 h-3.5 text-gray-700"
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
      <div className="p-2.5">
        <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
          {recipe.title}
        </p>
        {totalTime > 0 && (
          <p className="text-xs text-gray-400 mt-0.5">{totalTime} min</p>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RecipeBrowser(props: RecipeBrowserProps) {
  const { recipes } = props;

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [mealTypes, setMealTypes] = useState<Set<MealType>>(new Set());
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showAllTags, setShowAllTags] = useState(false);

  // Pick mode: which card is mid-selection
  const [selectingId, setSelectingId] = useState<string | null>(null);

  // All unique tags from the recipe library
  const allTags = useMemo(
    () => [...new Set(recipes.flatMap((r) => r.tags ?? []))].sort(),
    [recipes]
  );
  const visibleTags = showAllTags ? allTags : allTags.slice(0, TAG_LIMIT);
  const hasFilters = !!(search.trim() || mealTypes.size > 0 || selectedTags.length > 0);

  // Filtered + sorted recipe list
  const filtered = useMemo(() => {
    let result = recipes;

    if (search.trim()) {
      result = result.filter((r) => recipeMatchesQuery(r, search));
    }
    if (mealTypes.size > 0) {
      result = result.filter((r) =>
        mealTypes.has((r.meal_type ?? "dinner") as MealType)
      );
    }
    if (selectedTags.length > 0) {
      result = result.filter((r) =>
        selectedTags.every((t) => (r.tags ?? []).includes(t))
      );
    }

    const sorted = [...result];
    switch (sort) {
      case "newest":
        sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
        break;
      case "oldest":
        sorted.sort((a, b) => a.created_at.localeCompare(b.created_at));
        break;
      case "alpha":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "cook_time":
        sorted.sort(
          (a, b) =>
            (a.cook_time_minutes ?? Infinity) - (b.cook_time_minutes ?? Infinity)
        );
        break;
    }
    return sorted;
  }, [recipes, search, mealTypes, selectedTags, sort]);

  function toggleMealType(mt: MealType) {
    setMealTypes((prev) => {
      const next = new Set(prev);
      next.has(mt) ? next.delete(mt) : next.add(mt);
      return next;
    });
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function clearFilters() {
    setSearch("");
    setMealTypes(new Set());
    setSelectedTags([]);
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
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* ── Sticky header ─────────────────────────────────────────── */}
      <div className="bg-white sticky top-0 z-10 border-b border-gray-100 shadow-sm">

        {/* Title row */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          {props.mode === "pick" && (
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
          )}

          <div className="flex-1 flex items-center min-w-0">
            <h1 className="text-lg font-bold text-gray-900">
              {props.mode === "library" ? "My Recipes" : "Browse recipes"}
            </h1>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-2">
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

        {/* Sort + Meal type row */}
        <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto scrollbar-hide">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                sort === opt.value
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}

          <div className="w-px bg-gray-200 flex-shrink-0 self-stretch my-1" />

          {MEAL_TYPES.map((mt) => (
            <button
              key={mt}
              onClick={() => toggleMealType(mt)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                mealTypes.has(mt)
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {MEAL_TYPE_LABELS[mt]}
            </button>
          ))}
        </div>

        {/* Tags row */}
        {allTags.length > 0 && (
          <div className="flex gap-1.5 px-4 pb-3 flex-wrap">
            {visibleTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  selectedTags.includes(tag)
                    ? "bg-orange-100 text-orange-700 ring-1 ring-orange-200"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {tag}
              </button>
            ))}
            {allTags.length > TAG_LIMIT && (
              <button
                onClick={() => setShowAllTags((v) => !v)}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium text-gray-400 hover:text-orange-500 transition-colors"
              >
                {showAllTags
                  ? "Show less"
                  : `+${allTags.length - TAG_LIMIT} more`}
              </button>
            )}
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium text-red-400 hover:text-red-600 transition-colors"
              >
                Clear tags
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Scrollable body ────────────────────────────────────────── */}
      <div className="flex-1 px-4 py-4 pb-28 overflow-y-auto">

        {/* Collections row — library only */}
        {props.mode === "library" && props.collections.length > 0 && (
          <div className="mb-5">
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
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="h-36 bg-gray-100 animate-pulse" />
                <div className="p-2.5 space-y-1.5">
                  <div className="h-3 bg-gray-100 rounded-full animate-pulse w-4/5" />
                  <div className="h-3 bg-gray-100 rounded-full animate-pulse w-2/5" />
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
