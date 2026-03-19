"use client";

import type { MealPlan } from "@/types";

interface DraftRecipe {
  __draft__: true;
  title: string;
}

function parseDraft(notes: string | null | undefined): DraftRecipe | null {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes);
    if (parsed.__draft__) return parsed as DraftRecipe;
  } catch {}
  return null;
}

export default function CalendarCell({
  plans,
  onAdd,
  onRemove,
  onSaveDraft,
  onTapMeal,
  newlyAddedIds = [],
}: {
  plans: MealPlan[];
  onAdd: () => void;
  onRemove: (planId: string) => void;
  onSaveDraft?: (planId: string) => void;
  onTapMeal?: (plan: MealPlan, isDraft: boolean) => void;
  newlyAddedIds?: string[];
}) {
  if (plans.length === 0) {
    return (
      <button
        onClick={onAdd}
        className="w-full h-full min-h-[40px] flex items-center justify-center text-gray-300 hover:text-orange-400 hover:bg-orange-50 rounded-lg transition-colors group"
      >
        <span className="text-lg group-hover:scale-110 transition-transform">+</span>
      </button>
    );
  }

  return (
    <div className="space-y-1">
      {plans.map((plan) => {
        const isHousehold = !!plan.owner_name;
        const draft = !plan.recipe_id ? parseDraft(plan.notes) : null;
        const isDraft = !!draft;
        const title = plan.recipe?.title ?? draft?.title ?? "Untitled";
        const isNew = newlyAddedIds.includes(plan.id);

        return (
          <div
            key={plan.id}
            className={`group relative rounded-lg px-1.5 py-1 text-[10px] leading-tight transition-all ${
              isDraft
                ? isNew
                  ? "bg-blue-50 border border-dashed border-blue-300 animate-[fadeSlideIn_0.4s_ease-out]"
                  : "bg-gray-50 border border-dashed border-gray-300"
                : isHousehold
                ? "bg-purple-50 border border-purple-100"
                : isNew
                ? "bg-orange-100 border border-orange-300 animate-[fadeSlideIn_0.4s_ease-out]"
                : "bg-orange-50 border border-orange-100"
            }`}
          >
            {/* Title — tappable for draft/saved (not household) */}
            {isDraft ? (
              <button
                onClick={() => onTapMeal?.(plan, true)}
                className="font-medium line-clamp-2 block text-gray-500 w-full text-left hover:text-blue-600 transition-colors"
              >
                {title}
              </button>
            ) : isHousehold ? (
              <span className="font-medium line-clamp-2 block text-gray-600">{title}</span>
            ) : (
              <button
                onClick={() => onTapMeal?.(plan, false)}
                className="font-medium line-clamp-2 block text-gray-700 w-full text-left hover:text-orange-600 transition-colors"
              >
                {title}
              </button>
            )}

            {isHousehold && (
              <p className="text-[8px] text-purple-400 truncate mt-0.5">{plan.owner_name}</p>
            )}
            {isDraft && (
              <p className="text-[8px] text-gray-400 mt-0.5">not saved</p>
            )}

            {/* Save to library — drafts only */}
            {isDraft && onSaveDraft && (
              <button
                onClick={(e) => { e.stopPropagation(); onSaveDraft(plan.id); }}
                title="Save to my recipes"
                className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-blue-500 text-white rounded-full text-[9px] flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-blue-600"
              >
                ★
              </button>
            )}

            {/* Remove — all non-household */}
            {!isHousehold && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(plan.id); }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-400 text-white rounded-full text-[9px] flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-red-500"
              >
                ×
              </button>
            )}
          </div>
        );
      })}
      <button
        onClick={onAdd}
        className="w-full text-gray-300 hover:text-orange-400 text-[10px] py-0.5 rounded hover:bg-orange-50 transition-colors"
      >
        +
      </button>
    </div>
  );
}
