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
  /** Called when user taps bookmark on a card — parent opens AddToCollectionModal */
  onAddToCollection?: (recipeId: string) => void;
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
  onCollection,
  onPick,
  isPicking,
  index = 0,
}: {
  recipe: Recipe;
  mode: "library" | "pick";
  onAdd?: () => void;
  onCollection?: () => void;
  onPick?: () => void;
  isPicking?: boolean;
  index?: number;
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
      className="relative bg-white rounded-3xl overflow-hidden cursor-pointer active:scale-[0.97] transition-transform duration-150"
      style={{
        boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
        animation: `cardPop 0.45s cubic-bezier(0.34,1.2,0.64,1) ${index * 40}ms both`,
      }}
      onClick={handleCardClick}
    >
      {/* Image */}
      <div className="relative h-36 sm:h-44 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center overflow-hidden">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <span className="text-5xl opacity-70 select-none">{emoji}</span>
        )}

        {/* Bottom gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />

        {/* Time pill */}
        {totalTime > 0 && (
          <div className="absolute bottom-2 left-2.5 flex items-center gap-1 bg-black/25 backdrop-blur-sm px-2 py-0.5 rounded-full pointer-events-none">
            <svg className="w-2.5 h-2.5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-white text-[10px] font-semibold">{totalTime} min</span>
          </div>
        )}

        {mode === "pick" && isPicking && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {mode === "library" && (
          <div className="absolute top-2 right-2 flex gap-1.5">
            {onCollection && (
              <button
                onClick={(e) => { e.stopPropagation(); onCollection(); }}
                className="w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                aria-label="Add to collection"
              >
                <svg className="w-3.5 h-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            )}
            {onAdd && (
              <button
                onClick={(e) => { e.stopPropagation(); onAdd(); }}
                className="w-7 h-7 rounded-full bg-[#e8ddd3] flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                aria-label="Add to meal plan"
              >
                <svg className="w-3.5 h-3.5 text-[#7a6355]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-3 pt-2.5 pb-3">
        <p className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug tracking-tight">
          {recipe.title}
        </p>
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
    <div className="flex flex-col" style={{ background: "#faf9f7" }}>
      {/* ── Sticky header ─────────────────────────────────────────── */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-orange-50">
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
              className="w-full pl-9 pr-9 py-2.5 rounded-2xl text-sm outline-none transition-all"
              style={{ background: "#f0ede8", border: "1.5px solid transparent" }}
              onFocus={e => (e.target.style.borderColor = "#f97316")}
              onBlur={e => (e.target.style.borderColor = "transparent")}
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
          {(["newest", "prep_time"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
              style={sort === s
                ? { background: "#1a1410", color: "#fff" }
                : { background: "#ede9e3", color: "#6b6560" }}
            >
              {s === "newest" ? "Newest" : "Prep time"}
            </button>
          ))}

          {/* Meal type dropdown */}
          <div className="relative" ref={mealMenuRef}>
            <button
              onClick={() => setShowMealMenu((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
              style={activeMealType !== "all"
                ? { background: "#f97316", color: "#fff" }
                : { background: "#ede9e3", color: "#6b6560" }}
            >
              {activeMealType !== "all" ? MEAL_TYPE_LABELS[activeMealType] : "Meal type"}
              <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showMealMenu && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-xl border border-orange-50 z-20 py-1.5 min-w-[150px] overflow-hidden"
                style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
                {([["all", "All"], ...MEAL_TYPES.map((mt) => [mt, MEAL_TYPE_LABELS[mt]])] as [string, string][]).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => { setActiveMealType(value as MealType | "all"); setShowMealMenu(false); }}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-orange-50"
                    style={{ color: activeMealType === value ? "#f97316" : "#374151" }}
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
            <button onClick={() => setActiveMealType("all")} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Clear
            </button>
          )}
        </div>
        </div>{/* close max-w-5xl */}
      </div>

      {/* ── Scrollable body ────────────────────────────────────────── */}
      <div className="flex-1 px-4 py-4 pb-28 overflow-y-auto max-w-5xl mx-auto w-full">

        {/* Collections row — library only */}
        {props.mode === "library" && props.collections.length > 0 && (
          <div className="mb-5 animate-fade-slide-up">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5 px-0.5">
              Collections
            </p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-0.5 px-0.5 pb-0.5">
              {props.collections.map((col, i) => (
                <Link
                  key={col.id}
                  href={`/collections/${col.id}`}
                  className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-2xl border border-orange-100 bg-white hover:border-orange-300 hover:shadow-sm transition-all whitespace-nowrap"
                  style={{ animation: `fadeSlideUp 0.35s ease ${i * 50}ms both` }}
                >
                  <span className="text-sm font-bold text-gray-800">{col.name}</span>
                  {col.recipe_count !== undefined && col.recipe_count > 0 && (
                    <span className="text-[10px] font-bold text-orange-400 bg-orange-50 px-1.5 py-0.5 rounded-full">
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
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 animate-fade-slide-up">
            <p className="text-4xl mb-4">{hasFilters ? "🔍" : "🍳"}</p>
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
            {filtered.map((recipe, i) => (
              <BrowserCard
                key={recipe.id}
                recipe={recipe}
                index={i}
                mode={props.mode}
                onAdd={props.mode === "library" && props.onAddToMealPlan ? () => props.onAddToMealPlan!(recipe.id) : undefined}
                onCollection={props.mode === "library" && props.onAddToCollection ? () => props.onAddToCollection!(recipe.id) : undefined}
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
