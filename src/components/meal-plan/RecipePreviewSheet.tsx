"use client";

import { useRouter } from "next/navigation";
import type { MealPlan } from "@/types";

const MEAL_PLACEHOLDER: Record<string, string> = {
  breakfast: "🥞",
  lunch: "🥗",
  dinner: "🍽️",
  snack: "🍎",
};

export default function RecipePreviewSheet({
  isOpen,
  plan,
  onClose,
  onReplace,
}: {
  isOpen: boolean;
  plan: MealPlan | null;
  onClose: () => void;
  onReplace: (plan: MealPlan) => void;
}) {
  const router = useRouter();

  if (!isOpen || !plan) return null;

  const recipe = plan.recipe;

  function handleViewRecipe() {
    if (plan?.recipe_id) router.push(`/recipes/${plan.recipe_id}`);
    onClose();
  }

  function handleReplace() {
    onReplace(plan!);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-end"
      onClick={onClose}
    >
      <div
        className="bg-white w-full rounded-t-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Recipe info */}
        <div className="px-5 pb-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
            {recipe?.image_url ? (
              <img
                src={recipe.image_url}
                alt={recipe.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl">
                {MEAL_PLACEHOLDER[plan.meal_type] || "🍴"}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest capitalize mb-0.5">
              {plan.meal_type}
            </p>
            <p className="text-base font-bold text-gray-900 line-clamp-2 leading-snug">
              {recipe?.title || "Untitled"}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 mx-5" />

        {/* Actions */}
        <div className="px-5 pt-4 pb-8 space-y-3">
          {/* Primary: View recipe — filled orange */}
          <button
            onClick={handleViewRecipe}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-4 bg-orange-500 rounded-2xl text-white font-semibold text-sm hover:bg-orange-600 active:scale-[0.98] transition-all"
          >
            <svg
              className="w-4.5 h-4.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            View recipe
          </button>

          {/* Secondary: Replace — only for own meals */}
          {!plan.owner_name && (
            <button
              onClick={handleReplace}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-4 bg-gray-100 rounded-2xl text-gray-700 font-semibold text-sm hover:bg-gray-200 active:scale-[0.98] transition-all"
            >
              <svg
                className="w-4.5 h-4.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Replace meal
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
