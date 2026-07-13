"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { apiFetcher } from "@/lib/hooks/use-data";
import { TOMATO_HEALTH_META, type TomatoHealthState } from "@/lib/gamification";
import TomatoMascot from "./TomatoMascot";

/* Ambient mascot presence on the recipes home — a compact tappable strip that
   surfaces his health + streak where users actually live. Priority: dead →
   revive plea; at-risk (streak alive, nothing earned today) → urgency; else
   the state's message. Dismissable for the rest of the (local) day. */

const DISMISS_KEY = "marco_mascot_strip_dismissed";

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface TomatoData {
  balance?: number;
  mascot?: { state: TomatoHealthState; streak: number; daysSinceLastEarn: number | null };
}

export default function MascotStrip() {
  const { data } = useSWR<TomatoData>("/api/tomatoes", apiFetcher, { revalidateOnFocus: false });
  // Mounted with ssr:false, so localStorage is safe to read at init.
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return localStorage.getItem(DISMISS_KEY) === localToday();
    } catch {
      return false;
    }
  });

  const mascot = data?.mascot;
  if (dismissed || !mascot) return null; // loading, logged out, or hidden today

  const { state, streak, daysSinceLastEarn } = mascot;
  const dead = state === "dead";
  const atRisk = !dead && streak > 0 && (daysSinceLastEarn ?? 0) >= 1;

  const title = dead
    ? "He didn't make it…"
    : atRisk
      ? "Your streak ends tonight"
      : TOMATO_HEALTH_META[state]?.label ?? "Your tomato";
  const line = dead
    ? "Revive him and start a fresh streak."
    : atRisk
      ? "Cook or plan something today to keep it alive."
      : TOMATO_HEALTH_META[state]?.message ?? "";

  function dismiss(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      localStorage.setItem(DISMISS_KEY, localToday());
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  return (
    <Link
      href="/tomatoes"
      className="mx-4 mt-3 mb-1 flex items-center gap-3 rounded-2xl px-3 py-2.5 animate-pop-in active:scale-[0.99] transition-transform"
      style={{
        background: "#FFFDF7",
        border: atRisk || dead ? "1.5px solid rgba(229,70,46,0.35)" : "1px solid rgba(28,26,23,0.08)",
        boxShadow: "0 1px 3px rgba(28,26,23,0.05)",
      }}
    >
      <span className="flex-shrink-0 -my-1">
        <TomatoMascot size={48} state={state} />
      </span>

      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-1.5">
          <span className="text-[13px] font-bold truncate" style={{ color: atRisk || dead ? "#B8331E" : "#1C1A17" }}>
            {title}
          </span>
          {atRisk && <span className="animate-pulse-soft text-[12px]" aria-hidden>🔥</span>}
          {!dead && !atRisk && streak >= 2 && (
            <span
              className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(229,70,46,0.1)", color: "#B8331E" }}
            >
              🔥 Day {streak}
            </span>
          )}
        </span>
        <span className="block text-[11.5px] truncate" style={{ color: "#8a8378" }}>{line}</span>
      </span>

      {dead ? (
        <span
          className="flex-shrink-0 text-[11.5px] font-bold text-white px-3 py-1.5 rounded-full"
          style={{ background: "#E5462E" }}
        >
          Revive him
        </span>
      ) : (
        <button
          onClick={dismiss}
          aria-label="Hide for today"
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="#b4ab9e" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </Link>
  );
}
