"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { MealTypeIcon } from "@/components/icons/MealIcons";

/**
 * Shared visual recipe card used across Discover, My Recipes, and Grocery.
 *
 * Marco design rules:
 * - 4:5 portrait aspect ratio, fills parent width
 * - Image fills entire card
 * - Concentrated bottom gradient so the food still pops
 * - Fraunces serif title (the editorial voice), white, 16px, max 2 lines
 * - Mono uppercase metadata line ("45 MIN \u00B7 DINNER") for time/meal type
 * - Glassy black/25 buttons in the top corners
 * - Cream-warm fallback (no emoji ever \u2014 stroke-2 SVG meal icon)
 * - Subtle box shadow, no border
 *
 * Per-page differences are passed in via props (action buttons, badges,
 * excluded state) so each consumer can keep its own behavior while still
 * sharing the same look.
 */

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
  /** CSS aspect-ratio for the card. Defaults to the 4:5 portrait; pass a
   *  shorter ratio (e.g. "1 / 1") where a more compact card is wanted. */
  aspect?: string;
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
  aspect = "4 / 5",
}: SharedRecipeCardProps) {
  return (
    <div
      className={`relative rounded-3xl overflow-hidden cursor-pointer select-none group transition-transform duration-200 active:scale-[0.97] ${excluded ? "opacity-50 grayscale" : ""} ${className}`}
      style={{
        aspectRatio: aspect,
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
        <div
          className="absolute inset-0 w-full h-full flex items-center justify-center"
          style={{
            background:
              "radial-gradient(circle at 35% 40%, var(--mustard, #E8A33D) 0%, transparent 45%), radial-gradient(circle at 70% 70%, var(--tomato, #E5462E) 0%, transparent 40%), var(--cream-warm, #EFE5D2)",
          }}
        >
          <MealTypeIcon
            type={mealType}
            className="opacity-50"
            size={48}
            strokeWidth={1.5}
          />
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
            <ActionButton key={i} action={action} />
          ))}
        </div>
      )}

      {/* Title + meta overlay at bottom \u2014 Marco editorial voice */}
      <div className="absolute bottom-0 left-0 right-0 px-3.5 pb-3 pt-10 pointer-events-none z-10">
        <h4
          className={`text-white mb-1.5 line-clamp-2 ${excluded ? "line-through" : ""}`}
          style={{
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 500',
            fontSize: "16px",
            lineHeight: "1.18",
            letterSpacing: "-0.015em",
            textShadow: "0 1px 6px rgba(0,0,0,0.45)",
          }}
        >
          {title}
        </h4>
        {(metaText || (totalTime && totalTime > 0) || mealType) && (
          <div
            className="flex items-center gap-1.5 truncate"
            style={{
              fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              fontSize: "9.5px",
              letterSpacing: "0.13em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.85)",
              fontWeight: 500,
              textShadow: "0 1px 3px rgba(0,0,0,0.4)",
            }}
          >
            {totalTime && totalTime > 0 && <span>{totalTime} min</span>}
            {totalTime && totalTime > 0 && (mealType || metaText) && (
              <span className="text-white/40">{"\u00B7"}</span>
            )}
            {mealType && !metaText && <span>{mealType}</span>}
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

/**
 * Top-right action button. Fires the Marco punctum pulse the moment the
 * action transitions to active (e.g. saving a recipe — tomato ripple
 * emanates outward as the brand's "save / cooked it" feedback).
 */
export function ActionButton({ action }: { action: SharedCardAction }) {
  const [pulseKey, setPulseKey] = useState(0);
  const prevActiveRef = useRef(action.active);

  useEffect(() => {
    if (action.active && !prevActiveRef.current) {
      // Just turned on — fire a fresh pulse
      setPulseKey((k) => k + 1);
    }
    prevActiveRef.current = action.active;
  }, [action.active]);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        action.onClick();
      }}
      disabled={action.loading}
      className="relative w-7 h-7 flex items-center justify-center rounded-full bg-black/25 backdrop-blur-md transition-all active:scale-90 disabled:opacity-100"
      aria-label={action.label}
    >
      {action.loading ? (
        <div className="w-3 h-3 border-[1.5px] border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        action.icon
      )}
      {pulseKey > 0 && (
        <span
          key={pulseKey}
          className="marco-punctum-pulse"
          aria-hidden="true"
        />
      )}
    </button>
  );
}
