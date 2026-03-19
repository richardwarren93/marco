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
  onTapMeal,
  newlyAddedIds = [],
}: {
  plans: MealPlan[];
  onAdd: () => void;
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
            className={`rounded-md px-1.5 py-1 text-[10px] leading-tight transition-all ${
              isDraft
                ? isNew
                  ? "border border-dashed border-blue-200 bg-blue-50/60 animate-[fadeSlideIn_0.4s_ease-out]"
                  : "border border-dashed border-gray-200 bg-transparent"
                : isHousehold
                ? "bg-purple-50"
                : isNew
                ? "bg-orange-100 animate-[fadeSlideIn_0.4s_ease-out]"
                : "bg-orange-50/80"
            }`}
          >
            {isDraft ? (
              <button
                onClick={() => onTapMeal?.(plan, true)}
                className="font-medium line-clamp-2 block text-gray-500 w-full text-left active:opacity-70"
              >
                {title}
              </button>
            ) : isHousehold ? (
              <span className="font-medium line-clamp-2 block text-gray-600">{title}</span>
            ) : (
              <button
                onClick={() => onTapMeal?.(plan, false)}
                className="font-medium line-clamp-2 block text-gray-700 w-full text-left active:opacity-70"
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
