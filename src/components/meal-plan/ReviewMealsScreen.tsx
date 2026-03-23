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
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-6 pb-4 border-b border-gray-100">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors mb-4"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">Review your meals</h1>
      </div>

      {/* Recipe groups */}
      <div className="flex-1 px-4 py-4 space-y-5 overflow-y-auto pb-28">
        {orderedMealTypes.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            No meals selected
          </div>
        ) : (
          orderedMealTypes.map((mealType) => (
            <div key={mealType}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                {MEAL_LABELS[mealType]} ({grouped[mealType].length})
              </p>
              <div className="space-y-2">
                {grouped[mealType].map((recipe) => {
                  const totalTime =
                    (recipe.prep_time_minutes || 0) +
                    (recipe.cook_time_minutes || 0);
                  return (
                    <div
                      key={recipe.id}
                      className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm"
                    >
                      {/* Thumbnail */}
                      <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
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
                        <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
                          {recipe.title}
                        </p>
                        {totalTime > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5">
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
          className="w-full py-4 bg-orange-500 text-white rounded-2xl font-semibold text-base shadow-lg hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        >
          Build schedule
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
