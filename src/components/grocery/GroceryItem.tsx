"use client";

import type { GroceryItem as GroceryItemType } from "@/types";

export default function GroceryItem({
  item,
  onToggle,
  onDelete,
}: {
  item: GroceryItemType;
  onToggle: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors group ${
        item.checked ? "bg-gray-50" : "bg-white hover:bg-orange-50/30"
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(item.id, !item.checked)}
        className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          item.checked
            ? "bg-orange-500 border-orange-500"
            : "border-gray-300 hover:border-orange-400"
        }`}
      >
        {item.checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Item details */}
      <div className={`flex-1 min-w-0 ${item.checked ? "opacity-50" : ""}`}>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-sm font-medium capitalize ${item.checked ? "line-through text-gray-400" : "text-gray-800"}`}>
            {item.name}
          </span>
          {item.amount && (
            <span className="text-xs text-gray-400">
              {item.amount}{item.unit ? ` ${item.unit}` : ""}
            </span>
          )}
        </div>
        {item.recipe_sources.length > 0 && !item.is_custom && (
          <p className="text-[10px] text-gray-400 truncate">
            for: {item.recipe_sources.join(", ")}
          </p>
        )}
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {item.in_pantry && (
          <span className="text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full font-medium">
            in pantry
          </span>
        )}
        {item.is_custom && (
          <span className="text-[9px] px-1.5 py-0.5 bg-blue-50 text-blue-500 rounded-full font-medium">
            added
          </span>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(item.id)}
        className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
