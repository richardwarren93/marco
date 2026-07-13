"use client";

import { useState, useEffect } from "react";
import type { BadgeProgress, BadgeCategory } from "@/lib/badges";
import { TIER_COLORS, CATEGORY_LABELS } from "@/lib/badges";
// Celebration pieces (BadgeIcon, Confetti, Sparkles, AchievementModal) live in
// the shared celebrations module — BadgeChecker and the cook flow use them too.
import { BadgeIcon } from "./celebrations";

// ─── Rarity colors for earned badges — Marco palette ────────────────────────
// Bronze → tomato (primary punch) | Silver → teal (anchor) | Gold → mustard (energy)
const RARITY_STYLES: Record<
  string,
  { bgStyle: React.CSSProperties; borderStyle: React.CSSProperties; dotBg: string; dotMark: string }
> = {
  bronze: {
    bgStyle: { background: "rgba(229,70,46,0.06)" },
    borderStyle: { borderColor: "rgba(229,70,46,0.30)" },
    dotBg: "#E5462E",
    dotMark: "●",
  },
  silver: {
    bgStyle: { background: "rgba(15,76,92,0.06)" },
    borderStyle: { borderColor: "rgba(15,76,92,0.30)" },
    dotBg: "#0F4C5C",
    dotMark: "◆",
  },
  gold: {
    bgStyle: { background: "rgba(232,163,61,0.10)" },
    borderStyle: { borderColor: "rgba(232,163,61,0.45)" },
    dotBg: "#E8A33D",
    dotMark: "★",
  },
};

