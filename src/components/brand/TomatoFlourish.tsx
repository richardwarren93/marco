/**
 * The tomato flourish — a wavy S-curve ending in the punctum. Per the
 * brand guidelines: "Section dividers and decorative breaks. Always ends
 * in the punctum. A throughline across the whole graphic system."
 *
 * Used as the divider in the Community section header and inline on
 * "plan multiple meals" in AddMealSheet. Keep the SVG primitive here so
 * every divider matches.
 *
 * Variants:
 *   - "underline": stretches to fit the parent's width via 100% +
 *     preserveAspectRatio="none". Use when the flourish hangs under text.
 *   - "divider": a fixed-aspect block flourish for section breaks. Use
 *     when the flourish stands alone between sections.
 */
export default function TomatoFlourish({
  variant = "underline",
  className = "",
  height,
  width,
}: {
  variant?: "underline" | "divider";
  className?: string;
  height?: number | string;
  width?: number | string;
}) {
  if (variant === "divider") {
    return (
      <svg
        width={width ?? 145}
        height={height ?? 14}
        viewBox="0 0 145 14"
        fill="none"
        className={`block ${className}`}
        aria-hidden="true"
      >
        <path
          d="M 4 7 Q 38 1, 70 7 Q 102 13, 138 4"
          stroke="var(--tomato, #E5462E)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="138" cy="4" r="3" fill="var(--tomato, #E5462E)" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className={`block ${className}`}
      style={{ width: width ?? "100%", height: height ?? "8px" }}
      viewBox="0 0 130 10"
      preserveAspectRatio="none"
      fill="none"
    >
      <path
        d="M 3 5 Q 30 1, 60 5 Q 90 9, 122 4"
        stroke="var(--tomato, #E5462E)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx="122" cy="4" r="3" fill="var(--tomato, #E5462E)" />
    </svg>
  );
}
