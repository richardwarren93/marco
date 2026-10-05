"use client";

// The Marco dock — the app's primary navigation: My Kitchen · + · Table.
// Clean line icons on an ink-bordered paper pill (no emoji/labels — the
// colour + personality lives in the surfaces, not the chrome). Hidden on
// modal/creation flows and auth/onboarding.

import { usePathname, useRouter } from "next/navigation";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";

type TabDef = { label: string; href: string; match: string[]; icon: (c: string) => React.ReactNode };

const HouseIcon = (c: string) => (
  <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3.5 10.5 12 3.5l8.5 7" /><path d="M5.5 9.3V20.3h13V9.3" /></svg>
);
const TableIcon = (c: string) => (
  <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3.5 10.5h17" /><path d="M6 10.5v8" /><path d="M18 10.5v8" /><path d="M9.2 10.5c0-1.5 1.2-2.6 2.8-2.6s2.8 1.1 2.8 2.6" /></svg>
);

const TABS: TabDef[] = [
  { label: "My Kitchen", href: "/kitchen", match: ["/kitchen", "/recipes", "/meal-plan", "/grocery"], icon: HouseIcon },
  { label: "Table", href: "/friends-stack", match: ["/friends-stack", "/friends", "/crew", "/potluck"], icon: TableIcon },
];

// Full-screen / modal flows where the dock should not show.
const HIDE_ON = ["/i-cooked", "/create", "/auth", "/connect", "/onboarding", "/login"];

export default function MarcoDock() {
  const pathname = usePathname() || "";
  const router = useRouter();
  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  const isActive = (t: TabDef) => t.match.some((m) => pathname === m || pathname.startsWith(m + "/"));

  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 14px)", display: "flex", justifyContent: "center", zIndex: 50, pointerEvents: "none" }}>
      <div className="flex items-center" style={{ gap: 8, background: PAPER, border: `2.5px solid ${INK}`, borderRadius: 99, padding: "7px 10px", boxShadow: "0 12px 30px rgba(23,20,16,0.26)", pointerEvents: "auto" }}>
        <Tab t={TABS[0]} active={isActive(TABS[0])} onClick={() => router.push(TABS[0].href)} />
        <button aria-label="Create" onClick={() => router.push("/create")} className="flex items-center justify-center active:scale-95 transition-transform" style={{ width: 46, height: 46, borderRadius: 99, background: TOMATO, color: PAPER, border: `2.5px solid ${INK}`, fontSize: 25, fontWeight: 700, lineHeight: 1, boxShadow: "0 6px 14px rgba(229,70,46,0.4)" }}>+</button>
        <Tab t={TABS[1]} active={isActive(TABS[1])} onClick={() => router.push(TABS[1].href)} />
      </div>
    </div>
  );
}

function Tab({ t, active, onClick }: { t: TabDef; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label={t.label} aria-current={active ? "page" : undefined} className="flex items-center justify-center active:scale-95 transition-transform" style={{ width: 50, height: 42, borderRadius: 14, background: active ? INK : "transparent", border: "none" }}>
      {t.icon(active ? PAPER : INK)}
    </button>
  );
}
