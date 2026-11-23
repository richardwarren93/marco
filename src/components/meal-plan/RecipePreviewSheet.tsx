"use client";

import { useRouter } from "next/navigation";
import MotionSheet, { useLastDefined } from "@/components/ui/MotionSheet";
import type { MealPlan } from "@/types";
import { MealTypeIcon } from "@/components/icons/MealIcons";
import IMadeThisButton from "@/components/gamification/IMadeThisButton";
import { BUTTER, CREAM_WARM, DISPLAY, INK, INK_MUTED, INK_SOFT, LIME, PAPER, TOMATO, TOMATO_DARK } from "@/lib/theme";

export default function RecipePreviewSheet({
  isOpen,
  plan: planProp,
  onClose,
  onReplace,
  onEdit,
  onDelete,
}: {
  isOpen: boolean;
  plan: MealPlan | null;
  onClose: () => void;
  onReplace: (plan: MealPlan) => void;
  onEdit?: (plan: MealPlan) => void;
  onDelete?: () => void;
}) {
  const router = useRouter();
  const plan = useLastDefined(planProp); // stays put while the sheet drops away
  if (!plan) return null;

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
    <MotionSheet open={isOpen && !!planProp} onClose={onClose} label={recipe?.title || "Meal"} z={60} scrim="rgba(0,0,0,0.5)" showHandle={false} className="w-full sm:max-w-lg" style={{ background: PAPER, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTop: `2.5px solid ${INK}`, borderLeft: `2.5px solid ${INK}`, borderRight: `2.5px solid ${INK}` }}>
        {/* Handle + delete */}
        <div className="relative flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full" style={{ background: INK, opacity: 0.25 }} />
          {onDelete && (
            <button
              onClick={onDelete}
              className="absolute right-3 top-1.5 w-8 h-8 rounded-full flex items-center justify-center transition-colors active:bg-black/5"
              aria-label="Delete meal"
            >
              <svg className="w-4.5 h-4.5" style={{ color: TOMATO }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>

        {/* Recipe info */}
        <div className="px-5 pb-4 flex items-center gap-4">
          <div className="w-14 h-14 overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: CREAM_WARM, borderRadius: 14, border: `2px solid ${INK}` }}>
            {recipe?.image_url ? (
              <img
                src={recipe.image_url}
                alt={recipe.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <MealTypeIcon type={plan.meal_type} className="w-4 h-4 opacity-60" strokeWidth={1.8} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] capitalize mb-0.5" style={{ color: INK_MUTED, fontWeight: 700 }}>
              {plan.meal_type}
            </p>
            <p className="line-clamp-2 leading-snug" style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 16 }}>
              {recipe?.title || "Untitled"}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5" style={{ borderTop: `2px solid ${INK}` }} />

        {/* Actions */}
        <div className="px-5 pt-4 pb-8 space-y-3">
          {/* Primary: View recipe — filled orange */}
          <button
            onClick={handleViewRecipe}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-4 text-sm active:scale-[0.98] transition-transform" style={{ background: TOMATO, color: PAPER, fontFamily: DISPLAY, fontWeight: 700, border: `2.5px solid ${INK}`, borderRadius: 14, boxShadow: `3px 3px 0 ${INK}` }}
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

          {/* Cooked it — confirm this planned meal was cooked (own meals with a recipe).
              IMadeThisButton surfaces the 🍅 earn toast itself. */}
          {!plan.owner_name && plan.recipe_id && (
            <IMadeThisButton recipeId={plan.recipe_id} mealPlanId={plan.id} label="Cooked it" />
          )}

          {/* Edit — only for own meals */}
          {!plan.owner_name && onEdit && (
            <button
              onClick={() => { onEdit(plan!); onClose(); }}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-4 text-sm active:scale-[0.98] transition-transform" style={{ background: PAPER, color: INK, fontFamily: DISPLAY, fontWeight: 700, border: `2.5px solid ${INK}`, borderRadius: 14, boxShadow: `3px 3px 0 ${INK}` }}
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit meal
            </button>
          )}
        </div>
    </MotionSheet>
  );
}
