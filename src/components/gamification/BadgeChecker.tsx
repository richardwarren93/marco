"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { AchievementModal } from "./celebrations";
import type { BadgeProgress } from "@/lib/badges";

const SEEN_KEY = "marco_seen_badges";
// Full celebration modals for up to this many new badges at once; anything
// beyond (e.g. a lapsed user returning to a pile) falls back to toasts so we
// never chain a wall of takeovers.
const MAX_MODALS = 3;

/**
 * Lightweight global badge checker. Mounts in the root layout and checks for
 * newly earned badges on mount and when the tab regains focus. New badges get
 * the full confetti AchievementModal (sequentially, one at a time); overflow
 * beyond MAX_MODALS gets the staggered toast treatment.
 */
export default function BadgeChecker() {
  const { showToast } = useToast();
  const checking = useRef(false);
  const [modalQueue, setModalQueue] = useState<BadgeProgress[]>([]);

  async function checkBadges() {
    if (checking.current) return;

    // Don't check badges on landing/onboarding pages (user may not be logged in)
    const path = window.location.pathname;
    if (path === "/" || path.startsWith("/onboarding") || path.startsWith("/auth")) return;

    checking.current = true;

    try {
      const res = await fetch("/api/badges");
      if (!res.ok) return;
      const data = await res.json();
      const progress: BadgeProgress[] = data.progress || [];
      const earnedBadges = progress.filter((p) => p.earned);
      if (earnedBadges.length === 0) return;

      let seen: string[] = [];
      try {
        seen = JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
      } catch {
        // localStorage unavailable
      }

      const newBadges = earnedBadges.filter((p) => !seen.includes(p.badge.id));

      // Mark ALL new badges seen up front so a refocus while a modal is open
      // can't re-enqueue the same unlocks.
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify(earnedBadges.map((p) => p.badge.id)));
      } catch {
        // localStorage unavailable
      }

      if (newBadges.length === 0) return;

      // First few get the full confetti modal, shown one at a time.
      setModalQueue((q) => [...q, ...newBadges.slice(0, MAX_MODALS)]);

      // Overflow keeps the old staggered toast treatment.
      newBadges.slice(MAX_MODALS).forEach((p, i) => {
        setTimeout(() => {
          showToast(`${p.badge.icon} Badge Unlocked: ${p.badge.name}`, {
            variant: "badge",
            duration: 4000,
          });
        }, i * 1500);
      });
    } catch {
      // Silently fail — badge check is non-critical
    } finally {
      checking.current = false;
    }
  }

  useEffect(() => {
    // Check on mount (slight delay to not block initial paint)
    const t = setTimeout(checkBadges, 2000);

    // Re-check when tab regains focus
    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        checkBadges();
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearTimeout(t);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sequential celebration: show the head of the queue; closing advances it.
  if (modalQueue.length === 0) return null;
  return (
    <AchievementModal
      badge={modalQueue[0]}
      onClose={() => setModalQueue((q) => q.slice(1))}
    />
  );
}
