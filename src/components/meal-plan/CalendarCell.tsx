"use client";

import Link from "next/link";
import type { MealPlan } from "@/types";

export default function CalendarCell({
  plans,
  onAdd,
  onRemove,
}: {
  plans: MealPlan[];
  onAdd: () => void;
  onRemove: (planId: string) => void;
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

        return (
          <div
            key={plan.id}
            className={`group relative rounded-lg px-1.5 py-1 text-[10px] leading-tight ${
              isHousehold
                ? "bg-purple-50 border border-purple-100"
                : "bg-orange-50 border border-orange-100"
            }`}
          >
            <Link
              href={`/recipes/${plan.recipe_id}`}
              className={`font-medium line-clamp-2 block ${
                isHousehold
                  ? "text-gray-600 hover:text-purple-600"
                  : "text-gray-700 hover:text-orange-600"
              }`}
            >
              {plan.recipe?.title || "Untitled"}
            </Link>
            {isHousehold && (
              <p className="text-[8px] text-purple-400 truncate mt-0.5">
                {plan.owner_name}
              </p>
            )}
            {!isHousehold && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(plan.id);
                }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 text-white rounded-full text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
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
