"use client";

import Link from "next/link";
import type { Recipe } from "@/types";
import { MealTypeIcon } from "@/components/icons/MealIcons";
import { CREAM, CREAM_WARM, INK, INK_MUTED, PAPER, TOMATO } from "@/lib/theme";

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"] as const;

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export default function ReviewMealsScreen({
  selectedRecipes,
  onRemove,
  onBack,
  onBuild,
  onAddMore,
}: {
  selectedRecipes: Recipe[];
  onRemove: (id: string) => void;
  onBack: () => void;
  onBuild: () => void;
  onAddMore?: () => void;
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
    <div className="flex flex-col min-h-screen" style={{ background: CREAM }}>
      {/* Header */}
      <div className="px-4 pt-5 pb-4 border-b" style={{ background: CREAM, borderColor: "#ede8e0" }}>
        <div className="max-w-2xl mx-auto">
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors mb-4 active:scale-90"
            style={{ background: "white", color: INK_MUTED, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-black tracking-tight" style={{ color: INK }}>Review your meals</h1>
            {onAddMore && (
              <button
                onClick={onAddMore}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all active:scale-95"
                style={{ background: "#fff4ed", color: TOMATO }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add more
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Recipe groups */}
      <div className="flex-1 px-4 py-4 space-y-5 overflow-y-auto max-w-2xl mx-auto w-full" style={{ paddingBottom: "160px" }}>
        {orderedMealTypes.length === 0 ? (
          <div className="text-center py-16 text-sm" style={{ color: INK_MUTED }}>
            No meals selected
          </div>
        ) : (
          orderedMealTypes.map((mealType) => (
            <div key={mealType}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: INK_MUTED }}>
                {MEAL_LABELS[mealType]} ({grouped[mealType].length})
              </p>
              <div className="space-y-2">
                {grouped[mealType].map((recipe, i) => {
                  const totalTime =
                    (recipe.prep_time_minutes || 0) +
                    (recipe.cook_time_minutes || 0);
                  return (
                    <div
                      key={recipe.id}
                      className="p-3 flex items-center gap-3"
                      style={{ background: PAPER, borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: `4px 5px 0 ${INK}`, animation: `fadeSlideUp 0.35s ease ${i * 40}ms both` }}
                    >
                      {/* Thumbnail */}
                      <div className="w-14 h-14 flex-shrink-0 overflow-hidden flex items-center justify-center" style={{ background: CREAM_WARM, borderRadius: 14, border: `2px solid ${INK}` }}>
                        {recipe.image_url ? (
                          <img
                            src={recipe.image_url}
                            alt={recipe.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <MealTypeIcon type={recipe.meal_type} className="opacity-60" size={28} strokeWidth={1.6} />
                        )}
                      </div>

                      {/* Info */}
                      <Link href={`/recipes/${recipe.id}`} className="flex-1 min-w-0">
                        <p className="text-sm font-bold line-clamp-2 leading-snug" style={{ color: INK }}>
                          {recipe.title}
                        </p>
                        {totalTime > 0 && (
                          <p className="text-xs mt-0.5" style={{ color: INK_MUTED }}>
                            {totalTime} min
                          </p>
                        )}
                      </Link>

                      {/* Remove */}
                      <button
                        onClick={() => onRemove(recipe.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-400 hover:bg-red-100 transition-colors flex-shrink-0"
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
      <div className="fixed left-0 right-0 px-4 z-20 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:bottom-6">
        <div className="max-w-2xl mx-auto">
        <button
          onClick={onBuild}
          disabled={selectedRecipes.length === 0}
          className="w-full py-4 text-white rounded-2xl font-bold text-base active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: INK, boxShadow: "0 4px 20px rgba(26,20,16,0.2)" }}
        >
          Build schedule
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        </div>
      </div>
    </div>
  );
}
