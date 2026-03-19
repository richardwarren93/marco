"use client";

import type { SuggestedRecipe } from "@/lib/claude";

const MEAL_ICONS: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍎",
};

interface SuggestionRowProps {
  suggestions: SuggestedRecipe[];
  onTap: (suggestion: SuggestedRecipe) => void;
  onDismiss: () => void;
}

export default function SuggestionRow({ suggestions, onTap, onDismiss }: SuggestionRowProps) {
  if (suggestions.length === 0) return null;

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between px-4 pb-2">
        <p className="text-xs font-semibold text-gray-500 tracking-wide">
          Tap a recipe to place it into your week
        </p>
        <button
          onClick={onDismiss}
          className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors px-3 py-2"
        >
          Clear
        </button>
      </div>

      {/* Horizontal card strip — edge-to-edge scroll */}
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide px-4 pb-3">
        {suggestions.map((suggestion, i) => (
          <button
            key={i}
            onClick={() => onTap(suggestion)}
            className="flex-shrink-0 w-40 bg-gray-50 border border-gray-200 rounded-xl p-3 text-left hover:border-orange-300 hover:bg-orange-50/50 hover:shadow-sm transition-all active:scale-[0.97]"
          >
            {/* Meal type badge */}
            <div className="flex items-center gap-1 mb-1.5">
              <span className="text-sm leading-none">
                {MEAL_ICONS[suggestion.suggestedMealType] ?? "🍽️"}
              </span>
              <span className="text-[10px] text-orange-600 font-semibold capitalize">
                {suggestion.suggestedMealType}
              </span>
            </div>

            {/* Title */}
            <p className="text-xs font-bold text-gray-800 line-clamp-2 leading-snug mb-1">
              {suggestion.title}
            </p>

            {/* Time + tags */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(suggestion.prep_time_minutes || suggestion.cook_time_minutes) && (
                <span className="text-[10px] text-gray-400">
                  {(suggestion.prep_time_minutes ?? 0) + (suggestion.cook_time_minutes ?? 0)}m
                </span>
              )}
              {suggestion.tags?.slice(0, 1).map((tag) => (
                <span key={tag} className="text-[10px] text-gray-300">
                  #{tag}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
