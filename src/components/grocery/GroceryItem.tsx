"use client";

import { useState, useRef, useEffect } from "react";
import type { GroceryItem as GroceryItemType } from "@/types";
import SwipeToDelete from "@/components/ui/SwipeToDelete";

interface Props {
  item: GroceryItemType;
  onToggle: (id: string, checked: boolean) => void;
  onEdit: (item: GroceryItemType) => void;
  onDelete: (id: string) => void;
  ownerName?: string;
}

export default function GroceryItem({ item, onToggle, onEdit, onDelete, ownerName }: Props) {
  const displayName = item.name_override ?? item.name;
  const displayAmount = item.amount_override ?? item.amount;
  const displayUnit = item.unit_override ?? item.unit;

  // Bounce the checkbox briefly the moment it flips on, per the brand
  // punctum-pulse pattern. No more green/orange tint backgrounds — checked
  // rows keep the cream surface and pick up the tomato strike instead.
  const [justChecked, setJustChecked] = useState(false);
  const prevChecked = useRef(item.checked);

  useEffect(() => {
    if (item.checked !== prevChecked.current) {
      if (item.checked) {
        setJustChecked(true);
        setTimeout(() => setJustChecked(false), 600);
      }
      prevChecked.current = item.checked;
    }
  }, [item.checked]);

  return (
    <SwipeToDelete onDelete={() => onDelete(item.id)}>
      <div
        className={`flex items-center gap-3 px-1 py-2 bg-white rounded-xl transition-all duration-300 ${
          item.checked ? "opacity-70" : ""
        }`}
      >
        {/* Checkbox — tomato when checked, cream-warm hairline border when not */}
        <button
          onClick={() => onToggle(item.id, !item.checked)}
          className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 ${justChecked ? "scale-125" : ""}`}
          style={{
            background: item.checked ? "var(--tomato, #E5462E)" : "transparent",
            borderColor: item.checked ? "var(--tomato, #E5462E)" : "var(--line, rgba(28,26,23,0.18))",
            transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
          aria-label={item.checked ? "Uncheck item" : "Check item"}
        >
          {item.checked && (
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
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
            <span
              className="text-sm font-medium capitalize transition-all duration-300"
              style={{
                color: item.checked ? "var(--ink-soft, #4A4742)" : "var(--ink, #1C1A17)",
                textDecoration: item.checked ? "line-through" : "none",
                textDecorationColor: "var(--tomato, #E5462E)",
                textDecorationThickness: "1.5px",
                textDecorationSkipInk: "none",
              }}
            >
              {displayName}
            </span>
            {displayAmount && (
              <span
                className="text-xs transition-colors duration-300"
                style={{
                  color: "var(--ink-soft, #4A4742)",
                  opacity: item.checked ? 0.5 : 0.7,
                  textDecoration: item.checked ? "line-through" : "none",
                  textDecorationColor: "var(--tomato, #E5462E)",
                  textDecorationThickness: "1.5px",
                  textDecorationSkipInk: "none",
                }}
              >
                {displayAmount}{displayUnit ? ` ${displayUnit}` : ""}
              </span>
            )}
          </div>
          {!item.checked && item.recipe_sources && item.recipe_sources.length > 0 && (
            <p
              className="text-[11px] mt-0.5 leading-tight"
              style={{ color: "var(--ink-soft, #4A4742)", opacity: 0.6 }}
            >
              <span style={{ opacity: 0.7 }}>for </span>
              <span>{item.recipe_sources.join(", ")}</span>
            </p>
          )}
        </button>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {ownerName && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
              style={{
                background: "var(--cream-warm, #EFE5D2)",
                color: "var(--ink-soft, #4A4742)",
              }}
            >
              {ownerName}
            </span>
          )}
          {item.in_pantry && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
              style={{
                background: "var(--cream-warm, #EFE5D2)",
                color: "var(--teal, #0F4C5C)",
              }}
            >
              in pantry
            </span>
          )}
          {item.is_custom && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
              style={{
                background: "var(--cream-warm, #EFE5D2)",
                color: "var(--ink-soft, #4A4742)",
              }}
            >
              added
            </span>
          )}
        </div>
      </div>
    </SwipeToDelete>
  );
}
