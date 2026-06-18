"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TomatoIcon } from "@/components/icons/HandDrawnIcons";
import { TOMATO_REASON_META, relativeTime, type TomatoReason } from "@/lib/gamification";

interface Transaction {
  id: string;
  amount: number;
  reason: TomatoReason;
  created_at: string;
}

export default function TomatoesPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

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
      } catch {
        setBalance(0);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

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
