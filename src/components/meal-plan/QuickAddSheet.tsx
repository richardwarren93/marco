"use client";

import { useState, useMemo, useEffect } from "react";
import type { Recipe } from "@/types";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
type MealType = (typeof MEAL_TYPES)[number];

const MEAL_PLACEHOLDER: Record<string, string> = {
  breakfast: "🥞",
  lunch: "🥗",
  dinner: "🍽️",
  snack: "🍎",
};

/** Simple fuzzy score: higher = better match */
function fuzzyScore(recipe: Recipe, query: string): number {
  const q = query.toLowerCase();
  const title = recipe.title.toLowerCase();
  const tags = (recipe.tags || []).join(" ").toLowerCase();
  if (title === q) return 100;
  if (title.startsWith(q)) return 90;
  if (title.includes(q)) return 70;
  if (tags.includes(q)) return 50;
  const qWords = q.split(/\s+/).filter(Boolean);
  const matched = qWords.filter((w) => title.includes(w)).length;
  return matched > 0 ? 20 + matched * 10 : 0;
}

export default function QuickAddSheet({
  isOpen,
  date,
  mealType: initialMealType,
  allRecipes,
  weekPickIds,
  weekPlannedIds,
  onClose,
  onAssign,
  onBrowseMore,
}: {
  isOpen: boolean;
  date: string;
  mealType: string;
  allRecipes: Recipe[];
  weekPickIds: string[];
  weekPlannedIds: string[];
  onClose: () => void;
  onAssign: (recipeId: string, mealType: string) => Promise<void>;
  onBrowseMore: (date: string, mealType: string) => void;
}) {
  const [activeMealType, setActiveMealType] = useState<MealType>("dinner");
  const [search, setSearch] = useState("");
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveMealType(
        MEAL_TYPES.includes(initialMealType as MealType)
          ? (initialMealType as MealType)
          : "dinner"
      );
      setSearch("");
      setAssigning(null);
    }
  }, [isOpen, initialMealType]);

  const picksSet = useMemo(() => new Set(weekPickIds), [weekPickIds]);
  const plannedSet = useMemo(() => new Set(weekPlannedIds), [weekPlannedIds]);

  const pickRecipes = useMemo(
    () =>
      weekPickIds
        .map((id) => allRecipes.find((r) => r.id === id))
        .filter(Boolean) as Recipe[],
    [weekPickIds, allRecipes]
  );

  // Show planned-only recipes (not also in picks) to avoid duplication
  const plannedOnlyRecipes = useMemo(
    () =>
      weekPlannedIds
        .filter((id) => !picksSet.has(id))
        .map((id) => allRecipes.find((r) => r.id === id))
        .filter(Boolean) as Recipe[],
    [weekPlannedIds, picksSet, allRecipes]
  );

  // Ranked search results: picks first, planned second, everything else
  const searchResults = useMemo(() => {
    const q = search.trim();
    if (!q) return [];
    return allRecipes
      .map((r) => {
        const base = fuzzyScore(r, q);
        if (base === 0) return null;
        const boost = picksSet.has(r.id) ? 1000 : plannedSet.has(r.id) ? 500 : 0;
        return { recipe: r, score: base + boost };
      })
      .filter(Boolean)
      .sort((a, b) => b!.score - a!.score)
      .slice(0, 25)
      .map((x) => x!.recipe);
  }, [search, allRecipes, picksSet, plannedSet]);

  async function handleAssign(recipe: Recipe) {
    if (assigning) return;
    setAssigning(recipe.id);
    try {
      await onAssign(recipe.id, activeMealType);
    } finally {
      setAssigning(null);
    }
  }

  if (!isOpen) return null;

  const dayLabel = (() => {
    try {
      return new Date(date + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
    } catch {
      return date;
    }
  })();

  const showEmpty = !search.trim();

  return (
    // Backdrop — click to close
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={onClose}>
      <div
        className="bg-white w-full rounded-t-3xl max-h-[85vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Day label + meal type selector */}
        <div className="px-4 pt-2 pb-3 border-b border-gray-100 flex-shrink-0">
          <p className="text-xs font-medium text-gray-400 mb-2">{dayLabel}</p>
          <div className="flex gap-1.5">
            {MEAL_TYPES.map((mt) => (
              <button
                key={mt}
                onClick={() => setActiveMealType(mt)}
                className={`flex-1 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
                  activeMealType === mt
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {mt}
              </button>
            ))}
          </div>
        </div>

        {/* Search input */}
        <div className="px-4 py-2.5 flex-shrink-0">
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
              placeholder="Search recipes…"
              className="w-full pl-9 pr-8 py-2 bg-gray-100 rounded-xl text-sm outline-none focus:bg-gray-200 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {showEmpty ? (
            <div className="space-y-5">
              {/* This week's picks */}
              {pickRecipes.length > 0 && (
                <section>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                    This week's picks
                  </p>
                  <div className="space-y-0.5">
                    {pickRecipes.map((r) => (
                      <RecipeRow
                        key={r.id}
                        recipe={r}
                        badge="pick"
                        assigning={assigning === r.id}
                        onTap={() => handleAssign(r)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Already planned this week */}
              {plannedOnlyRecipes.length > 0 && (
                <section>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Already planned this week
                  </p>
                  <div className="space-y-0.5">
                    {plannedOnlyRecipes.map((r) => (
                      <RecipeRow
                        key={r.id}
                        recipe={r}
                        badge="planned"
                        assigning={assigning === r.id}
                        onTap={() => handleAssign(r)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Browse all */}
              <button
                onClick={() => onBrowseMore(date, activeMealType)}
                className="w-full py-3 rounded-xl border border-dashed border-gray-300 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10" />
                </svg>
                Browse all recipes
              </button>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-400">No recipes found for &ldquo;{search}&rdquo;</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {searchResults.map((r) => (
                <RecipeRow
                  key={r.id}
                  recipe={r}
                  badge={picksSet.has(r.id) ? "pick" : plannedSet.has(r.id) ? "planned" : undefined}
                  assigning={assigning === r.id}
                  onTap={() => handleAssign(r)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecipeRow({
  recipe,
  badge,
  assigning,
  onTap,
}: {
  recipe: Recipe;
  badge?: "pick" | "planned";
  assigning: boolean;
  onTap: () => void;
}) {
  return (
    <button
      onClick={onTap}
      disabled={assigning}
      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
    >
      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
        {recipe.image_url ? (
          <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-base">{MEAL_PLACEHOLDER[recipe.meal_type] || "🍳"}</span>
        )}
      </div>

      {/* Title + badge */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 line-clamp-1">{recipe.title}</p>
        {badge && (
          <span
            className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 ${
              badge === "pick"
                ? "bg-orange-100 text-orange-600"
                : "bg-blue-50 text-blue-500"
            }`}
          >
            {badge === "pick" ? "This week's pick" : "In plan"}
          </span>
        )}
      </div>

      {/* Add indicator */}
      {assigning ? (
        <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
      ) : (
        <div className="w-7 h-7 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
          <svg className="w-3.5 h-3.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </div>
      )}
    </button>
  );
}
