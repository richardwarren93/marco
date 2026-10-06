"use client";

// Finishes invites someone tapped while signed out. The join pages stash the
// code (stashInvite) and send them off to sign up / sign in. Once a session
// exists:
//   marco_pending_crew  → seat them at that Table, quietly (no navigation).
//   marco_pending_house → NOT joined silently: a household shares your
//                         kitchen, plan and groceries, so we show a banner
//                         that takes them back to the invite to confirm.
// Invites older than a week are dropped, so a stale one never applies to
// whoever signs in next on this device.

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { mutate } from "swr";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getCrewByCode, joinCrewByCode } from "@/lib/social";

export const PENDING_CREW_KEY = "marco_pending_crew";
export const PENDING_HOUSE_KEY = "marco_pending_house";
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const INK = "#171410";
const PAPER = "#FBF7EE";
const LIME = "#C4EE45";
const DISP = '"Marker Felt", Georgia, serif';

export function stashInvite(key: string, code: string) {
  try { localStorage.setItem(key, code); localStorage.setItem(`${key}:at`, String(Date.now())); } catch { /* ignore */ }
}
function drop(key: string) {
  try { localStorage.removeItem(key); localStorage.removeItem(`${key}:at`); } catch { /* ignore */ }
}
// A fresh pending code, or null. Codes stashed before timestamps existed count
// as fresh once (and get stamped now).
function read(key: string): string | null {
  try {
    const code = localStorage.getItem(key);
    if (!code) return null;
    const at = Number(localStorage.getItem(`${key}:at`));
    if (!at) { localStorage.setItem(`${key}:at`, String(Date.now())); return code; }
    if (Date.now() - at > MAX_AGE) { drop(key); return null; }
    return code;
  } catch { return null; }
}

async function finishCrew(): Promise<boolean> {
  const code = read(PENDING_CREW_KEY);
  if (!code) return false;
  // A code that no longer matches a table never will — stop retrying it.
  const crew = await getCrewByCode(code).catch(() => undefined);
  if (crew === null) { drop(PENDING_CREW_KEY); return false; }
  if (!crew) return false;
  const joined = await joinCrewByCode(code).catch(() => null);
  if (joined) { drop(PENDING_CREW_KEY); return true; }
  return false;
}

// One run at a time across the app (mount + auth events can land together, and
// dev StrictMode mounts twice). A trigger that arrives mid-run gets one re-run.
let running = false;
let again = false;
async function drain() {
  if (running) { again = true; return; }
  running = true;
  try {
    let joined = false;
    do { again = false; joined = (await finishCrew()) || joined; } while (again);
    // Whatever's on screen (kitchen, tables) picks up the new seat.
    if (joined) void mutate(() => true);
  } finally {
    running = false;
  }
}

const QUIET = ["/join", "/auth", "/onboarding"];

export default function PendingInvites() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  const [house, setHouse] = useState<string | null>(null);

  useEffect(() => {
    // INITIAL_SESSION fires on subscribe, so this also covers mount. Defer out
    // of the callback: calling Supabase auth from inside it can deadlock.
    const { data: { subscription } } = createClient().auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      setSignedIn(!!session);
      if (!session || (event !== "INITIAL_SESSION" && event !== "SIGNED_IN")) return;
      if (read(PENDING_CREW_KEY)) setTimeout(() => { void drain(); }, 0);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Re-check the household invite on every page change (the join page clears
  // it once they've decided).
  useEffect(() => {
    const t = setTimeout(() => setHouse(signedIn ? read(PENDING_HOUSE_KEY) : null), 0);
    return () => clearTimeout(t);
  }, [signedIn, pathname]);

  if (!signedIn || !house || QUIET.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  return (
    <div role="region" aria-label="Household invite" className="fixed left-0 right-0 flex justify-center" style={{ top: "calc(env(safe-area-inset-top,0px) + 8px)", zIndex: 90, padding: "0 12px", pointerEvents: "none" }}>
      <div className="flex w-full items-center gap-2" style={{ maxWidth: 440, background: LIME, border: `2.5px solid ${INK}`, borderRadius: 16, padding: "8px 8px 8px 14px", boxShadow: `3px 4px 0 ${INK}`, pointerEvents: "auto" }}>
        <span aria-hidden style={{ fontSize: 18 }}>🏠</span>
        <span className="min-w-0 flex-1" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 15, color: INK, lineHeight: 1.15 }}>You&apos;re invited to a household kitchen</span>
        <button onClick={() => router.push(`/join/house/${encodeURIComponent(house)}`)} className="active:scale-95 transition-transform" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: PAPER, background: INK, border: `2px solid ${INK}`, borderRadius: 11, padding: "0 14px", minHeight: 44 }}>See it</button>
        <button onClick={() => { drop(PENDING_HOUSE_KEY); setHouse(null); }} aria-label="Dismiss invite" className="active:scale-95 transition-transform" style={{ fontSize: 18, color: INK, background: "none", border: "none", minWidth: 44, minHeight: 44 }}>✕</button>
      </div>
    </div>
  );
}
