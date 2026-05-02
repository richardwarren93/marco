"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { BadgeProgress, BadgeCategory } from "@/lib/badges";
import { TIER_COLORS, CATEGORY_LABELS } from "@/lib/badges";

/** Renders the badge artwork — either the hand-drawn imageUrl when present,
 *  or the legacy emoji glyph as a fallback. The grayscale/opacity treatment
 *  for unearned badges is shared. */
function BadgeIcon({
  badge,
  earned,
  pixelSize,
  emojiClassName,
}: {
  badge: BadgeProgress["badge"];
  earned: boolean;
  pixelSize: number;
  emojiClassName: string;
}) {
  if (badge.imageUrl) {
    return (
      <Image
        src={badge.imageUrl}
        alt={badge.name}
        width={pixelSize}
        height={pixelSize}
        className={`object-contain transition-transform duration-200 ${earned ? "" : "grayscale opacity-25"}`}
      />
    );
  }
  return (
    <span className={`${emojiClassName} transition-transform duration-200 ${earned ? "" : "grayscale opacity-20"}`}>
      {badge.icon}
    </span>
  );
}

// ─── Sparkles that radiate outward from the badge ────────────────────────────
function Sparkles({ tier }: { tier: string }) {
  // Marco palette: gold→mustard, silver→teal, bronze→tomato
  const color = tier === "gold" ? "#E8A33D" : tier === "silver" ? "#0F4C5C" : "#E5462E";
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
  // Marco palette confetti: tomato, mustard, teal, cream variations
  const colors = ["#E5462E", "#E8A33D", "#F2C77A", "#0F4C5C", "#1C1A17", "#EFE5D2"];
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

// ─── Achievement celebration modal ─────────────────────────────────────────────
function AchievementModal({ badge, onClose }: { badge: BadgeProgress; onClose: () => void }) {
  const colors = TIER_COLORS[badge.badge.tier];
  // Marco palette glow: gold→mustard, silver→teal, bronze→tomato
  const glowColor =
    badge.badge.tier === "gold"   ? "rgba(232,163,61,0.55)"
    : badge.badge.tier === "silver" ? "rgba(15,76,92,0.40)"
    : "rgba(229,70,46,0.50)";
  const tierMark = badge.badge.tier === "gold" ? "★" : badge.badge.tier === "silver" ? "◆" : "●";

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

        {/* "Badge Unlocked" label — Marco mono uppercase tracked */}
        <p
          className="mb-5"
          style={{
            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
            fontSize: "11px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: "var(--ink-soft, #4A4742)",
          }}
        >
          Badge unlocked
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
            <BadgeIcon
              badge={badge.badge}
              earned={true}
              pixelSize={80}
              emojiClassName="text-5xl drop-shadow-md"
            />
          </div>

          {/* Tier dot — Marco palette */}
          <div
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full border-2 border-white flex items-center justify-center shadow-md"
            style={{
              background:
                badge.badge.tier === "gold" ? "#E8A33D"
                : badge.badge.tier === "silver" ? "#0F4C5C"
                : "#E5462E",
            }}
          >
            <span className="text-[11px] font-black text-white">{tierMark}</span>
          </div>
        </div>

        {/* Badge name — Fraunces display */}
        <h2
          className="leading-tight"
          style={{
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 600',
            fontSize: "24px",
            letterSpacing: "-0.02em",
            color: "var(--ink, #1C1A17)",
          }}
        >
          {badge.badge.name}
        </h2>

        {/* Tier label — Marco mono uppercase tracked */}
        <span
          className={`inline-block mt-1.5 px-3 py-0.5 rounded-full ${colors.bg} ${colors.text}`}
          style={{
            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          {badge.badge.tier} tier
        </span>

        {/* Description */}
        <p className="text-sm mt-3 leading-snug" style={{ color: "var(--ink-soft, #4A4742)" }}>
          {badge.badge.description}
        </p>

        {/* CTA — solid tomato (gold gets mustard, silver gets teal) */}
        <button
          onClick={onClose}
          className="mt-5 w-full font-medium py-3.5 rounded-2xl transition-all text-sm active:scale-95 text-white shadow-lg hover:opacity-95"
          style={{
            background:
              badge.badge.tier === "gold" ? "var(--mustard, #E8A33D)"
              : badge.badge.tier === "silver" ? "var(--teal, #0F4C5C)"
              : "var(--tomato, #E5462E)",
          }}
        >
          Nice
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
