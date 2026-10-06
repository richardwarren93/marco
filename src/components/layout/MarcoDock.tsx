"use client";

// The Marco dock — the app's primary navigation: Kitchen · + · Table.
// Every destination is labelled; the active tab wears a lime sticker (the
// brand's "you are here") that SLIDES between tabs, and + is a raised tomato
// button that squashes when pressed. Ink borders and
// a hard offset shadow, like everything else that's paper in Marco. Hidden on
// modal/creation flows and auth/onboarding.

import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { SPRING_STICKER, PRESS } from "@/lib/motion";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const LIME = "#C4EE45";
const DISP = '"Marker Felt", Georgia, serif';

type TabDef = { label: string; href: string; match: string[]; guide: string; icon: (c: string) => React.ReactNode };

const HouseIcon = (c: string) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3.5 11 12 4l8.5 7" /><path d="M6 9.6V20h12V9.6" /><path d="M10 20v-5.2h4V20" />
  </svg>
);
// Two people at a table — reads as "your people", not furniture.
const TableIcon = (c: string) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="7.5" cy="6.6" r="2.4" /><circle cx="16.5" cy="6.6" r="2.4" />
    <path d="M3 13h18" /><path d="M6 13v7" /><path d="M18 13v7" /><path d="M4.6 12.9c.4-1.9 1.6-3 2.9-3s2.5 1.1 2.9 3" /><path d="M13.6 12.9c.4-1.9 1.6-3 2.9-3s2.5 1.1 2.9 3" />
  </svg>
);

const TABS: TabDef[] = [
  { label: "Kitchen", href: "/kitchen", match: ["/kitchen", "/recipes", "/meal-plan", "/grocery"], guide: "tab-kitchen", icon: HouseIcon },
  { label: "Table", href: "/friends-stack", match: ["/friends-stack", "/friends", "/crew", "/potluck"], guide: "tab-table", icon: TableIcon },
];

// Full-screen / modal flows where the dock should not show. "/recipes/new" is a
// focused commit flow (importing / editing a recipe) — no tabbing away from a
// freshly-extracted recipe before it's saved.
const HIDE_ON = ["/i-cooked", "/create", "/auth", "/connect", "/onboarding", "/login", "/recipes/new", "/join"];

export default function MarcoDock() {
  const pathname = usePathname() || "";
  const router = useRouter();
  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  const isActive = (t: TabDef) => t.match.some((m) => pathname === m || pathname.startsWith(m + "/"));

  return (
    <motion.nav layoutRoot aria-label="Main" style={{ position: "fixed", left: 0, right: 0, bottom: 0, paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 12px)", display: "flex", justifyContent: "center", zIndex: 50, pointerEvents: "none" }}>
      <div className="grid items-end" style={{ gridTemplateColumns: "1fr 1fr 1fr", width: "min(340px, calc(100vw - 32px))", background: PAPER, border: `2.5px solid ${INK}`, borderRadius: 22, padding: "6px 8px 7px", boxShadow: `4px 5px 0 ${INK}`, pointerEvents: "auto" }}>
        <Tab t={TABS[0]} active={isActive(TABS[0])} onClick={() => router.push(TABS[0].href)} />
        <motion.button data-guide="create" aria-label="Add" onClick={() => router.push("/create")} whileTap={PRESS} transition={SPRING_STICKER} className="flex flex-col items-center" style={{ background: "none", border: "none", padding: 0, marginTop: -22, marginBottom: 6, justifySelf: "center", alignSelf: "center" }}>
          <span className="flex items-center justify-center" style={{ width: 54, height: 54, borderRadius: 99, background: TOMATO, color: PAPER, border: `2.5px solid ${INK}`, boxShadow: `3px 4px 0 ${INK}`, fontFamily: DISP, fontWeight: 700, fontSize: 30, lineHeight: 1 }} aria-hidden>+</span>
        </motion.button>
        <Tab t={TABS[1]} active={isActive(TABS[1])} onClick={() => router.push(TABS[1].href)} />
      </div>
    </motion.nav>
  );
}

function Tab({ t, active, onClick }: { t: TabDef; active: boolean; onClick: () => void }) {
  return (
    <motion.button onClick={onClick} data-guide={t.guide} aria-label={t.label} aria-current={active ? "page" : undefined} whileTap={PRESS} transition={SPRING_STICKER} className="relative flex flex-col items-center justify-center" style={{ justifySelf: "center", minWidth: 76, minHeight: 50, padding: "5px 10px 4px", borderRadius: 14, background: "transparent", border: "none" }}>
      {active && (
        <motion.span layoutId="dock-you-are-here" transition={SPRING_STICKER} aria-hidden style={{ position: "absolute", inset: 0, background: LIME, border: `2px solid ${INK}`, borderRadius: 14, boxShadow: `2px 2px 0 ${INK}`, rotate: -2 }} />
      )}
      <span className="relative flex flex-col items-center">
        {t.icon(INK)}
        <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 12, color: INK, marginTop: 1, opacity: active ? 1 : 0.7 }}>{t.label}</span>
      </span>
    </motion.button>
  );
}
