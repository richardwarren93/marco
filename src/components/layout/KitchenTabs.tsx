"use client";

/* The Kitchen layer's four surfaces, in one control.
 *
 * This used to be a hand-rolled row inside /kitchen whose first segment
 * ("Recipes") was a dead <span> styled as the active tab — on a page that
 * isn't the recipes list. Meanwhile Discover was only reachable through a tab
 * bar nothing rendered. Now every surface shows the same control with its own
 * segment lit, so the four screens read as one place. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { INK, PAPER } from "@/lib/theme";


const TABS = [
  { href: "/recipes", label: "Recipes", guide: "tab-recipes" },
  { href: "/discover", label: "Discover", guide: "tab-discover" },
  { href: "/meal-plan", label: "Meal plan", guide: "tab-mealplan" },
  { href: "/grocery", label: "Groceries", guide: "tab-groceries" },
];

export default function KitchenTabs() {
  const pathname = usePathname() || "";

  return (
    <nav
      aria-label="Kitchen"
      className="flex mx-auto w-full max-w-lg"
      style={{ marginTop: 14, background: PAPER, border: `2.5px solid ${INK}`, borderRadius: 14, padding: 4, gap: 4, boxShadow: "0 5px 12px rgba(23,20,16,0.1)" }}
    >
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            data-guide={t.guide}
            aria-current={active ? "page" : undefined}
            className="flex-1 text-center active:scale-95 transition-transform"
            style={{
              background: active ? INK : "transparent",
              color: active ? PAPER : INK,
              fontFamily: "var(--font-chaos)",
              fontWeight: 700,
              fontSize: 13.5,
              padding: "10px 0",
              borderRadius: 10,
              textDecoration: "none",
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
