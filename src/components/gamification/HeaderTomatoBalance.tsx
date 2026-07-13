"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TomatoBalance from "./TomatoBalance";
import type { TomatoHealthState } from "@/lib/gamification";

interface MascotInfo {
  state: TomatoHealthState;
  streak: number;
  daysSinceLastEarn: number | null;
}

/**
 * Persistent tomato balance for the app header. Fetches balance + mascot once,
 * keeps them fresh on window focus, and updates instantly when any award
 * dispatches a "tomatoes:earned" CustomEvent. When a live streak has earned
 * nothing today, the chip turns urgent (🔥 pulse) — the streak ends tonight.
 * Tapping it opens the tomato page. Renders nothing until the first load.
 */
export default function HeaderTomatoBalance() {
  const [balance, setBalance] = useState<number | null>(null);
  const [mascot, setMascot] = useState<MascotInfo | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await fetch("/api/tomatoes");
        if (!res.ok) return;
        const data = await res.json();
        if (active) {
          setBalance(data.balance ?? 0);
          setMascot(data.mascot ?? null);
        }
      } catch {
        /* ignore */
      }
    };
    load();

    const onEarned = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.balance === "number") setBalance(detail.balance);
      else load();
      // Earning today ends the at-risk state by definition; focus-refetch reconciles.
      setMascot((m) => (m ? { ...m, daysSinceLastEarn: 0 } : m));
    };
    const onFocus = () => load();

    window.addEventListener("tomatoes:earned", onEarned);
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.removeEventListener("tomatoes:earned", onEarned);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (balance === null) return null;

  const atRisk = !!mascot && mascot.streak > 0 && (mascot.daysSinceLastEarn ?? 0) >= 1;

  return (
    <Link
      href="/tomatoes"
      aria-label={atRisk ? `Your ${mascot!.streak}-day streak ends tonight — cook to keep it` : "Your tomatoes"}
      className="flex items-center gap-0.5 rounded-full px-2 h-9 hover:bg-gray-100/60 transition-colors"
      style={atRisk ? { background: "rgba(229,70,46,0.1)" } : undefined}
    >
      {atRisk && (
        <span className="animate-pulse-soft text-[13px]" aria-hidden>
          🔥
        </span>
      )}
      <TomatoBalance balance={balance} size="sm" animateChanges />
    </Link>
  );
}
