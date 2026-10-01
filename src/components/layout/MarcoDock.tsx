"use client";

// The Marco floating dock — the app's primary navigation (replaces the legacy
// BottomTabBar). Table · + · Kitchen · Explore, as a tactile object
// in Marco's visual world. Hidden on modal/creation flows and auth/onboarding.

import { usePathname, useRouter } from "next/navigation";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const MONO = "ui-monospace, monospace";

const TABS: { label: string; glyph: string; href: string; match: string[] }[] = [
  { label: "Table", glyph: "🍽️", href: "/friends-stack", match: ["/friends-stack", "/friends", "/crew", "/potluck"] },
  { label: "Kitchen", glyph: "🏠", href: "/kitchen", match: ["/kitchen", "/recipes", "/meal-plan", "/grocery"] },
  { label: "Explore", glyph: "✦", href: "/explore", match: ["/explore"] },
];

// Full-screen / modal flows where the dock should not show.
const HIDE_ON = ["/i-cooked", "/create", "/auth", "/connect", "/onboarding", "/login"];

export default function MarcoDock() {
  const pathname = usePathname() || "";
  const router = useRouter();
  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  const isActive = (t: (typeof TABS)[number]) => t.match.some((m) => pathname === m || pathname.startsWith(m + "/"));

  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 14px)", display: "flex", justifyContent: "center", zIndex: 50, pointerEvents: "none" }}>
      <div className="flex items-center" style={{ gap: 4, background: PAPER, border: `2.5px solid ${INK}`, borderRadius: 99, padding: "7px 9px", boxShadow: "0 12px 30px rgba(23,20,16,0.28)", pointerEvents: "auto" }}>
        <Tab t={TABS[0]} active={isActive(TABS[0])} onClick={() => router.push(TABS[0].href)} />
        <button aria-label="Create" onClick={() => router.push("/create")} className="flex items-center justify-center active:scale-95 transition-transform" style={{ width: 54, height: 54, borderRadius: 99, background: TOMATO, color: PAPER, border: `2.5px solid ${INK}`, fontSize: 28, fontWeight: 700, transform: "translateY(-12px) rotate(-4deg)", boxShadow: "0 8px 18px rgba(229,70,46,0.45)" }}>+</button>
        <Tab t={TABS[1]} active={isActive(TABS[1])} onClick={() => router.push(TABS[1].href)} />
        <Tab t={TABS[2]} active={isActive(TABS[2])} onClick={() => router.push(TABS[2].href)} />
      </div>
    </div>
  );
}

function Tab({ t, active, onClick }: { t: { label: string; glyph: string }; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center active:scale-95 transition-transform" style={{ width: 52, height: 44, borderRadius: 16, background: active ? INK : "transparent", border: "none" }}>
      <span style={{ fontSize: 17, filter: active ? "none" : "grayscale(0.45)" }} aria-hidden>{t.glyph}</span>
      <span style={{ fontFamily: MONO, fontSize: 8.5, color: active ? PAPER : INK, marginTop: 1 }}>{t.label}</span>
    </button>
  );
}
