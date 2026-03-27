"use client";

import { useState, useEffect } from "react";
import type { BadgeProgress, BadgeCategory } from "@/lib/badges";
import { TIER_COLORS, CATEGORY_LABELS } from "@/lib/badges";

// ─── Sparkles that radiate outward from the badge ────────────────────────────
function Sparkles({ tier }: { tier: string }) {
  const color = tier === "gold" ? "#fbbf24" : tier === "silver" ? "#94a3b8" : "#f97316";
  // 8 sparkles at 45° increments, each with a unique translate direction
  const angles = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <div className="absolute inset-0 pointer-events-none">
      {angles.map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const dist = 55 + (i % 3) * 18;
        const tx = `${Math.round(Math.cos(rad) * dist)}px`;
        const ty = `${Math.round(Math.sin(rad) * dist)}px`;
        return (
          <div
            key={angle}
            className="absolute animate-sparkle"
            style={{
              top: "50%", left: "50%",
              width: i % 2 === 0 ? 10 : 7,
              height: i % 2 === 0 ? 10 : 7,
              marginTop: i % 2 === 0 ? -5 : -3.5,
              marginLeft: i % 2 === 0 ? -5 : -3.5,
              borderRadius: i % 3 === 0 ? "50%" : "2px",
              backgroundColor: color,
              animationDelay: `${i * 0.06}s`,
              "--tx": tx,
              "--ty": ty,
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}

// ─── Confetti raining from top ─────────────────────────────────────────────────
function Confetti() {
  const colors = ["#f97316", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6"];
  const pieces = Array.from({ length: 22 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: `${5 + (i / 22) * 90}%`,
    delay: `${i * 0.04}s`,
    duration: `${1.0 + (i % 4) * 0.15}s`,
    size: `${5 + (i % 3) * 4}px`,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute bottom-0 rounded-sm animate-confetti"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}

// ─── Badge tile (shared) ───────────────────────────────────────────────────────
function BadgeTile({ item, onClick }: { item: BadgeProgress; onClick: () => void }) {
  const colors = TIER_COLORS[item.badge.tier];
  const pct = Math.min(100, Math.round((item.current / item.badge.threshold) * 100));

  return (
    <button
      onClick={onClick}
      className={`relative aspect-square rounded-xl border-2 flex flex-col items-center justify-center transition-all active:scale-95 ${
        item.earned
          ? `${colors.bg} ${colors.border} hover:shadow-md`
          : "bg-gray-50 border-gray-100 opacity-40 hover:opacity-60"
      }`}
    >
      <span className={`text-xl ${item.earned ? "" : "grayscale"}`}>{item.badge.icon}</span>

      {!item.earned && pct > 0 && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
          <span className="text-[8px] font-bold text-gray-400">{pct}%</span>
        </div>
      )}

      {item.earned && (
        <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border border-white shadow-sm flex items-center justify-center ${
          item.badge.tier === "gold" ? "bg-yellow-400" : item.badge.tier === "silver" ? "bg-gray-300" : "bg-amber-500"
        }`}>
          <span className="text-[7px] text-white font-bold">
            {item.badge.tier === "gold" ? "★" : item.badge.tier === "silver" ? "◆" : "●"}
          </span>
        </div>
      )}
    </button>
  );
}

// ─── Badge detail popup ────────────────────────────────────────────────────────
function BadgeDetailModal({ badge, onClose }: { badge: BadgeProgress; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center px-6" onClick={onClose}>
      <div className="bg-white rounded-2xl p-5 max-w-xs w-full animate-pop-in text-center" onClick={(e) => e.stopPropagation()}>
        <div className={`w-20 h-20 rounded-2xl mx-auto flex items-center justify-center mb-3 border-2 ${
          badge.earned
            ? `${TIER_COLORS[badge.badge.tier].bg} ${TIER_COLORS[badge.badge.tier].border}`
            : "bg-gray-50 border-gray-200"
        }`}>
          <span className={`text-4xl ${badge.earned ? "" : "grayscale opacity-30"}`}>{badge.badge.icon}</span>
        </div>

        <h3 className={`font-bold text-lg ${badge.earned ? "text-gray-900" : "text-gray-400"}`}>
          {badge.badge.name}
        </h3>

        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider mt-1 ${TIER_COLORS[badge.badge.tier].bg} ${TIER_COLORS[badge.badge.tier].text}`}>
          {badge.badge.tier}
        </span>

        <p className="text-sm text-gray-500 mt-2">{badge.badge.description}</p>

        {!badge.earned && (
          <div className="mt-3">
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-400 rounded-full transition-all"
                style={{ width: `${Math.min(100, (badge.current / badge.badge.threshold) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">{badge.current} / {badge.badge.threshold}</p>
          </div>
        )}

        {badge.earned && (
          <p className="text-xs text-green-600 font-medium mt-3 flex items-center justify-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Earned!
          </p>
        )}

        <button onClick={onClose} className="mt-4 text-sm text-gray-400 hover:text-gray-600 font-medium">
          Close
        </button>
      </div>
    </div>
  );
}

// ─── Achievement celebration modal ─────────────────────────────────────────────
function AchievementModal({ badge, onClose }: { badge: BadgeProgress; onClose: () => void }) {
  const colors = TIER_COLORS[badge.badge.tier];
  const glowColor =
    badge.badge.tier === "gold"   ? "rgba(251,191,36,0.55)"
    : badge.badge.tier === "silver" ? "rgba(148,163,184,0.55)"
    : "rgba(249,115,22,0.55)";
  const tierEmoji = badge.badge.tier === "gold" ? "🥇" : badge.badge.tier === "silver" ? "🥈" : "🥉";

  return (
    <div
      className="fixed inset-0 bg-black/65 z-[70] flex items-center justify-center px-6"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-3xl pt-8 pb-6 px-6 max-w-xs w-full text-center overflow-hidden"
        style={{ animation: "pop-in 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Confetti rain */}
        <Confetti />

        {/* "Badge Unlocked" label */}
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400 mb-5">
          Badge Unlocked {tierEmoji}
        </p>

        {/* THE BADGE — zooms in and sparkles */}
        <div className="relative inline-flex items-center justify-center mb-5">
          {/* Glow halo */}
          <div
            className="absolute w-36 h-36 rounded-full animate-badge-glow"
            style={{ background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)` }}
          />

          {/* Sparkles */}
          <div className="absolute w-36 h-36 flex items-center justify-center">
            <Sparkles tier={badge.badge.tier} />
          </div>

          {/* Badge itself */}
          <div
            className={`relative w-28 h-28 rounded-[28px] border-4 flex items-center justify-center animate-badge-zoom shadow-2xl ${colors.bg} ${colors.border}`}
          >
            {/* Shine sweep */}
            <div
              className="absolute inset-0 rounded-[24px] overflow-hidden pointer-events-none"
            >
              <div
                className="absolute top-0 bottom-0 w-16 animate-shine"
                style={{
                  background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.65) 50%, transparent 70%)",
                }}
              />
            </div>
            <span className="text-5xl drop-shadow-md">{badge.badge.icon}</span>
          </div>

          {/* Tier dot */}
          <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full border-2 border-white flex items-center justify-center shadow-md ${
            badge.badge.tier === "gold" ? "bg-yellow-400"
            : badge.badge.tier === "silver" ? "bg-gray-300"
            : "bg-amber-500"
          }`}>
            <span className="text-[11px] font-black text-white">
              {badge.badge.tier === "gold" ? "★" : badge.badge.tier === "silver" ? "◆" : "●"}
            </span>
          </div>
        </div>

        {/* Badge name — big and bold */}
        <h2 className="text-[22px] font-black text-gray-900 leading-tight tracking-tight">
          {badge.badge.name}
        </h2>

        {/* Tier label */}
        <span className={`inline-block mt-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors.bg} ${colors.text}`}>
          {badge.badge.tier} tier
        </span>

        {/* Description */}
        <p className="text-sm text-gray-500 mt-3 leading-snug">{badge.badge.description}</p>

        {/* CTA */}
        <button
          onClick={onClose}
          className={`mt-5 w-full font-bold py-3.5 rounded-2xl transition-all text-sm active:scale-95 text-white shadow-lg ${
            badge.badge.tier === "gold"
              ? "bg-gradient-to-r from-yellow-400 to-amber-400 shadow-yellow-200"
              : badge.badge.tier === "silver"
              ? "bg-gradient-to-r from-gray-400 to-slate-400 shadow-gray-200"
              : "bg-gradient-to-r from-orange-500 to-amber-500 shadow-orange-200"
          }`}
        >
          Woohoo! 🎉
        </button>
      </div>
    </div>
  );
}

// ─── Full badges modal ─────────────────────────────────────────────────────────
function AllBadgesModal({
  progress, earned, total,
  onClose,
}: {
  progress: BadgeProgress[];
  earned: number;
  total: number;
  onClose: () => void;
}) {
  const [activeCategory, setActiveCategory] = useState<BadgeCategory | "all">("all");
  const [selectedBadge, setSelectedBadge] = useState<BadgeProgress | null>(null);
  const categories: (BadgeCategory | "all")[] = ["all", "recipes", "cooking", "meal_plan", "collections", "social"];

  const tierOrder = { gold: 0, silver: 1, bronze: 2 };
  const filtered = activeCategory === "all" ? progress : progress.filter((p) => p.badge.category === activeCategory);
  const sorted = [...filtered].sort((a, b) => {
    if (a.earned !== b.earned) return a.earned ? -1 : 1;
    return tierOrder[a.badge.tier] - tierOrder[b.badge.tier];
  });

  const progressPct = total > 0 ? Math.round((earned / total) * 100) : 0;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center sm:justify-center" onClick={onClose}>
        <div
          className="bg-white w-full rounded-t-3xl sm:rounded-3xl sm:max-w-md max-h-[88dvh] flex flex-col animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>

          {/* Header */}
          <div className="px-5 pt-3 pb-3 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <span>🏅</span> Badges
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-500">{earned}/{total}</span>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
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
                const catTotal = cat === "all" ? total : progress.filter((p) => p.badge.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      activeCategory === cat ? "bg-orange-100 text-orange-700" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
                    <span className="ml-1 opacity-60">{count}/{catTotal}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto px-4 pb-6">
            <div className="grid grid-cols-5 gap-2">
              {sorted.map((item) => (
                <BadgeTile key={item.badge.id} item={item} onClick={() => setSelectedBadge(item)} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedBadge && (
        <BadgeDetailModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
      )}
    </>
  );
}

// ─── Main card (compact 2-row preview) ────────────────────────────────────────
export default function BadgesCard() {
  const [progress, setProgress] = useState<BadgeProgress[]>([]);
  const [earned, setEarned] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<BadgeProgress | null>(null);
  useEffect(() => {
    async function fetchBadges() {
      try {
        const res = await fetch("/api/badges");
        if (!res.ok) return;
        const data = await res.json();
        const badgeProgress: BadgeProgress[] = data.progress || [];
        setProgress(badgeProgress);
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
        <div className="grid grid-cols-5 gap-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="w-full aspect-square bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Sort earned first, then by tier
  const tierOrder = { gold: 0, silver: 1, bronze: 2 };
  const sorted = [...progress].sort((a, b) => {
    if (a.earned !== b.earned) return a.earned ? -1 : 1;
    return tierOrder[a.badge.tier] - tierOrder[b.badge.tier];
  });

  // Show 2 rows of 5 = 10 badges in compact view
  const preview = sorted.slice(0, 10);
  const progressPct = total > 0 ? Math.round((earned / total) * 100) : 0;

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <span className="text-lg">🏅</span> Badges
            </h3>
            <span className="text-xs font-semibold text-gray-500">{earned}/{total}</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* 2-row compact grid */}
        <div className="px-4 pb-3">
          <div className="grid grid-cols-5 gap-2">
            {preview.map((item) => (
              <BadgeTile key={item.badge.id} item={item} onClick={() => setSelectedBadge(item)} />
            ))}
          </div>
        </div>

        {/* See all button */}
        <button
          onClick={() => setShowAll(true)}
          className="w-full py-3 border-t border-gray-100 text-sm font-semibold text-orange-600 hover:bg-orange-50 transition-colors flex items-center justify-center gap-1.5"
        >
          See all {total} badges
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* All badges modal */}
      {showAll && (
        <AllBadgesModal
          progress={progress}
          earned={earned}
          total={total}
          onClose={() => setShowAll(false)}
        />
      )}

      {/* Badge detail popup (from compact view) */}
      {selectedBadge && (
        <BadgeDetailModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
      )}

    </>
  );
}
