"use client";

import type { GroceryItem as GroceryItemType } from "@/types";

interface Props {
  item: GroceryItemType;
  onToggle: (id: string, checked: boolean) => void;
  onEdit: (item: GroceryItemType) => void;
  ownerName?: string;
}

export default function GroceryItem({ item, onToggle, onEdit, ownerName }: Props) {
  // Prefer user overrides for display
  const displayName = item.name_override ?? item.name;
  const displayAmount = item.amount_override ?? item.amount;
  const displayUnit = item.unit_override ?? item.unit;

  return (
    <div
      className={`flex items-center gap-3 px-1 py-2 rounded-xl transition-colors ${
        item.checked ? "opacity-60" : ""
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
        aria-label={item.checked ? "Uncheck item" : "Check item"}
      >
        {item.checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Item details — tap to edit */}
      <button
        type="button"
        onClick={() => onEdit(item)}
        className="flex-1 min-w-0 text-left"
      >
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className={`text-sm font-medium capitalize ${item.checked ? "line-through text-gray-400" : "text-gray-800"}`}>
            {displayName}
          </span>
          {displayAmount && (
            <span className="text-xs text-gray-400">
              {displayAmount}{displayUnit ? ` ${displayUnit}` : ""}
            </span>
          )}
        </div>
        {item.recipe_sources.length > 0 && !item.is_custom && (
          <p className="text-[10px] text-gray-400 truncate mt-0.5">
            for: {item.recipe_sources.join(", ")}
          </p>
        )}
      </button>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {ownerName && (
          <span className="text-[9px] px-1.5 py-0.5 bg-purple-50 text-purple-500 rounded-full font-medium">
            {ownerName}
          </span>
        )}
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
    </div>
  );
}
