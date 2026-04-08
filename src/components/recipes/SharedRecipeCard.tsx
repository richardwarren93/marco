"use client";

import { ReactNode } from "react";

/**
 * Shared visual recipe card used across Discover, My Recipes, and Grocery.
 *
 * Design rules (matching the polished Discover card):
 * - 4:5 portrait aspect ratio, fills parent width
 * - Image fills entire card
 * - Concentrated bottom gradient so the food still pops
 * - Title overlaid in white, bold 14px, max 2 lines
 * - Optional time / meta line below the title
 * - Glassy black/25 buttons in the top corners
 * - Subtle box shadow, no border
 *
 * Per-page differences are passed in via props (action buttons, badges,
 * excluded state) so each consumer can keep its own behavior while still
 * sharing the same look.
 */

const MEAL_EMOJIS: Record<string, string> = {
  breakfast: "\u{1F95E}",
  lunch: "\u{1F96A}",
  dinner: "\u{1F37D}\uFE0F",
  snack: "\u{1F36A}",
};

export interface SharedCardAction {
  icon: ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean; // e.g. saved heart, applied collection, etc.
  loading?: boolean;
}

export interface SharedRecipeCardProps {
  title: string;
  imageUrl?: string | null;
  mealType?: string | null;
  totalTime?: number;
  onClick?: () => void;
  /** Top-right action buttons (max 2 recommended) */
  actions?: SharedCardAction[];
  /** Top-left badge (e.g. day pill, fire community badge) */
  topLeftBadge?: ReactNode;
  /** Optional meta line shown below the title (e.g. "Mon · Dinner") */
  metaText?: string;
  /** Visual excluded state (grayscale + strike) */
  excluded?: boolean;
  /** Render an "Add back" button on top of an excluded card */
  onUnExclude?: () => void;
  /** Stagger animation index */
  index?: number;
  /** Outer className override (animations, scroll snap, etc.) */
  className?: string;
}

export default function SharedRecipeCard({
  title,
  imageUrl,
  mealType,
  totalTime,
  onClick,
  actions = [],
  topLeftBadge,
  metaText,
  excluded = false,
  onUnExclude,
  index = 0,
  className = "",
}: SharedRecipeCardProps) {
  const fallbackEmoji = MEAL_EMOJIS[mealType ?? ""] ?? "\u{1F373}";

  return (
    <div
      className={`relative rounded-3xl overflow-hidden cursor-pointer select-none group transition-transform duration-200 active:scale-[0.97] ${excluded ? "opacity-50 grayscale" : ""} ${className}`}
      style={{
        aspectRatio: "4 / 5",
        boxShadow: "0 4px 16px rgba(20,12,5,0.10)",
        animation: `cardPop 0.4s ease ${index * 40}ms both`,
      }}
      onClick={excluded ? undefined : onClick}
    >
      {/* Image fills entire card */}
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={title}
          referrerPolicy="no-referrer"
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-100">
          <span className="text-5xl opacity-60">{fallbackEmoji}</span>
        </div>
      )}

      {/* Concentrated bottom gradient — top half stays clear */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 55%, rgba(20,12,5,0.40) 80%, rgba(20,12,5,0.72) 100%)",
        }}
      />

      {/* Top-left badge */}
      {topLeftBadge && (
        <div className="absolute top-2.5 left-2.5 z-10">{topLeftBadge}</div>
      )}

      {/* Top-right actions */}
      {actions.length > 0 && (
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
              }}
              disabled={action.loading}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-black/25 backdrop-blur-md transition-all active:scale-90 disabled:opacity-100"
              aria-label={action.label}
            >
              {action.loading ? (
                <div className="w-3 h-3 border-[1.5px] border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                action.icon
              )}
            </button>
          ))}
        </div>
      )}

      {/* Title + meta overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-8 pointer-events-none z-10">
        <h4
          className={`font-bold text-white text-[14px] mb-1 line-clamp-2 ${excluded ? "line-through" : ""}`}
          style={{
            lineHeight: "1.22",
            letterSpacing: "-0.01em",
            textShadow: "0 1px 4px rgba(0,0,0,0.4)",
          }}
        >
          {title}
        </h4>
        {(metaText || (totalTime && totalTime > 0)) && (
          <div className="flex items-center gap-1 text-white/85 text-[10px] font-medium">
            {totalTime && totalTime > 0 && (
              <span className="flex items-center gap-1">
                <svg
                  className="w-2.5 h-2.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{totalTime} min</span>
              </span>
            )}
            {metaText && totalTime && totalTime > 0 && (
              <span className="text-white/40">{"\u00B7"}</span>
            )}
            {metaText && <span className="truncate">{metaText}</span>}
          </div>
        )}
      </div>

      {/* "Add back" overlay for excluded state */}
      {excluded && onUnExclude && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUnExclude();
          }}
          className="absolute inset-0 flex items-center justify-center z-20"
        >
          <span className="text-[11px] font-bold text-orange-600 bg-white/95 px-3 py-1.5 rounded-full shadow-sm backdrop-blur-sm">
            Add back
          </span>
        </button>
      )}
    </div>
  );
}
