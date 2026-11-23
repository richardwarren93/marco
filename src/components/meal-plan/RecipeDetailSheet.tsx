"use client";

import type { Recipe, Ingredient } from "@/types";
import { MealTypeIcon } from "@/components/icons/MealIcons";
import { BUTTER, CREAM_WARM, DISPLAY, INK, INK_MUTED, INK_SOFT, LIME, MUSTARD, PAPER, PINK, TOMATO, TOMATO_DARK } from "@/lib/theme";

const MEAL_STICKER: Record<string, string> = {
  breakfast: BUTTER,
  lunch: LIME,
  dinner: MUSTARD,
  snack: PINK,
};

export default function RecipeDetailSheet({
  isOpen,
  recipe,
  onClose,
}: {
  isOpen: boolean;
  recipe: Recipe | null;
  onClose: () => void;
}) {
  if (!isOpen || !recipe) return null;

  const ingredients = ((recipe.ingredients as Ingredient[]) || []).map((ing) => ({
    ...ing,
    amount: ing.amount != null ? String(ing.amount) : ing.amount,
    unit: ing.unit != null ? String(ing.unit) : ing.unit,
  }));
  const steps = (recipe.steps as string[]) || [];
  const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: "#f6f6f4" }}>
      {/* Hero image */}
      <div className="relative flex-shrink-0">
        {recipe.image_url ? (
          <div className="h-56 sm:h-72 relative" style={{ background: CREAM_WARM }}>
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
          </div>
        ) : (
          <div className="h-40 bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
            <MealTypeIcon type={recipe.meal_type} className="w-4 h-4 opacity-60" strokeWidth={1.8} />
          </div>
        )}

        {/* Back button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform z-10" style={{ background: PAPER, border: `2px solid ${INK}`, boxShadow: `2px 2px 0 ${INK}` }}
        >
          <svg className="w-4.5 h-4.5" style={{ color: INK }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 -mt-4">
        {/* Title card */}
        <div className="p-4 space-y-3" style={{ background: PAPER, borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: `4px 5px 0 ${INK}` }}>
          <h1 style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 21, lineHeight: 1.15 }}>
            {recipe.title}
          </h1>

          {recipe.description && (
            <p className="text-sm leading-relaxed" style={{ color: INK_SOFT }}>{recipe.description}</p>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-3 flex-wrap">
            {recipe.meal_type && (
              <span
                className="text-xs px-2.5 py-1 capitalize"
                style={{
                  background: MEAL_STICKER[recipe.meal_type] ?? BUTTER,
                  color: INK,
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                  border: `2px solid ${INK}`,
                  borderRadius: 99,
                }}
              >
                {recipe.meal_type}
              </span>
            )}
            {totalTime > 0 && (
              <span className="text-xs flex items-center gap-1" style={{ color: INK_SOFT }}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {recipe.prep_time_minutes ? `${recipe.prep_time_minutes}m prep` : ""}
                {recipe.prep_time_minutes && recipe.cook_time_minutes ? " · " : ""}
                {recipe.cook_time_minutes ? `${recipe.cook_time_minutes}m cook` : ""}
              </span>
            )}
            {recipe.servings && (
              <span className="text-xs" style={{ color: INK_SOFT }}>
                👤 {recipe.servings} servings
              </span>
            )}
          </div>

          {/* Tags */}
          {(recipe.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(recipe.tags || []).map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 text-[11px]" style={{ background: PAPER, color: INK, fontWeight: 600, border: `1.5px solid ${INK}`, borderRadius: 99 }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Ingredients */}
        {ingredients.length > 0 && (
          <div className="p-4 mt-3" style={{ background: PAPER, borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: `4px 5px 0 ${INK}` }}>
            <h2 className="mb-3" style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 15 }}>Ingredients</h2>
            <ul className="space-y-2.5">
              {ingredients.map((ing, i) => (
                <li key={i} className="flex items-baseline gap-3">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: TOMATO }} />
                  <span className="text-sm" style={{ color: INK }}>
                    {ing.amount && (
                      <span className="font-semibold">{ing.amount} </span>
                    )}
                    {ing.unit && (
                      <span style={{ color: INK_SOFT }}>{ing.unit} </span>
                    )}
                    {ing.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Steps */}
        {steps.length > 0 && (
          <div className="p-4 mt-3" style={{ background: PAPER, borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: `4px 5px 0 ${INK}` }}>
            <h2 className="mb-3" style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 15 }}>Steps</h2>
            <ol className="space-y-4">
              {steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5" style={{ background: INK, color: PAPER, fontFamily: DISPLAY, fontWeight: 700 }}>
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed flex-1" style={{ color: INK_SOFT }}>{step}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
