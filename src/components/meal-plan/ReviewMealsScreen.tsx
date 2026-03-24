"use client";

import Link from "next/link";
import type { Recipe } from "@/types";

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"] as const;

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const MEAL_PLACEHOLDER: Record<string, string> = {
  breakfast: "🥞",
  lunch: "🥗",
  dinner: "🍽️",
  snack: "🍎",
};

export default function ReviewMealsScreen({
  selectedRecipes,
  onRemove,
  onBack,
  onBuild,
}: {
  selectedRecipes: Recipe[];
  onRemove: (id: string) => void;
  onBack: () => void;
  onBuild: () => void;
}) {
  // Group by meal type
  const grouped: Record<string, Recipe[]> = {};
  for (const recipe of selectedRecipes) {
    const mt = recipe.meal_type || "dinner";
    if (!grouped[mt]) grouped[mt] = [];
    grouped[mt].push(recipe);
  }
  const orderedMealTypes = MEAL_ORDER.filter((mt) => grouped[mt]?.length > 0);

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#faf9f7" }}>
      {/* Header */}
      <div className="px-4 pt-5 pb-4" style={{ background: "#faf9f7" }}>
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-2xl transition-colors mb-4"
          style={{ background: "white", color: "#a09890", boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-black tracking-tight" style={{ color: "#1a1410" }}>Review your meals</h1>
        {selectedRecipes.length > 0 && (
          <p className="text-xs font-medium mt-0.5" style={{ color: "#a09890" }}>{selectedRecipes.length} recipe{selectedRecipes.length !== 1 ? "s" : ""} selected</p>
        )}
      </div>

      {/* Recipe groups */}
      <div className="flex-1 px-4 py-2 space-y-5 overflow-y-auto pb-28">
        {orderedMealTypes.length === 0 ? (
          <div className="text-center py-16 text-sm" style={{ color: "#a09890" }}>
            No meals selected
          </div>
        ) : (
          orderedMealTypes.map((mealType, gi) => (
            <div key={mealType} style={{ animation: `fadeSlideUp 0.4s ease ${gi * 60}ms both` }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#a09890" }}>
                {MEAL_LABELS[mealType]} ({grouped[mealType].length})
              </p>
              <div className="space-y-2">
                {grouped[mealType].map((recipe, ri) => {
                  const totalTime =
                    (recipe.prep_time_minutes || 0) +
                    (recipe.cook_time_minutes || 0);
                  return (
                    <div
                      key={recipe.id}
                      className="bg-white rounded-3xl p-3 flex items-center gap-3"
                      style={{ animation: `cardPop 0.35s ease ${(gi * 3 + ri) * 40}ms both`, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
                    >
                      {/* Thumbnail */}
                      <div className="w-14 h-14 rounded-2xl flex-shrink-0 overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
                        {recipe.image_url ? (
                          <img
                            src={recipe.image_url}
                            alt={recipe.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl">
                            {MEAL_PLACEHOLDER[recipe.meal_type] || "🍳"}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <Link
                        href={`/recipes/${recipe.id}`}
                        className="flex-1 min-w-0"
                      >
                        <p className="text-sm font-bold line-clamp-2 leading-snug" style={{ color: "#1a1410" }}>
                          {recipe.title}
                        </p>
                        {totalTime > 0 && (
                          <p className="text-xs mt-0.5" style={{ color: "#a09890" }}>
                            {totalTime} min
                          </p>
                        )}
                      </Link>

                      {/* Remove */}
                      <button
                        onClick={() => onRemove(recipe.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors flex-shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Build CTA */}
      <div className="fixed bottom-20 left-0 right-0 px-4 z-20">
        <button
          onClick={onBuild}
          disabled={selectedRecipes.length === 0}
          className="w-full py-4 text-white rounded-3xl font-black text-base shadow-lg active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: "#1a1410" }}
        >
          Build schedule
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
