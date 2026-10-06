"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const DISP = '"Marker Felt", Georgia, serif';
const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
const SANS = "system-ui, -apple-system, sans-serif";
const DOTS = "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)";

// By the time you reach here you've already seen the showcase tour (it runs
// pre-auth, on the signup flow). Onboarding now asks for just one thing — your
// name — then hands you to your kitchen, where the ongoing in-app guide picks
// up allergies, taste, household and the action quests.
export default function OnboardingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const r = await fetch("/api/profile", { cache: "no-store" });
      if (r.status === 401) { router.replace("/auth/login"); return; }
      if (!r.ok) throw new Error("Your profile could not be loaded. Please retry.");
      const data = await r.json();
      if (!active) return;
      if (data.profile?.onboarding_completed) { router.replace("/kitchen"); return; }
      // Don't greet people by their email handle — only keep a real name.
      const dn: string = data.profile?.display_name || "";
      const { data: auth } = await createClient().auth.getUser();
      const handle = (auth.user?.email || "").split("@")[0];
      if (!active) return;
      setName(dn && dn !== handle && !/[@+]|\d{4,}/.test(dn) ? dn : ""); setReady(true);
    }
    void load().catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [router, reload]);

  async function finish(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const r = await fetch("/api/onboarding/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ display_name: name.trim() }) });
      const value = await r.json(); if (!r.ok) throw new Error(value.error || "Could not save your setup.");
      router.replace("/kitchen"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save. Try again."); setBusy(false); }
  }

  return (
    <div className="min-h-[100dvh] w-full" style={{ background: "#E9E2D3", backgroundImage: DOTS, backgroundSize: "13px 13px", color: INK }}>
      <div className="relative mx-auto flex w-full max-w-md flex-col px-6" style={{ minHeight: "100dvh", paddingTop: "calc(env(safe-area-inset-top,0px) + 16px)", paddingBottom: 24 }}>
        <div className="flex items-center justify-between">
          <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 20, color: INK }}>Marco</span>
        </div>

        {error && <div role="alert" className="mt-4 rounded-xl bg-white p-4" style={{ border: `2px solid ${INK}` }}>{error}{!ready && <button className="mt-2 block underline" onClick={() => { setError(""); setReload(v => v + 1); }}>Retry</button>}</div>}
        {!ready && !error && <p role="status" className="mt-8" style={{ fontFamily: HAND, fontSize: 17, color: TOMATO }}>getting your kitchen ready…</p>}

        {/* ─── Name — the one thing we ask up front ─────────────────────── */}
        {ready && (
          <form onSubmit={finish} className="flex flex-1 flex-col">
            <div className="flex flex-1 flex-col justify-center">
              <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 32, lineHeight: 1.03, color: INK }}>Let&apos;s get cooking</h1>
              <svg width="150" height="11" viewBox="0 0 150 11" fill="none" aria-hidden className="block" style={{ marginTop: 2 }}><path d="M2 7 C 26 2, 50 10, 76 6 S 128 2, 148 6" stroke={TOMATO} strokeWidth="3.5" strokeLinecap="round" /></svg>
              <label className="block" style={{ marginTop: 24, fontFamily: DISP, fontWeight: 700, fontSize: 17, color: INK }}>What should we call you?
                <input autoFocus autoComplete="given-name" required maxLength={60} value={name} onChange={e => setName(e.target.value)} className="block w-full" style={{ marginTop: 10, background: PAPER, border: `2.5px solid ${INK}`, borderRadius: 14, padding: "14px 16px", fontFamily: SANS, fontSize: 17, color: INK }} />
              </label>
              <p style={{ fontFamily: HAND, fontSize: 15, color: TOMATO, marginTop: 12, transform: "rotate(-1deg)" }}>Marco will walk you through the rest, in the app</p>
            </div>
            <button disabled={busy || !name.trim()} className="w-full transition-transform active:scale-[0.98] disabled:opacity-50" style={{ background: INK, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 18, padding: "16px 0", borderRadius: 14, border: `2.5px solid ${INK}` }}>{busy ? "Saving…" : "Into my kitchen →"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
