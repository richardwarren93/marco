"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TomatoIcon } from "@/components/icons/HandDrawnIcons";
import TomatoMascot from "@/components/gamification/TomatoMascot";
import { useToast } from "@/components/ui/Toast";
import {
  TOMATO_REASON_META,
  TOMATO_HEALTH_META,
  TOMATO_REWARDS,
  relativeTime,
  type TomatoReason,
  type TomatoHealthState,
} from "@/lib/gamification";

interface Transaction {
  id: string;
  amount: number;
  reason: TomatoReason;
  created_at: string;
}

interface Mascot {
  state: TomatoHealthState;
  streak: number;
  daysSinceLastEarn: number | null;
}

export default function TomatoesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [mascot, setMascot] = useState<Mascot | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviving, setReviving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/tomatoes");
        if (res.status === 401) {
          router.replace("/auth/login");
          return;
        }
        const data = await res.json();
        setBalance(data.balance ?? 0);
        setTransactions(data.transactions ?? []);
        setMascot(data.mascot ?? null);
      } catch {
        setBalance(0);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const health = mascot ? TOMATO_HEALTH_META[mascot.state] : null;
  const firstTime = mascot?.daysSinceLastEarn === null;
  const reviveCost = TOMATO_REWARDS.REVIVE_PET_COST;
  const canAffordRevive = (balance ?? 0) >= reviveCost;

  async function handleRevive() {
    if (reviving) return;
    setReviving(true);
    try {
      const res = await fetch("/api/tomatoes/revive", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        showToast(data?.error === "insufficient" ? `Need ${data.needed} 🍅 to revive` : "Couldn't revive — try again");
        return;
      }
      setMascot(data.mascot);
      setBalance(data.balance);
      showToast("🌱 He's back!", { variant: "success" });
      window.dispatchEvent(new CustomEvent("tomatoes:earned", { detail: { balance: data.balance } }));
    } catch {
      showToast("Couldn't revive — try again");
    } finally {
      setReviving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto w-full px-4" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center hover:bg-gray-100/60 transition-colors"
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#1C1A17" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1
          className="font-black"
          style={{
            color: "#1C1A17",
            fontSize: "22px",
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 700',
          }}
        >
          Tomatoes
        </h1>
      </div>

      {/* Mascot hero — his health reflects your earning consistency */}
      {mascot && (
        <div
          className="flex flex-col items-center text-center rounded-3xl px-5 pt-6 pb-5 mb-5"
          style={{ background: "#FFFDF7", border: "1px solid rgba(28,26,23,0.08)", boxShadow: "0 2px 12px rgba(28,26,23,0.05)" }}
        >
          <TomatoMascot state={mascot.state} size={200} />
          <div className="flex items-center gap-2 mt-1">
            <p className="font-black" style={{ fontSize: "20px", color: "#1C1A17", fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)", fontVariationSettings: '"opsz" 40, "SOFT" 100, "wght" 700' }}>
              {health?.label}
            </p>
            {mascot.state !== "dead" && mascot.streak > 0 && (
              <span
                className="font-bold tabular-nums"
                style={{ fontSize: "12px", color: "var(--tomato, #E5462E)", background: "rgba(229,70,46,0.1)", padding: "2px 8px", borderRadius: "999px" }}
              >
                🔥 {mascot.streak}-day streak
              </span>
            )}
          </div>
          <p className="mt-1.5 max-w-xs" style={{ fontSize: "13.5px", lineHeight: 1.45, color: "#6B655C" }}>
            {firstTime ? "Earn your first tomato to bring him to life." : health?.message}
          </p>

          {mascot.state === "dead" && (
            <>
              <button
                onClick={handleRevive}
                disabled={reviving || !canAffordRevive}
                className="mt-3.5 px-5 py-2.5 rounded-full text-white font-semibold text-sm transition-all active:scale-[0.97]"
                style={{ background: "var(--tomato, #E5462E)", opacity: reviving || !canAffordRevive ? 0.45 : 1, cursor: reviving || !canAffordRevive ? "not-allowed" : "pointer" }}
              >
                {reviving ? "Reviving…" : `🌱 Revive him · ${reviveCost} 🍅`}
              </button>
              {!canAffordRevive && (
                <p className="mt-1.5" style={{ fontSize: "12px", color: "#9b938a" }}>
                  Earn {reviveCost - (balance ?? 0)} more to revive him.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Balance card */}
      <div
        className="flex items-center gap-3 rounded-3xl px-5 py-5 mb-6"
        style={{ background: "#FFFDF7", border: "1px solid rgba(28,26,23,0.08)", boxShadow: "0 2px 12px rgba(28,26,23,0.05)" }}
      >
        <TomatoIcon className="w-9 h-9 text-red-500" filled />
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#9b938a" }}>Your balance</p>
          <p className="font-black tabular-nums" style={{ fontSize: "30px", lineHeight: 1.05, color: "#1C1A17" }}>
            {balance ?? 0}
          </p>
        </div>
      </div>

      {/* History */}
      <p className="text-[11px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "#9b938a" }}>Recent activity</p>

      {loading ? (
        <p className="text-sm py-6 text-center" style={{ color: "#6B655C" }}>Loading…</p>
      ) : transactions.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: "#6B655C" }}>
          No tomatoes yet — cook, plan, rate, and invite friends to start earning.
        </p>
      ) : (
        <ul className="space-y-1.5 pb-10">
          {transactions.map((t) => {
            const meta = TOMATO_REASON_META[t.reason] ?? { label: t.reason, icon: "🍅" };
            const positive = t.amount >= 0;
            return (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-2xl px-3.5 py-3"
                style={{ background: "#FFFDF7", border: "1px solid rgba(28,26,23,0.06)" }}
              >
                <span className="text-lg flex-shrink-0" aria-hidden>{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "#1C1A17" }}>{meta.label}</p>
                  <p className="text-[11px]" style={{ color: "#9b938a" }}>{relativeTime(t.created_at)}</p>
                </div>
                <span
                  className="font-bold tabular-nums text-sm flex-shrink-0"
                  style={{ color: positive ? "#16a34a" : "#B8331E" }}
                >
                  {positive ? "+" : "−"}{Math.abs(t.amount)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
