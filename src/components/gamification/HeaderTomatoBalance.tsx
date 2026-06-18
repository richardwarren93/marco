"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TomatoBalance from "./TomatoBalance";

/**
 * Persistent tomato balance for the app header. Fetches the balance once, keeps it
 * fresh on window focus, and updates instantly when any award dispatches a
 * "tomatoes:earned" CustomEvent (with the new balance in detail.balance). Tapping
 * it opens the tomato history. Renders nothing until the first balance loads, so it
 * never flashes a placeholder.
 */
export default function HeaderTomatoBalance() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await fetch("/api/tomatoes");
        if (!res.ok) return;
        const data = await res.json();
        if (active) setBalance(data.balance ?? 0);
      } catch {
        /* ignore */
      }
    };
    load();

    const onEarned = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.balance === "number") setBalance(detail.balance);
      else load();
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

  return (
    <Link
      href="/tomatoes"
      aria-label="Your tomatoes"
      className="flex items-center rounded-full px-2 h-9 hover:bg-gray-100/60 transition-colors"
    >
      <TomatoBalance balance={balance} size="sm" />
    </Link>
  );
}
