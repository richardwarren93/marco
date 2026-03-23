"use client";

import { useState, useMemo, useRef, useEffect } from "react";
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
  { value: "cook_time", label: "Cook time" },
];

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
  const [sort, setSort] = useState<SortKey>("newest");
  const [mealTypes, setMealTypes] = useState<Set<MealType>>(new Set());
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Pick mode: which card is mid-selection
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const sortMenuRef = useRef<HTMLDivElement>(null);

  // Close sort menu when clicking outside
  useEffect(() => {
    if (!showSortMenu) return;
    function onDown(e: MouseEvent) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showSortMenu]);

  // All unique tags from the recipe library
  const allTags = useMemo(
    () => [...new Set(recipes.flatMap((r) => r.tags ?? []))].sort(),
    [recipes]
  );

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
  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Newest";

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
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

        {/* Filter controls row */}
        <div className="flex items-center gap-1.5 px-4 pb-2.5 overflow-x-auto scrollbar-hide">

          {/* Sort dropdown */}
          <div className="relative flex-shrink-0" ref={sortMenuRef}>
            <button
              onClick={() => setShowSortMenu((v) => !v)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                sort !== "newest"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {currentSortLabel}
              <svg
                className="w-3 h-3 opacity-60"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showSortMenu && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1 min-w-[120px]">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setSort(opt.value);
                      setShowSortMenu(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-gray-50 transition-colors ${
                      sort === opt.value ? "text-orange-500" : "text-gray-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-4 bg-gray-200 flex-shrink-0" />

          {/* Meal type pills */}
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

          {/* More filters button — only if there are tags */}
          {allTags.length > 0 && (
            <>
              <div className="w-px h-4 bg-gray-200 flex-shrink-0" />
              <button
                onClick={() => setShowFiltersPanel(true)}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedTags.length > 0
                    ? "bg-orange-100 text-orange-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"
                  />
                </svg>
                {selectedTags.length > 0 ? `Tags · ${selectedTags.length}` : "More filters"}
              </button>
            </>
          )}
        </div>

        {/* Active tag chips — only when tags are selected */}
        {selectedTags.length > 0 && (
          <div className="flex gap-1.5 px-4 pb-2.5 overflow-x-auto scrollbar-hide">
            {selectedTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-orange-100 text-orange-700"
              >
                {tag}
                <svg
                  className="w-2.5 h-2.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ))}
            <button
              onClick={() => setSelectedTags([])}
              className="flex-shrink-0 px-2 py-1 text-[11px] text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          </div>
        )}
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

      {/* ── Tags filter panel (bottom drawer) ─────────────────────── */}
      {showFiltersPanel && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/30"
            onClick={() => setShowFiltersPanel(false)}
          />
          <div
            className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-xl flex flex-col"
            style={{
              maxHeight: "65vh",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">Filter by tag</h3>
              <div className="flex items-center gap-3">
                {selectedTags.length > 0 && (
                  <button
                    onClick={() => setSelectedTags([])}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => setShowFiltersPanel(false)}
                  className="text-xs font-semibold text-orange-500 hover:text-orange-600"
                >
                  Done
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 px-5 py-4 overflow-y-auto">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedTags.includes(tag)
                      ? "bg-orange-100 text-orange-700 ring-1 ring-orange-200"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
