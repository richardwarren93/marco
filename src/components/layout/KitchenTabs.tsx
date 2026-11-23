"use client";

/* The Kitchen layer's four surfaces, in one control.
 *
 * This used to be a hand-rolled row inside /kitchen whose first segment
 * ("Recipes") was a dead <span> styled as the active tab — on a page that
 * isn't the recipes list. Meanwhile Discover was only reachable through a tab
 * bar nothing rendered. Now every surface shows the same control with its own
 * segment lit, so the four screens read as one place.
 *
 * The lit segment is the dock's marker, not a second invention: the same lime
 * sticker, the same ink edge and hard shadow, the same -2° tilt, the same
 * spring. It SLIDES between segments, so moving across the four surfaces
 * feels like moving across Kitchen and Table.
 *
 * One difference from the dock, and it is deliberate. The dock lives in the
 * chrome and never unmounts, so its sticker can follow `pathname`. These four
 * tabs are rendered by each of the five pages, so the instance you tapped is
 * torn down before the next route paints — a sticker driven by `pathname`
 * alone would have nothing to slide FROM. The tapped tab is therefore held in
 * state and leads the route: the sticker moves the moment you touch it, and
 * the next page renders it already parked there. */

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { SPRING_STICKER } from "@/lib/motion";
import { INK, LIME, PAPER } from "@/lib/theme";


const TABS = [
  { href: "/recipes", label: "Recipes", guide: "tab-recipes" },
  { href: "/discover", label: "Discover", guide: "tab-discover" },
  { href: "/meal-plan", label: "Meal plan", guide: "tab-mealplan" },
  { href: "/grocery", label: "Groceries", guide: "tab-groceries" },
];

export default function KitchenTabs() {
  const pathname = usePathname() || "";
  // The tab you just tapped, and the route you tapped it FROM. Recording
  // where you came from is what lets this expire itself: the moment the
  // pathname is no longer the one you left, the tap is spent and the sticker
  // goes back to following the route. A back swipe or a redirect that lands
  // somewhere else therefore can't leave it parked on a tab you're not on.
  const [pending, setPending] = useState<{ href: string; from: string } | null>(null);

  const lit = pending && pending.from === pathname ? pending.href : pathname;

  return (
    <nav
      aria-label="Kitchen"
      className="flex mx-auto w-full max-w-lg"
      style={{ marginTop: 14, background: PAPER, border: `2.5px solid ${INK}`, borderRadius: 14, padding: 4, gap: 4, boxShadow: `3px 3px 0 ${INK}` }}
    >
      {TABS.map((t) => {
        const active = lit === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            data-guide={t.guide}
            aria-current={pathname === t.href ? "page" : undefined}
            onClick={() => setPending({ href: t.href, from: pathname })}
            className="relative flex-1 text-center active:scale-95 transition-transform"
            style={{
              color: INK,
              fontFamily: "var(--font-chaos)",
              fontWeight: 700,
              fontSize: 13.5,
              padding: "10px 0",
              borderRadius: 10,
              textDecoration: "none",
            }}
          >
            {active && (
              <motion.span
                layoutId="kitchen-tab-sticker"
                transition={SPRING_STICKER}
                aria-hidden
                style={{ position: "absolute", inset: 0, background: LIME, border: `2px solid ${INK}`, borderRadius: 10, boxShadow: `2px 2px 0 ${INK}`, rotate: -2 }}
              />
            )}
            <span className="relative" style={{ opacity: active ? 1 : 0.7 }}>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
