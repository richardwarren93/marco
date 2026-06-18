"use client";

import TomatoMascot from "@/components/gamification/TomatoMascot";

/**
 * Brand lockup: the tomato mascot + the "Marco" wordmark. Used on the welcome/auth
 * screens and the app header. The mascot keeps his gentle idle bounce. Lay him beside
 * the wordmark (default) or stacked above it for big hero moments.
 */
export default function MarcoLockup({
  wordmarkSize = "2rem",
  tomatoSize = 44,
  stacked = false,
  className = "",
}: {
  wordmarkSize?: string;
  tomatoSize?: number;
  stacked?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center ${stacked ? "flex-col" : "flex-row"} ${className}`}
      style={{ gap: stacked ? "0.15rem" : "0.45rem" }}
    >
      <TomatoMascot state="happy" size={tomatoSize} />
      <span className="marco-signature" style={{ fontSize: wordmarkSize, lineHeight: 1 }}>
        Marco
      </span>
    </span>
  );
}