// ─── Badge tile — showcase size ───────────────────────────────────────────────
function BadgeTile({ item, onClick, size = "normal" }: { item: BadgeProgress; onClick: () => void; size?: "normal" | "small" }) {
  const pct = Math.min(100, Math.round((item.current / item.badge.threshold) * 100));
  const rarity = RARITY_STYLES[item.badge.tier];
  const iconSize = size === "small" ? "text-xl" : "text-2xl";

  return (
    <button
      onClick={onClick}
      className="relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-200 active:scale-90 hover:-translate-y-0.5"
      style={
        item.earned
          ? { ...rarity.bgStyle, ...rarity.borderStyle }
          : { background: "var(--cream-warm, #EFE5D2)", borderColor: "rgba(28,26,23,0.08)" }
      }
    >
      <BadgeIcon
        badge={item.badge}
        earned={item.earned}
        pixelSize={size === "small" ? 36 : 48}
        emojiClassName={iconSize}
      />

      {/* Badge name under icon for earned */}
      {item.earned && size === "normal" && (
        <span
          className="mt-0.5 px-1 truncate max-w-full"
          style={{
            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
            fontSize: "9px",
            fontWeight: 500,
            letterSpacing: "0.05em",
            color: "var(--ink-soft, #4A4742)",
            lineHeight: 1.2,
          }}
        >
          {item.badge.name}
        </span>
      )}

      {/* Progress for unearned */}
      {!item.earned && pct > 0 && (
        <div className="absolute bottom-1.5 inset-x-2">
          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "rgba(28,26,23,0.10)" }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--ink-soft, #4A4742)" }} />
          </div>
        </div>
      )}

      {/* Tier indicator — Marco palette dot */}
      {item.earned && (
        <div
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center"
          style={{ background: rarity.dotBg }}
        >
          <span className="text-[7px] text-white font-bold">{rarity.dotMark}</span>
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
          <BadgeIcon
            badge={badge.badge}
            earned={badge.earned}
            pixelSize={64}
            emojiClassName="text-4xl"
          />
        </div>

        <h3
          style={{
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 600',
            fontSize: "20px",
            letterSpacing: "-0.015em",
            color: badge.earned ? "var(--ink, #1C1A17)" : "var(--ink-soft, #4A4742)",
            opacity: badge.earned ? 1 : 0.6,
          }}
        >
          {badge.badge.name}
        </h3>

        <span
          className={`inline-block px-2 py-0.5 rounded-full mt-1 ${TIER_COLORS[badge.badge.tier].bg} ${TIER_COLORS[badge.badge.tier].text}`}
          style={{
            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          {badge.badge.tier}
        </span>

        <p className="text-sm mt-2" style={{ color: "var(--ink-soft, #4A4742)" }}>
          {badge.badge.description}
        </p>

        {!badge.earned && (
          <div className="mt-3">
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(28,26,23,0.08)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (badge.current / badge.badge.threshold) * 100)}%`,
                  background: "var(--tomato, #E5462E)",
                }}
              />
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--ink-soft, #4A4742)", opacity: 0.6 }}>
              {badge.current} / {badge.badge.threshold}
            </p>
          </div>
        )}

        {badge.earned && (
          <p className="text-xs font-medium mt-3 flex items-center justify-center gap-1" style={{ color: "var(--teal, #0F4C5C)" }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Earned
          </p>
        )}

        <button onClick={onClose} className="mt-4 text-sm text-gray-400 hover:text-gray-600 font-medium">
          Close
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
              <h2
                className="text-[20px]"
                style={{
                  fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
                  fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 600',
                  color: "var(--ink, #1C1A17)",
                  letterSpacing: "-0.015em",
                }}
              >
                Badges
              </h2>
              <div className="flex items-center gap-3">
                <span
                  style={{
                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                    fontSize: "12px",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    color: "var(--ink-soft, #4A4742)",
                  }}
                >
                  {earned}/{total}
                </span>
                <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--cream-warm, #EFE5D2)", color: "var(--ink-soft, #4A4742)" }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Progress bar — tomato fill */}
            <div className="w-full h-2 rounded-full overflow-hidden mb-3" style={{ background: "rgba(28,26,23,0.08)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, background: "var(--tomato, #E5462E)" }}
              />
            </div>

            {/* Category filter — Marco mono pills */}
            <div className="flex gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
              {categories.map((cat) => {
                const count = cat === "all"
                  ? progress.filter((p) => p.earned).length
                  : progress.filter((p) => p.badge.category === cat && p.earned).length;
                const catTotal = cat === "all" ? total : progress.filter((p) => p.badge.category === cat).length;
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="flex-shrink-0 px-2.5 py-1 rounded-lg transition-all"
                    style={{
                      fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                      fontSize: "10px",
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      background: isActive ? "var(--tomato, #E5462E)" : "var(--cream-warm, #EFE5D2)",
                      color: isActive ? "#fff" : "var(--ink-soft, #4A4742)",
                    }}
                  >
                    {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
                    <span className="ml-1 opacity-70">{count}/{catTotal}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto px-4 pb-6">
            <div className="grid grid-cols-4 gap-2.5">
              {sorted.map((item) => (
                <BadgeTile key={item.badge.id} item={item} onClick={() => setSelectedBadge(item)} size="small" />
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
    let cancelled = false;
    async function fetchBadges() {
      try {
        const res = await fetch("/api/badges");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        const badgeProgress: BadgeProgress[] = data.progress || [];
        setProgress(badgeProgress);
        setEarned(data.earned || 0);
        setTotal(data.total || 0);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchBadges();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5 animate-pulse" style={{ boxShadow: "0 2px 20px rgba(234,88,12,0.06)" }}>
        <div className="h-5 bg-gray-100 rounded w-28 mb-4" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="w-full aspect-square bg-gray-50 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // Sort earned first, then by tier (gold first)
  const tierOrder = { gold: 0, silver: 1, bronze: 2 };
  const sorted = [...progress].sort((a, b) => {
    if (a.earned !== b.earned) return a.earned ? -1 : 1;
    return tierOrder[a.badge.tier] - tierOrder[b.badge.tier];
  });

  // Show 3 rows of 4 = 12 badges — larger tiles to showcase art
  const preview = sorted.slice(0, 12);
  const progressPct = total > 0 ? Math.round((earned / total) * 100) : 0;

  return (
    <>
      <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 2px 20px rgba(229,70,46,0.06)" }}>
        {/* Header — Marco voice: Fraunces title, mono progress label */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-2">
            <h3
              className="text-[20px]"
              style={{
                fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
                fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 600',
                color: "var(--ink, #1C1A17)",
                letterSpacing: "-0.015em",
              }}
            >
              Badges
            </h3>
            <div
              className="px-2.5 py-1 rounded-full"
              style={{
                background: "var(--cream-warm, #EFE5D2)",
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                color: "var(--tomato, #E5462E)",
              }}
            >
              {earned}/{total}
            </div>
          </div>

          {/* Progress bar — solid tomato instead of orange→amber gradient */}
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(28,26,23,0.08)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%`, background: "var(--tomato, #E5462E)" }}
            />
          </div>
        </div>

        {/* Badge showcase — 4-column grid, larger tiles */}
        <div className="px-3.5 py-3">
          <div className="grid grid-cols-4 gap-2.5">
            {preview.map((item) => (
              <BadgeTile key={item.badge.id} item={item} onClick={() => setSelectedBadge(item)} />
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <div className="px-4 pb-4 pt-1">
          <button
            onClick={() => setShowAll(true)}
            className="w-full py-2.5 text-white text-sm font-medium rounded-xl transition-colors active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm hover:opacity-95"
            style={{ background: "var(--tomato, #E5462E)" }}
          >
            View all badges
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
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
