"use client";

// Household invite deep-link. Someone shares marco…/join/house/<code> (the
// household group chat's seed carries one). Joining a household shares your
// kitchen, meal plan and groceries, so it always takes a tap: we show whose
// kitchen it is, then "Join". Signed out → stash the code, send them to sign
// in, and PendingInvites brings them back here to confirm.
// The ?m= token on the link is for Marco in the group chat — ignored here.

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { stashInvite, PENDING_HOUSE_KEY } from "@/components/people/PendingInvites";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const LIME = "#C4EE45";
const DISP = '"Marker Felt", Georgia, serif';
const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
const SANS = "system-ui, -apple-system, sans-serif";

// Accepts "HOUSE-ABCD" or just "abcd" (same alphabet as the household codes).
const CODE = /^(?:HOUSE-)?[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;
type State = "loading" | "need-auth" | "confirm" | "joining" | "already" | "not-found" | "error";

export default function JoinHousehold() {
  const params = useParams();
  const router = useRouter();
  const code = String(params?.code ?? "").trim().toUpperCase();
  const valid = CODE.test(code);
  const full = code.startsWith("HOUSE-") ? code : `HOUSE-${code}`;
  const [state, setState] = useState<State>(valid ? "loading" : "not-found");
  const [house, setHouse] = useState<{ name: string; members: number } | null>(null);

  const drop = () => { try { localStorage.removeItem(PENDING_HOUSE_KEY); localStorage.removeItem(`${PENDING_HOUSE_KEY}:at`); } catch { /* ignore */ } };

  const load = useCallback(async () => {
    const { data: { user } } = await createClient().auth.getUser();
    if (!user) { stashInvite(PENDING_HOUSE_KEY, full); setState("need-auth"); return; }
    try {
      const res = await fetch(`/api/household/join?code=${encodeURIComponent(full)}`, { cache: "no-store" });
      if (res.status === 401) { stashInvite(PENDING_HOUSE_KEY, full); setState("need-auth"); return; }
      if (res.status === 404 || res.status === 400) { drop(); setState("not-found"); return; }
      if (!res.ok) { setState("error"); return; }
      const v = await res.json();
      if (v.mine) { drop(); router.replace("/kitchen"); return; }
      setHouse({ name: String(v.name || "A household"), members: Number(v.members) || 0 });
      setState("confirm");
    } catch { setState("error"); }
  }, [full, router]);

  useEffect(() => {
    if (!valid) return;
    const t = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(t);
  }, [valid, load]);

  async function join() {
    setState("joining");
    try {
      const res = await fetch("/api/household/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invite_code: full }) });
      const body = await res.json().catch(() => ({}));
      if (res.ok) { drop(); router.replace("/kitchen"); return; }
      if (res.status === 401) { stashInvite(PENDING_HOUSE_KEY, full); setState("need-auth"); return; }
      if (res.status === 404) { drop(); setState("not-found"); return; }
      if (res.status === 400 && /already in a household/i.test(String(body?.error ?? ""))) { drop(); setState("already"); return; }
      setState("error");
    } catch { setState("error"); }
  }

  const primary = { marginTop: 22, background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 18, padding: "15px 0", borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: `4px 5px 0 ${INK}`, minHeight: 52 } as const;
  const secondary = { marginTop: 12, background: PAPER, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 16, padding: "13px 0", borderRadius: 14, border: `2px solid ${INK}`, minHeight: 48 } as const;

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center" style={{ background: "#E9E2D3", position: "relative", overflowX: "hidden" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)", backgroundSize: "13px 13px" }} />
      <div className="relative w-full max-w-md px-6 text-center" aria-live="polite">
        {state === "not-found" ? (
          <>
            <div style={{ fontSize: 48 }} aria-hidden>🤔</div>
            <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 26, color: INK, marginTop: 8 }}>that code&apos;s cold</h1>
            <div style={{ fontFamily: HAND, fontSize: 17, color: TOMATO, marginTop: 4 }}>no household goes by that code — ask for a fresh link</div>
            <button onClick={() => router.replace("/kitchen")} className="w-full active:scale-[0.98] transition-transform" style={{ ...secondary, marginTop: 20 }}>Go to my kitchen</button>
          </>
        ) : state === "error" ? (
          <>
            <div style={{ fontSize: 48 }} aria-hidden>📡</div>
            <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 26, color: INK, marginTop: 8 }}>couldn&apos;t reach the kitchen</h1>
            <div style={{ fontFamily: HAND, fontSize: 17, color: TOMATO, marginTop: 4 }}>check your connection and try again</div>
            <button onClick={() => { setState("loading"); void load(); }} className="w-full active:scale-[0.98] transition-transform" style={primary}>Try again</button>
          </>
        ) : state === "already" ? (
          <>
            <div style={{ fontSize: 48 }} aria-hidden>🏠</div>
            <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 26, color: INK, lineHeight: 1.1, marginTop: 8 }}>You&apos;re already in a household</h1>
            <div style={{ fontFamily: HAND, fontSize: 17, color: TOMATO, transform: "rotate(-2deg)", marginTop: 6 }}>one household each — leave yours, then tap the invite again</div>
            <button onClick={() => router.push("/profile/household")} className="w-full active:scale-[0.98] transition-transform" style={primary}>Manage my household</button>
            <button onClick={() => router.replace("/kitchen")} className="w-full active:scale-[0.98] transition-transform" style={secondary}>Go to my kitchen</button>
          </>
        ) : state === "need-auth" ? (
          <>
            <div style={{ fontSize: 48 }} aria-hidden>🏠</div>
            <div style={{ fontFamily: HAND, fontSize: 17, color: INK, opacity: 0.7, marginTop: 10 }}>you&apos;re invited to</div>
            <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 30, color: INK, lineHeight: 1.05, marginTop: 2 }}>a household kitchen</h1>
            <div style={{ fontFamily: HAND, fontSize: 17, color: TOMATO, transform: "rotate(-2deg)", marginTop: 6 }}>one kitchen, shared by everyone at home</div>
            <button onClick={() => router.push("/auth/signup")} className="w-full active:scale-[0.98] transition-transform" style={primary}>Create my account</button>
            <button onClick={() => router.push("/auth/login")} className="w-full active:scale-[0.98] transition-transform" style={secondary}>I already have an account</button>
            <div style={{ fontFamily: SANS, fontSize: 13, color: INK, opacity: 0.6, marginTop: 14 }}>Once you&apos;re in, we&apos;ll ask you to confirm joining.</div>
          </>
        ) : state === "confirm" && house ? (
          <>
            <div className="mx-auto flex items-center justify-center" style={{ width: 76, height: 76, borderRadius: 20, background: LIME, border: `2.5px solid ${INK}`, boxShadow: `3px 4px 0 ${INK}`, fontSize: 38, transform: "rotate(-4deg)" }} aria-hidden>🏠</div>
            <div style={{ fontFamily: HAND, fontSize: 17, color: INK, opacity: 0.7, marginTop: 16 }}>join the kitchen at</div>
            <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 30, color: INK, lineHeight: 1.05, marginTop: 2, overflowWrap: "anywhere" }}>{house.name}</h1>
            <div style={{ fontFamily: SANS, fontSize: 14, color: "#4A4742", lineHeight: 1.45, marginTop: 10 }}>
              You&apos;ll share one kitchen{house.members > 0 ? ` with ${house.members === 1 ? "1 person" : `${house.members} people`}` : ""}: recipes, the meal plan and the grocery list.
            </div>
            <button onClick={() => { void join(); }} className="w-full active:scale-[0.98] transition-transform" style={primary}>Join this kitchen</button>
            <button onClick={() => { drop(); router.replace("/kitchen"); }} className="w-full active:scale-[0.98] transition-transform" style={secondary}>Not now</button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 44 }} aria-hidden>🍅</div>
            <div role="status" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 24, color: INK, marginTop: 10 }}>{state === "joining" ? "letting you in…" : "finding the kitchen…"}</div>
          </>
        )}
      </div>
    </div>
  );
}
