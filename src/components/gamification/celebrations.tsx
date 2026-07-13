"use client";

// Shared celebration layer — Confetti, Sparkles, BadgeIcon, and the celebration
// modals live here so BadgesCard, BadgeChecker, and the cook flow all draw from
// one source. Everything respects prefers-reduced-motion via the exported hook.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import type { BadgeProgress } from "@/lib/badges";
import { TIER_COLORS } from "@/lib/badges";
import type { TomatoHealthState } from "@/lib/gamification";
import TomatoMascot from "./TomatoMascot";

/** True when the user asks for reduced motion — gate confetti/sparkles/float-ups. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Renders the badge artwork — either the hand-drawn imageUrl when present,
 *  or the legacy emoji glyph as a fallback. The grayscale/opacity treatment
 *  for unearned badges is shared. If the image fails to load (flaky mobile
 *  connections leave a permanent broken-image icon in WKWebView), fall back
 *  to the emoji instead. */
export function BadgeIcon({
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
  const [imageFailed, setImageFailed] = useState(false);

  if (badge.imageUrl && !imageFailed) {
    return (
      <Image
        src={badge.imageUrl}
        alt={badge.name}
        width={pixelSize}
        height={pixelSize}
        unoptimized={badge.imageUrl.endsWith(".svg")}
        onError={() => setImageFailed(true)}
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
export function Sparkles({ tier }: { tier: string }) {
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
export function Confetti({ className = "rounded-3xl" }: { className?: string }) {
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
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
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

// ─── Cook celebration — milestone moments only ───────────────────────────────
// Shown after a confirmed cook that completes the weekly goal or hits a streak
// milestone. Rendered via a body portal so it can be invoked from inside
// transformed sheets (RecipePreviewSheet) without fixed-position clipping.
export interface CookCelebrationProps {
  earned: number;
  goalJustCompleted: boolean;
  weekProgress: number;
  weeklyTarget: number | null;
  streak?: number;
  mascotState?: TomatoHealthState;
  onClose: () => void;
}

export function CookCelebration({
  earned,
  goalJustCompleted,
  weekProgress,
  weeklyTarget,
  streak,
  mascotState,
  onClose,
}: CookCelebrationProps) {
  const reduced = usePrefersReducedMotion();
  // The newest goal dot "ticks" in shortly after the card lands.
  const [ticked, setTicked] = useState(reduced);

  useEffect(() => {
    if (reduced) return;
    const t = setTimeout(() => setTicked(true), 350);
    return () => clearTimeout(t);
  }, [reduced]);

  useEffect(() => {
    const t = setTimeout(onClose, goalJustCompleted ? 3500 : 2500);
    return () => clearTimeout(t);
  }, [goalJustCompleted, onClose]);

  if (typeof document === "undefined") return null;

  const state: TomatoHealthState = mascotState ?? ((streak ?? 0) >= 5 ? "thriving" : "happy");
  const title = goalJustCompleted
    ? "Goal complete!"
    : streak && streak >= 2
      ? `${streak}-day streak!`
      : "Cooked!";

  return createPortal(
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center px-8"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
      role="status"
    >
      <div
        className="relative bg-white rounded-3xl pt-6 pb-5 px-6 w-full max-w-[280px] text-center overflow-hidden"
        style={reduced ? undefined : { animation: "pop-in 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
      >
        {goalJustCompleted && !reduced && <Confetti />}

        {/* Mascot */}
        <div className={`relative inline-flex justify-center ${reduced ? "" : "animate-bounce-in"}`}>
          <TomatoMascot size={96} state={state} greeting={goalJustCompleted} />
          {/* Floating +N */}
          {!reduced && (
            <span
              className="absolute -top-1 left-1/2 -translate-x-1/2 animate-float-up pointer-events-none"
              style={{
                fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
                fontVariationSettings: '"opsz" 40, "SOFT" 100, "wght" 700',
                fontSize: "22px",
                color: "var(--tomato, #E5462E)",
              }}
            >
              +{earned} 🍅
            </span>
          )}
        </div>

        {/* Title */}
        <h2
          className="mt-1 leading-tight"
          style={{
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 600',
            fontSize: "23px",
            letterSpacing: "-0.02em",
            color: "var(--ink, #1C1A17)",
          }}
        >
          {goalJustCompleted ? title : `🔥 ${title}`}
        </h2>

        {/* Earned line (persists after the float-up) */}
        <p className="mt-1 text-[14px] font-bold" style={{ color: "var(--tomato, #E5462E)" }}>
          +{earned} 🍅 earned
        </p>

        {/* Weekly goal dots */}
        {weeklyTarget != null && weeklyTarget > 0 && (
          <div className="mt-3.5">
            <div className="flex items-center justify-center gap-1.5">
              {Array.from({ length: weeklyTarget }, (_, i) => {
                const isNewest = i === weekProgress - 1;
                const filled = i < weekProgress - 1 || (isNewest && ticked);
                return (
                  <span
                    key={i}
                    className="rounded-full"
                    style={{
                      width: 12,
                      height: 12,
                      background: filled ? "var(--tomato, #E5462E)" : "rgba(28,26,23,0.1)",
                      transform: isNewest && ticked && !reduced ? "scale(1.15)" : "scale(1)",
                      transition: "background 0.2s ease, transform 0.2s ease",
                    }}
                  />
                );
              })}
            </div>
            <p
              className="mt-1.5"
              style={{
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--ink-soft, #4A4742)",
              }}
            >
              {Math.min(weekProgress, weeklyTarget)}/{weeklyTarget} this week
            </p>
          </div>
        )}

        {/* Goal bonus pill */}
        {goalJustCompleted && (
          <span
            className="inline-block mt-3 px-3.5 py-1.5 rounded-full text-white text-[12px] font-bold"
            style={{ background: "var(--mustard, #E8A33D)" }}
          >
            Weekly goal — +25 bonus!
          </span>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ─── Badge-unlock celebration modal ──────────────────────────────────────────
export function AchievementModal({ badge, onClose }: { badge: BadgeProgress; onClose: () => void }) {
  const reduced = usePrefersReducedMotion();
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
        style={reduced ? undefined : { animation: "pop-in 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Confetti rain */}
        {!reduced && <Confetti />}

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
            className={`absolute w-36 h-36 rounded-full ${reduced ? "" : "animate-badge-glow"}`}
            style={{ background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)` }}
          />

          {/* Sparkles */}
          {!reduced && (
            <div className="absolute w-36 h-36 flex items-center justify-center">
              <Sparkles tier={badge.badge.tier} />
            </div>
          )}

          {/* Badge itself */}
          <div
            className={`relative w-28 h-28 rounded-[28px] border-4 flex items-center justify-center shadow-2xl ${reduced ? "" : "animate-badge-zoom"} ${colors.bg} ${colors.border}`}
          >
            {/* Shine sweep */}
            {!reduced && (
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
            )}
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
