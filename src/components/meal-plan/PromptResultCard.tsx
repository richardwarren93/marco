"use client";

import { useState } from "react";
import type { PromptRecipeResult } from "@/lib/claude";

interface PromptResultCardProps {
  result: PromptRecipeResult;
  onSave: (result: PromptRecipeResult) => void;
  onAddToPlan: (recipeId: string, mealType: string) => void;
  saving: boolean;
  saved: boolean;
}

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

export default function PromptResultCard({
  result,
  onSave,
  onAddToPlan,
  saving,
  saved,
}: PromptResultCardProps) {
  const [showMealPicker, setShowMealPicker] = useState(false);
  const { recipe } = result;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-gray-900 leading-tight">
          {recipe.title}
        </h3>
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
            result.source === "saved"
              ? "bg-blue-50 text-blue-600"
              : "bg-purple-50 text-purple-600"
          }`}
        >
          {result.sourceHint}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-500 line-clamp-2 mb-3">
        {recipe.description}
      </p>

      {/* Meta row */}
      <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
        {recipe.prep_time_minutes && <span>Prep {recipe.prep_time_minutes}m</span>}
        {recipe.cook_time_minutes && <span>Cook {recipe.cook_time_minutes}m</span>}
        {recipe.servings && <span>Serves {recipe.servings}</span>}
      </div>

      {/* Tags */}
      {recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {recipe.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="bg-orange-50 text-orange-600 text-[10px] px-2 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Pantry match (only for my_kitchen context) */}
      {(recipe.matchingPantryItems.length > 0 ||
        recipe.missingIngredients.length > 0) && (
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-[10px] font-semibold text-green-700 uppercase tracking-wide mb-1">
              You have
            </p>
            <div className="flex flex-wrap gap-1">
              {recipe.matchingPantryItems.slice(0, 5).map((item) => (
                <span
                  key={item}
                  className="bg-green-50 text-green-700 text-[10px] px-1.5 py-0.5 rounded-full"
                >
                  {item}
                </span>
              ))}
              {recipe.matchingPantryItems.length > 5 && (
                <span className="text-green-600 text-[10px]">
                  +{recipe.matchingPantryItems.length - 5}
                </span>
              )}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide mb-1">
              Need
            </p>
            <div className="flex flex-wrap gap-1">
              {recipe.missingIngredients.slice(0, 5).map((item) => (
                <span
                  key={item}
                  className="bg-amber-50 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-full"
                >
                  {item}
                </span>
              ))}
              {recipe.missingIngredients.length === 0 && (
                <span className="text-green-600 text-[10px]">All set!</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reasoning */}
      <p className="text-xs text-gray-400 italic mb-3">{result.reasoning}</p>

      {/* Expandable full recipe */}
      <details className="mb-3">
        <summary className="text-sm text-orange-600 cursor-pointer hover:text-orange-700 font-medium">
          View full recipe
        </summary>
        <div className="mt-3 space-y-3">
          <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-1">
              Ingredients
            </h4>
            <ul className="text-xs text-gray-600 space-y-0.5">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex items-baseline gap-1">
                  <span className="w-1 h-1 rounded-full bg-orange-400 flex-shrink-0 mt-1.5" />
                  <span>
                    {ing.amount && <strong>{ing.amount} </strong>}
                    {ing.unit && <span>{ing.unit} </span>}
                    {ing.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-1">Steps</h4>
            <ol className="text-xs text-gray-600 space-y-1">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-orange-600 font-bold flex-shrink-0">
                    {i + 1}.
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </details>

      {/* Actions */}
      <div className="mt-auto flex gap-2">
        {result.source === "generated" ? (
          <button
            onClick={() => onSave(result)}
            disabled={saving || saved}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
              saved
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-orange-600 text-white hover:bg-orange-700"
            } disabled:opacity-50`}
          >
            {saving ? "Saving..." : saved ? "Saved ✓" : "Save Recipe"}
          </button>
        ) : (
          <div className="flex-1 relative">
            <button
              onClick={() => setShowMealPicker(!showMealPicker)}
              className="w-full py-2 px-3 rounded-xl text-sm font-medium bg-orange-600 text-white hover:bg-orange-700 transition-colors"
            >
              Add to Plan
            </button>
            {showMealPicker && result.recipeId && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-10">
                {MEAL_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      onAddToPlan(result.recipeId!, type);
                      setShowMealPicker(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm capitalize text-gray-700 hover:bg-orange-50 hover:text-orange-700 rounded-lg transition-colors"
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
