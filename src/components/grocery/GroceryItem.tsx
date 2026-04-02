"use client";

import { useState, useRef, useEffect } from "react";
import type { GroceryItem as GroceryItemType } from "@/types";

interface Props {
  item: GroceryItemType;
  onToggle: (id: string, checked: boolean) => void;
  onEdit: (item: GroceryItemType) => void;
  onDelete: (id: string) => void;
  ownerName?: string;
}

const DELETE_WIDTH = 72;
const REVEAL_THRESHOLD = 40;

export default function GroceryItem({ item, onToggle, onEdit, onDelete, ownerName }: Props) {
  const displayName = item.name_override ?? item.name;
  const displayAmount = item.amount_override ?? item.amount;
  const displayUnit = item.unit_override ?? item.unit;

  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const startX = useRef(0);

  // Check-off animation state
  const [justChecked, setJustChecked] = useState(false);
  const [justUnchecked, setJustUnchecked] = useState(false);
  const prevChecked = useRef(item.checked);

  useEffect(() => {
    if (item.checked !== prevChecked.current) {
      if (item.checked) {
        setJustChecked(true);
        setTimeout(() => setJustChecked(false), 600);
      } else {
        setJustUnchecked(true);
        setTimeout(() => setJustUnchecked(false), 400);
      }
      prevChecked.current = item.checked;
    }
  }, [item.checked]);

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  }

  function onTouchMove(e: React.TouchEvent) {
    const delta = e.touches[0].clientX - startX.current;
    if (delta < 0) {
      setOffset(Math.max(delta, -DELETE_WIDTH));
    } else if (revealed) {
      // Allow swiping back right
      setOffset(Math.min(delta - DELETE_WIDTH, 0));
    }
  }

  function onTouchEnd() {
    setIsDragging(false);
    if (offset <= -REVEAL_THRESHOLD) {
      setOffset(-DELETE_WIDTH);
      setRevealed(true);
    } else {
      setOffset(0);
      setRevealed(false);
    }
  }

  function closeSwipe() {
    setOffset(0);
    setRevealed(false);
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Delete button — only mount when swiping/revealed to avoid red peek during normal scroll */}
      {(isDragging || revealed || offset < 0) && (
        <div
          className="absolute right-0 top-0 bottom-0 flex items-center justify-center bg-red-500"
          style={{ width: DELETE_WIDTH }}
        >
          <button
            onClick={() => onDelete(item.id)}
            className="flex flex-col items-center justify-center w-full h-full text-white gap-0.5"
            aria-label="Delete item"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="text-[10px] font-medium">Delete</span>
          </button>
        </div>
      )}

      {/* Main item row */}
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDragging ? "none" : "transform 0.2s ease",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={`flex items-center gap-3 px-1 py-2 bg-white transition-all duration-300 ${
          justChecked ? "bg-green-50" : justUnchecked ? "bg-orange-50" : ""
        } ${item.checked && !justChecked ? "opacity-60" : ""}`}
        onClick={revealed ? closeSwipe : undefined}
      >
        {/* Checkbox */}
        <button
          onClick={(e) => {
            if (revealed) { e.stopPropagation(); closeSwipe(); return; }
            onToggle(item.id, !item.checked);
          }}
          className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
            item.checked
              ? "bg-green-500 border-green-500"
              : "border-gray-300 hover:border-orange-400"
          } ${justChecked ? "scale-125" : ""}`}
          style={{ transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
          aria-label={item.checked ? "Uncheck item" : "Check item"}
        >
          {item.checked && (
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
              style={{
                strokeDasharray: 24,
                strokeDashoffset: justChecked ? 0 : 0,
                animation: justChecked ? "check-draw 0.3s ease forwards" : undefined,
              }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Item details — tap to edit */}
        <button
          type="button"
          onClick={() => { if (!revealed) onEdit(item); else closeSwipe(); }}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className={`text-sm font-medium capitalize transition-all duration-300 ${
              item.checked ? "line-through text-gray-400" : "text-gray-800"
            } ${justChecked ? "text-green-600" : ""}`}>
              {displayName}
            </span>
            {displayAmount && (
              <span className={`text-xs transition-colors duration-300 ${justChecked ? "text-green-400" : "text-gray-400"}`}>
                {displayAmount}{displayUnit ? ` ${displayUnit}` : ""}
              </span>
            )}
          </div>
          {!item.checked && item.recipe_sources && item.recipe_sources.length > 0 && (
            <p className="text-[11px] mt-0.5 leading-tight">
              <span className="text-gray-400">for </span>
              <span className="text-gray-500">{item.recipe_sources.join(", ")}</span>
            </p>
          )}
          {justChecked && (
            <p className="text-[10px] text-green-500 font-medium mt-0.5 animate-slide-up">
              Got it!
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
    </div>
  );
}
