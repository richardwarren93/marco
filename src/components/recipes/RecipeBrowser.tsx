"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Recipe } from "@/types";
import { recipeMatchesQuery } from "@/lib/recipeSearch";
import SharedRecipeCard from "./SharedRecipeCard";
import { CollectionsIcon, SearchIcon } from "@/components/icons/HandDrawnIcons";
import { MealIcon } from "@/components/icons/MealIcons";

// ─── Types ────────────────────────────────────────────────────────────────────

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

type LibraryMode = {
  mode: "library";
  recipes: Recipe[];
  loading?: boolean;
  /** Called when user taps "+" on a card — parent opens AddMealSheet */
  onAddToMealPlan?: (recipeId: string) => void;
  /** Called when user taps bookmark on a card — parent opens AddToCollectionModal */
  onAddToCollection?: (recipeId: string) => void;
  /** Set of recipe IDs that are in at least one collection */
  inCollectionIds?: Set<string>;
  /** Called after a collection change to refresh the inCollectionIds */
  onCollectionChanged?: () => void;
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

// ─── Recipe card ──────────────────────────────────────────────────────────────

function BrowserCard({
  recipe,
  mode,
  onAdd,
  onCollection,
  isInCollection,
  onPick,
  isPicking,
  index = 0,
}: {
  recipe: Recipe;
  mode: "library" | "pick";
  onAdd?: () => void;
  onCollection?: () => void;
  isInCollection?: boolean;
  onPick?: () => void;
  isPicking?: boolean;
  index?: number;
}) {
  const router = useRouter();
  const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

  function handleCardClick() {
    if (mode === "pick") {
      onPick?.();
    } else {
      router.push(`/recipes/${recipe.id}`);
    }
  }

  const actions = mode === "library"
    ? [
        ...(onCollection
          ? [{
              icon: (
                <svg className="w-3.5 h-3.5 text-white" fill={isInCollection ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              ),
              onClick: onCollection,
              label: isInCollection ? "In collection" : "Add to collection",
            }]
          : []),
        ...(onAdd
          ? [{
              icon: (
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              ),
              onClick: onAdd,
              label: "Add to meal plan",
            }]
          : []),
      ]
    : [];

  return (
    <SharedRecipeCard
      title={recipe.title}
      imageUrl={recipe.image_url}
      mealType={recipe.meal_type}
      totalTime={totalTime}
      onClick={handleCardClick}
      actions={actions}
      topLeftBadge={
        mode === "pick" && isPicking ? (
          <div className="w-7 h-7 flex items-center justify-center rounded-full bg-black/25 backdrop-blur-md">
            <div className="w-3.5 h-3.5 border-[1.5px] border-white border-t-transparent rounded-full animate-spin" />
          </div>
        ) : undefined
      }
      index={index}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RecipeBrowser(props: RecipeBrowserProps) {
  const { recipes } = props;

  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeMealType, setActiveMealType] = useState<MealType | "all">("all");
  const [sort, setSort] = useState<"newest" | "prep_time">("newest");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showMealMenu, setShowMealMenu] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const mealMenuRef = useRef<HTMLDivElement>(null);

  // Pick mode: which card is mid-selection
  const [selectingId, setSelectingId] = useState<string | null>(null);

  // Close any open dropdown on outside click/touch
  function closeAllMenus() {
    setShowSortMenu(false);
    setShowMealMenu(false);
  }

  useEffect(() => {
    const anyOpen = showSortMenu || showMealMenu;
    if (!anyOpen) return;
    function onDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (showSortMenu && sortMenuRef.current && !sortMenuRef.current.contains(target)) setShowSortMenu(false);
      if (showMealMenu && mealMenuRef.current && !mealMenuRef.current.contains(target)) setShowMealMenu(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [showSortMenu, showMealMenu]);

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

  const displayRecipes = filtered;

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
    <div className="flex flex-col" style={{ background: "#F5EEE2" }}>
      {/* ── Sticky header ─────────────────────────────────────────── */}
      <div>
        <div className="max-w-5xl mx-auto">

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
              className="w-full pl-9 pr-9 py-2.5 rounded-2xl text-[13px] font-medium tracking-tight outline-none transition-all placeholder:font-medium placeholder:text-[var(--ink-soft,#4A4742)] placeholder:opacity-60"
              style={{ background: "#fff", border: "1.5px solid rgba(28,26,23,0.12)" }}
              onFocus={(e) => (e.target.style.borderColor = "#E5462E")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(28,26,23,0.12)")}
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
        <div className="flex items-center gap-2 px-4 pb-2.5 relative z-30">
          {/* Sort dropdown */}
          <div className="relative flex-shrink-0" ref={sortMenuRef}>
            <button
              onClick={() => { setShowSortMenu((v) => !v); setShowMealMenu(false); }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium tracking-tight transition-all active:scale-95 whitespace-nowrap"
              style={{ background: "#1C1A17", color: "#fff" }}
            >
              {sort === "newest" ? "Newest" : "Prep time"}
              <svg className={`w-3 h-3 opacity-60 transition-transform ${showSortMenu ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showSortMenu && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 py-1.5 min-w-[140px] overflow-hidden"
                style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
                {([["newest", "Newest"], ["prep_time", "Prep time"]] as const).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => { setSort(value); setShowSortMenu(false); }}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-gray-50"
                    style={{ color: sort === value ? "#1C1A17" : "#6b6560" }}
                  >
                    <span>{label}</span>
                    {sort === value && (
                      <svg className="w-3.5 h-3.5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Meal type dropdown */}
          <div className="relative flex-shrink-0" ref={mealMenuRef}>
            <button
              onClick={() => { setShowMealMenu((v) => !v); setShowSortMenu(false); }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium tracking-tight transition-all active:scale-95 whitespace-nowrap"
              style={activeMealType !== "all"
                ? { background: "var(--tomato, #E5462E)", color: "#fff" }
                : { background: "var(--cream-warm, #EFE5D2)", color: "var(--ink-soft, #4A4742)" }}
            >
              {activeMealType !== "all" ? MEAL_TYPE_LABELS[activeMealType] : "Meal type"}
              <svg className={`w-3 h-3 opacity-60 transition-transform ${showMealMenu ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showMealMenu && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 py-1.5 min-w-[150px] overflow-hidden"
                style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
                {([["all", "All"], ...MEAL_TYPES.map((mt) => [mt, MEAL_TYPE_LABELS[mt]])] as [string, string][]).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => { setActiveMealType(value as MealType | "all"); setShowMealMenu(false); }}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-orange-50"
                    style={{ color: activeMealType === value ? "var(--tomato, #E5462E)" : "#374151" }}
                  >
                    <span>{label}</span>
                    {activeMealType === value && (
                      <svg className="w-3.5 h-3.5" style={{ color: "var(--tomato, #E5462E)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Collections — first-class nav. Tap to open the Collections page.
              Teal anchors editorial layouts per brand guidelines — distinct
              from tomato (CTAs) and mustard (accents). */}
          {props.mode === "library" && (
            <button
              onClick={() => router.push("/collections")}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium tracking-tight transition-all active:scale-95 flex-shrink-0"
              style={{ background: "var(--teal, #0F4C5C)", color: "var(--cream, #F5EEE2)" }}
            >
              <CollectionsIcon className="w-3.5 h-3.5" />
              Collections
            </button>
          )}

          {/* Clear filters */}
          {hasFilters && (
            <button onClick={() => { setActiveMealType("all"); setSearch(""); closeAllMenus(); }} className="flex-shrink-0 text-xs text-gray-400 hover:text-gray-600 transition-colors whitespace-nowrap">
              Clear
            </button>
          )}
        </div>

        {/* Backdrop overlay when any dropdown is open (mobile touch dismiss) */}
        {(showSortMenu || showMealMenu) && (
          <div className="fixed inset-0 z-20 sm:hidden" onClick={closeAllMenus} />
        )}
        </div>{/* close max-w-5xl */}
      </div>

      {/* ── Scrollable body ────────────────────────────────────────── */}
      <div
        className="flex-1 px-4 py-4 overflow-y-auto max-w-5xl mx-auto w-full"
        style={{ paddingBottom: "calc(var(--safe-bottom, 0px) + 7rem)" }}
      >

        {/* Loading skeleton */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-3xl overflow-hidden" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
                <div className="h-36 sm:h-44 skeleton-warm" />
                <div className="bg-white px-3 pt-2.5 pb-3 space-y-2">
                  <div className="h-3 skeleton-warm rounded-full w-4/5" />
                  <div className="h-3 skeleton-warm rounded-full w-2/5" />
                </div>
              </div>
            ))}
          </div>
        ) : displayRecipes.length === 0 ? (
          <div className="text-center py-20 animate-fade-slide-up">
            <div className="flex justify-center mb-4" style={{ color: "var(--ink-soft, #4A4742)", opacity: 0.45 }}>
              {hasFilters ? <SearchIcon className="w-12 h-12" /> : <MealIcon className="w-12 h-12" strokeWidth={1.5} />}
            </div>
            <p className="font-bold text-gray-700 text-base mb-1">
              {hasFilters ? "No matches" : "Nothing saved yet"}
            </p>
            <p className="text-gray-400 text-sm mb-5">
              {hasFilters ? "Try different filters" : "Save your first recipe to get started"}
            </p>
            {hasFilters && (
              <button onClick={clearFilters} className="px-4 py-2 rounded-full text-sm font-bold text-orange-500 bg-orange-50 hover:bg-orange-100 transition-colors">
                Clear filters
              </button>
            )}
            {!hasFilters && props.mode === "library" && (
              <Link href="/recipes/new" className="px-4 py-2 rounded-full text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 transition-colors">
                Save a recipe →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {displayRecipes.map((recipe, i) => (
              <BrowserCard
                key={recipe.id}
                recipe={recipe}
                index={i}
                mode={props.mode}
                onAdd={props.mode === "library" && props.onAddToMealPlan ? () => props.onAddToMealPlan!(recipe.id) : undefined}
                onCollection={props.mode === "library" && props.onAddToCollection ? () => props.onAddToCollection!(recipe.id) : undefined}
                isInCollection={props.mode === "library" && props.inCollectionIds ? props.inCollectionIds.has(recipe.id) : false}
                onPick={props.mode === "pick" ? () => handlePick(recipe.id) : undefined}
                isPicking={selectingId === recipe.id}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
