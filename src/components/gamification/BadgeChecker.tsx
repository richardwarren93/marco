"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/Toast";

const SEEN_KEY = "marco_seen_badges";

/**
 * Lightweight global badge checker. Mounts in the root layout and checks for
 * newly earned badges on mount and when the tab regains focus. Shows a toast
 * notification for each new badge rather than a full-screen modal.
 */
export default function BadgeChecker() {
  const { showToast } = useToast();
  const checking = useRef(false);

  async function checkBadges() {
    if (checking.current) return;
    checking.current = true;

    try {
      const res = await fetch("/api/badges");
      if (!res.ok) return;
      const data = await res.json();
      const progress: { badge: { id: string; name: string; icon: string; tier: string }; earned: boolean }[] =
        data.progress || [];
      const earnedBadges = progress.filter((p) => p.earned);
      if (earnedBadges.length === 0) return;

      let seen: string[] = [];
      try {
        seen = JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
      } catch {
        // localStorage unavailable
      }

      const newBadges = earnedBadges.filter((p) => !seen.includes(p.badge.id));

      // Show toast for each new badge (staggered)
      newBadges.forEach((p, i) => {
        setTimeout(() => {
          showToast(`${p.badge.icon} Badge Unlocked: ${p.badge.name}`, {
            variant: "badge",
            duration: 4000,
          });
        }, i * 1500);
      });

      // Update seen list
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify(earnedBadges.map((p) => p.badge.id)));
      } catch {
        // localStorage unavailable
      }
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

  return null; // Renders nothing — purely side-effect component
}
