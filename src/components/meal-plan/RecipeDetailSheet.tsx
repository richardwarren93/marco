"use client";

import type { Recipe, Ingredient } from "@/types";

const MEAL_ICONS: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍎",
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
          <div className="h-56 sm:h-72 bg-gray-100 relative">
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
          </div>
        ) : (
          <div className="h-40 bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
            <span className="text-5xl">{MEAL_ICONS[recipe.meal_type] || "🍽️"}</span>
          </div>
        )}

        {/* Back button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors z-10"
        >
          <svg className="w-4.5 h-4.5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 -mt-4">
        {/* Title card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            {recipe.title}
          </h1>

          {recipe.description && (
            <p className="text-sm text-gray-500 leading-relaxed">{recipe.description}</p>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-3 flex-wrap">
            {recipe.meal_type && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                recipe.meal_type === "breakfast" ? "bg-amber-50 text-amber-700" :
                recipe.meal_type === "lunch" ? "bg-green-50 text-green-700" :
                recipe.meal_type === "dinner" ? "bg-violet-50 text-violet-700" :
                "bg-orange-50 text-orange-700"
              }`}>
                {MEAL_ICONS[recipe.meal_type]} {recipe.meal_type}
              </span>
            )}
            {totalTime > 0 && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {recipe.prep_time_minutes ? `${recipe.prep_time_minutes}m prep` : ""}
                {recipe.prep_time_minutes && recipe.cook_time_minutes ? " · " : ""}
                {recipe.cook_time_minutes ? `${recipe.cook_time_minutes}m cook` : ""}
              </span>
            )}
            {recipe.servings && (
              <span className="text-xs text-gray-500">
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
                  className="px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[11px] font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Ingredients */}
        {ingredients.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mt-3">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Ingredients</h2>
            <ul className="space-y-2.5">
              {ingredients.map((ing, i) => (
                <li key={i} className="flex items-baseline gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0 mt-1.5" />
                  <span className="text-sm text-gray-800">
                    {ing.amount && (
                      <span className="font-semibold">{ing.amount} </span>
                    )}
                    {ing.unit && (
                      <span className="text-gray-500">{ing.unit} </span>
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mt-3">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Steps</h2>
            <ol className="space-y-4">
              {steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-700 leading-relaxed flex-1">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
