"use client";

import { useState, useEffect } from "react";
import type { BadgeProgress, BadgeCategory } from "@/lib/badges";
import { TIER_COLORS, CATEGORY_LABELS } from "@/lib/badges";

export default function BadgesCard() {
  const [progress, setProgress] = useState<BadgeProgress[]>([]);
  const [earned, setEarned] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<BadgeCategory | "all">("all");
  const [selectedBadge, setSelectedBadge] = useState<BadgeProgress | null>(null);

  useEffect(() => {
    async function fetchBadges() {
      try {
        const res = await fetch("/api/badges");
        if (!res.ok) return;
        const data = await res.json();
        setProgress(data.progress || []);
        setEarned(data.earned || 0);
        setTotal(data.total || 0);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchBadges();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-24 mb-4" />
        <div className="grid grid-cols-5 gap-3">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="w-full aspect-square bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const categories: (BadgeCategory | "all")[] = ["all", "recipes", "cooking", "meal_plan", "collections", "social"];

  const filtered = activeCategory === "all"
    ? progress
    : progress.filter((p) => p.badge.category === activeCategory);

  // Sort: earned first, then by tier (gold > silver > bronze)
  const tierOrder = { gold: 0, silver: 1, bronze: 2 };
  const sorted = [...filtered].sort((a, b) => {
    if (a.earned !== b.earned) return a.earned ? -1 : 1;
    return tierOrder[a.badge.tier] - tierOrder[b.badge.tier];
  });

  const progressPct = total > 0 ? Math.round((earned / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <span className="text-lg">🏅</span>
            Badges
          </h3>
          <span className="text-xs font-semibold text-gray-500">
            {earned}/{total}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Category filter */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
          {categories.map((cat) => {
            const count = cat === "all"
              ? progress.filter((p) => p.earned).length
              : progress.filter((p) => p.badge.category === cat && p.earned).length;
            const catTotal = cat === "all"
              ? total
              : progress.filter((p) => p.badge.category === cat).length;

            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  activeCategory === cat
                    ? "bg-orange-100 text-orange-700"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
              >
                {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
                <span className="ml-1 opacity-60">{count}/{catTotal}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Badge grid — Pokédex style */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-5 gap-2">
          {sorted.map((item) => {
            const colors = TIER_COLORS[item.badge.tier];
            const pct = Math.min(100, Math.round((item.current / item.badge.threshold) * 100));

            return (
              <button
                key={item.badge.id}
                onClick={() => setSelectedBadge(item)}
                className={`relative aspect-square rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                  item.earned
                    ? `${colors.bg} ${colors.border} hover:shadow-md active:scale-95`
                    : "bg-gray-50 border-gray-100 opacity-40 hover:opacity-60"
                }`}
              >
                <span className={`text-xl ${item.earned ? "" : "grayscale"}`}>
                  {item.badge.icon}
                </span>
                {/* Progress ring for unearned */}
                {!item.earned && pct > 0 && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                    <span className="text-[8px] font-bold text-gray-400">{pct}%</span>
                  </div>
                )}
                {/* Tier indicator for earned */}
                {item.earned && (
                  <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border border-white shadow-sm flex items-center justify-center ${
                    item.badge.tier === "gold"
                      ? "bg-yellow-400"
                      : item.badge.tier === "silver"
                      ? "bg-gray-300"
                      : "bg-amber-500"
                  }`}>
                    <span className="text-[7px] text-white font-bold">
                      {item.badge.tier === "gold" ? "★" : item.badge.tier === "silver" ? "◆" : "●"}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Badge detail popup */}
      {selectedBadge && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6"
          onClick={() => setSelectedBadge(null)}
        >
          <div
            className="bg-white rounded-2xl p-5 max-w-xs w-full animate-pop-in text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Badge icon — large */}
            <div className={`w-20 h-20 rounded-2xl mx-auto flex items-center justify-center mb-3 border-2 ${
              selectedBadge.earned
                ? `${TIER_COLORS[selectedBadge.badge.tier].bg} ${TIER_COLORS[selectedBadge.badge.tier].border}`
                : "bg-gray-50 border-gray-200"
            }`}>
              <span className={`text-4xl ${selectedBadge.earned ? "" : "grayscale opacity-30"}`}>
                {selectedBadge.badge.icon}
              </span>
            </div>

            {/* Name */}
            <h3 className={`font-bold text-lg ${
              selectedBadge.earned ? "text-gray-900" : "text-gray-400"
            }`}>
              {selectedBadge.badge.name}
            </h3>

            {/* Tier */}
            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider mt-1 ${
              TIER_COLORS[selectedBadge.badge.tier].bg
            } ${TIER_COLORS[selectedBadge.badge.tier].text}`}>
              {selectedBadge.badge.tier}
            </span>

            {/* Description */}
            <p className="text-sm text-gray-500 mt-2">
              {selectedBadge.badge.description}
            </p>

            {/* Progress */}
            {!selectedBadge.earned && (
              <div className="mt-3">
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-400 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (selectedBadge.current / selectedBadge.badge.threshold) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {selectedBadge.current} / {selectedBadge.badge.threshold}
                </p>
              </div>
            )}

            {selectedBadge.earned && (
              <p className="text-xs text-green-600 font-medium mt-3 flex items-center justify-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Earned!
              </p>
            )}

            <button
              onClick={() => setSelectedBadge(null)}
              className="mt-4 text-sm text-gray-400 hover:text-gray-600 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
