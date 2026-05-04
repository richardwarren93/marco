/**
 * The hand-drawn mustard wave underline. Per the refined brand doc:
 * "Mustard wave for emphasis. Used sparingly — the equivalent of speaking
 * a little louder."
 *
 * Used on the desktop top tabs and the Discover Friends/Community toggle
 * to mark the active label. Keep the SVG primitive here so both surfaces
 * share one source of truth.
 */
export default function MustardUnderline({ className = "" }: { className?: string }) {
  return (
    <svg
      width="100%"
      height="6"
      viewBox="0 0 100 6"
      preserveAspectRatio="none"
      className={`block ${className}`}
      aria-hidden="true"
    >
      <path
        d="M 2 2 Q 50 5.4, 98 2"
        stroke="var(--mustard, #E8A33D)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
