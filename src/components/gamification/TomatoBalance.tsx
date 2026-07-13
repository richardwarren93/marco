"use client";

import { useEffect, useRef, useState } from "react";
import { TomatoIcon } from "@/components/icons/HandDrawnIcons";
import { usePrefersReducedMotion } from "./celebrations";

interface TomatoBalanceProps {
  balance: number;
  className?: string;
  size?: "sm" | "md";
  /** Animate increases with a count-up + bounce (used by the header chip). */
  animateChanges?: boolean;
}

export default function TomatoBalance({ balance, className = "", size = "md", animateChanges = false }: TomatoBalanceProps) {
  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const textSize = size === "sm" ? "text-sm" : "text-base";
  const reduced = usePrefersReducedMotion();

  // While counting up, animValue overrides the rendered number; null = show the
  // real balance (first paint, decreases, opt-out, reduced motion all snap).
  const [animValue, setAnimValue] = useState<number | null>(null);
  const [bumped, setBumped] = useState(false);
  const prevRef = useRef<number | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = balance;

    if (!animateChanges || reduced || prev === null || balance <= prev) return;

    // Count up ~600ms with ease-out; bounce the chip while it ticks. All state
    // writes happen inside rAF callbacks (never synchronously in the effect).
    const duration = 600;
    let start = 0;
    let raf = requestAnimationFrame(function tick(now) {
      if (!start) {
        start = now;
        setBumped(true);
      }
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimValue(Math.round(prev + (balance - prev) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setAnimValue(null); // hand back to the live prop
    });
    const bounceTimer = setTimeout(() => setBumped(false), 700);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(bounceTimer);
    };
  }, [balance, animateChanges, reduced]);

  const display = animValue ?? balance;

  return (
    <div
      // Re-keying on each bump reliably restarts the CSS bounce animation.
      key={bumped ? `bump-${balance}` : "steady"}
      className={`flex items-center gap-1 ${bumped ? "animate-bounce-in" : ""} ${className}`}
    >
      <TomatoIcon className={`${iconSize} text-red-500`} filled />
      <span className={`font-bold ${textSize} tabular-nums`}>{display}</span>
    </div>
  );
}
