"use client";

import Link from "next/link";
import type { MealPlan } from "@/types";

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"] as const;
const MEAL_EMOJI: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍎",
};

// Sort plans by meal type order
function sortByMealType(plans: MealPlan[]): MealPlan[] {
  return [...plans].sort(
    (a, b) =>
      MEAL_ORDER.indexOf(a.meal_type as typeof MEAL_ORDER[number]) -
      MEAL_ORDER.indexOf(b.meal_type as typeof MEAL_ORDER[number])
  );
}

export default function DayColumn({
  plans,
  isToday,
  onAdd,
  onRemove,
}: {
  plans: MealPlan[];
  isToday: boolean;
  onAdd: (mealType: string) => void;
  onRemove: (planId: string) => void;
}) {
  const sorted = sortByMealType(plans);

  return (
    <div
      className={`flex flex-col gap-1 p-1 rounded-xl min-h-[60px] border transition-colors ${
        isToday
          ? "border-orange-200 bg-orange-50/40"
          : "border-gray-100 bg-white"
      }`}
    >
      {sorted.map((plan) => {
        const isHousehold = !!plan.owner_name;
        return (
          <div
            key={plan.id}
            className={`group relative rounded-lg px-1 py-1 text-[9px] leading-tight ${
              isHousehold
                ? "bg-purple-50 border border-purple-100"
                : "bg-orange-50 border border-orange-100"
            }`}
          >
            {/* Meal type emoji */}
            <span className="text-[9px] mr-0.5">{MEAL_EMOJI[plan.meal_type] || "🍴"}</span>
            <Link
              href={`/recipes/${plan.recipe_id}`}
              className={`font-medium line-clamp-2 ${
                isHousehold
                  ? "text-gray-600 hover:text-purple-600"
                  : "text-gray-700 hover:text-orange-600"
              }`}
            >
              {plan.recipe?.title || "Untitled"}
            </Link>
            {isHousehold && (
              <p className="text-[8px] text-purple-400 truncate mt-0.5">{plan.owner_name}</p>
            )}
            {!isHousehold && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(plan.id);
                }}
                className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-400 text-white rounded-full text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 touch-manipulation"
              >
                ×
              </button>
            )}
          </div>
        );
      })}

      {/* Add button */}
      <button
        onClick={() => onAdd("dinner")}
        className="w-full text-gray-300 hover:text-orange-400 text-[11px] py-1 rounded-lg hover:bg-orange-50 transition-colors flex items-center justify-center touch-manipulation"
        aria-label="Add meal"
      >
        <span className="leading-none">+</span>
      </button>
    </div>
  );
}
