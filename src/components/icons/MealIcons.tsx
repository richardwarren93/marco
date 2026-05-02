/**
 * Marco meal-type SVG icons (stroke-2 outline, Lucide-style).
 *
 * Replaces emoji meal indicators throughout the app per the Marco
 * design system — "no emoji, ever." All icons use currentColor so
 * they tint via CSS color/className.
 */

interface MealIconProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
}

const baseProps = (size?: number, strokeWidth = 2) => ({
  width: size ?? undefined,
  height: size ?? undefined,
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

/** Sunrise — breakfast */
export function BreakfastIcon({ className = "w-5 h-5", size, strokeWidth }: MealIconProps) {
  return (
    <svg className={className} {...baseProps(size, strokeWidth)}>
      <path d="M12 4v2" />
      <path d="M5.6 8.6l1.4 1.4" />
      <path d="M18.4 8.6L17 10" />
      <path d="M2 18h20" />
      <path d="M5 14a7 7 0 0 1 14 0" />
    </svg>
  );
}

/** Bowl — lunch */
export function LunchIcon({ className = "w-5 h-5", size, strokeWidth }: MealIconProps) {
  return (
    <svg className={className} {...baseProps(size, strokeWidth)}>
      <path d="M3 11h18" />
      <path d="M4 11a8 8 0 0 0 16 0" />
      <path d="M9 7c0-1.5 1-3 3-3s3 1.5 3 3" />
    </svg>
  );
}

/** Plate with fork & knife — dinner */
export function DinnerIcon({ className = "w-5 h-5", size, strokeWidth }: MealIconProps) {
  return (
    <svg className={className} {...baseProps(size, strokeWidth)}>
      <path d="M5 4v5a2 2 0 0 0 2 2h0v9" />
      <path d="M7 4v5" />
      <path d="M19 4v6c0 .8-.7 1.5-1.5 1.5S16 10.8 16 10V4" />
      <path d="M17.5 11.5V20" />
    </svg>
  );
}

/** Apple — snack */
export function SnackIcon({ className = "w-5 h-5", size, strokeWidth }: MealIconProps) {
  return (
    <svg className={className} {...baseProps(size, strokeWidth)}>
      <path d="M12 7c0-2 1-3 2.5-3" />
      <path d="M19 14c0 4-3 7-7 7s-7-3-7-7c0-3.5 2.5-6 5-6 .8 0 1.4.2 2 .5.6-.3 1.2-.5 2-.5 2.5 0 5 2.5 5 6z" />
    </svg>
  );
}

/** Generic meal fallback (used when meal_type is missing) */
export function MealIcon({ className = "w-5 h-5", size, strokeWidth }: MealIconProps) {
  return (
    <svg className={className} {...baseProps(size, strokeWidth)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
    </svg>
  );
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

/** Renders the right icon for a given meal type, with a fallback. */
export function MealTypeIcon({
  type,
  className = "w-5 h-5",
  size,
  strokeWidth,
}: { type?: string | null } & MealIconProps) {
  const t = (type || "").toLowerCase() as MealType;
  if (t === "breakfast") return <BreakfastIcon className={className} size={size} strokeWidth={strokeWidth} />;
  if (t === "lunch") return <LunchIcon className={className} size={size} strokeWidth={strokeWidth} />;
  if (t === "dinner") return <DinnerIcon className={className} size={size} strokeWidth={strokeWidth} />;
  if (t === "snack") return <SnackIcon className={className} size={size} strokeWidth={strokeWidth} />;
  return <MealIcon className={className} size={size} strokeWidth={strokeWidth} />;
}
