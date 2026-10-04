"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const LIME = "#C4EE45";
const BUTTER = "#FFD84D";
const COBALT = "#2540E8";
const PINK = "#FF4D9D";
const LAV = "#C9B8FF";
const DISP = '"Marker Felt", Georgia, serif';
const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
const SANS = "system-ui, -apple-system, sans-serif";

// ── little on-brand mockups for each showcase panel ──────────────────────────
function Stage({ children, bg = LIME }: { children: ReactNode; bg?: string }) {
  return (
    <div className="flex items-center justify-center" style={{ height: 230 }}>
      <div className="relative flex items-center justify-center" style={{ width: 210, height: 210, borderRadius: 28, background: bg, border: `2.5px solid ${INK}`, boxShadow: "0 16px 36px rgba(23,20,16,0.2)", transform: "rotate(-2deg)" }}>
        {children}
      </div>
    </div>
  );
}
function Bubble({ me, children, c }: { me?: boolean; children: ReactNode; c?: string }) {
  return <div style={{ alignSelf: me ? "flex-end" : "flex-start", maxWidth: "80%", background: me ? (c ?? "#34C759") : "#fff", color: me ? "#fff" : INK, border: `2px solid ${INK}`, borderRadius: 14, padding: "7px 11px", fontFamily: SANS, fontSize: 12.5, lineHeight: 1.2 }}>{children}</div>;
}

const ART_HERO = (
  <Stage bg={LIME}>
    <div style={{ fontSize: 96, transform: "rotate(-6deg)" }} aria-hidden>🍅</div>
  </Stage>
);
// #2 — do it all by text: save, ask what to cook, plan — from Messages.
const ART_TEXT = (
  <Stage bg={BUTTER}>
    <div className="flex flex-col gap-1.5" style={{ width: 182 }}>
      <Bubble>🔥 <span style={{ color: COBALT }}>recipe.link/pasta</span></Bubble>
      <Bubble me>Saved to your Kitchen 👨‍🍳</Bubble>
      <Bubble>what should we cook friday?</Bubble>
      <Bubble me>green curry or fish tacos?</Bubble>
    </div>
  </Stage>
);
// #3 — your own tables: family, close friends — different tables, not randos.
const ART_TABLES = (
  <Stage bg={PINK}>
    <div className="flex flex-col items-center gap-2" style={{ width: 180 }}>
      <div className="flex gap-2">
        <span style={{ background: LIME, border: `2px solid ${INK}`, borderRadius: 99, padding: "5px 11px", fontFamily: DISP, fontWeight: 700, fontSize: 12.5, color: INK, transform: "rotate(-3deg)" }}>🏠 family</span>
        <span style={{ background: LAV, border: `2px solid ${INK}`, borderRadius: 99, padding: "5px 11px", fontFamily: DISP, fontWeight: 700, fontSize: 12.5, color: INK, transform: "rotate(2deg)" }}>👯 friends</span>
      </div>
      <div style={{ width: 128, background: PAPER, border: `2.5px solid ${INK}`, borderRadius: 11, padding: 8, transform: "rotate(-2deg)", boxShadow: "0 8px 16px rgba(0,0,0,0.22)" }}>
        <div style={{ height: 70, borderRadius: 5, background: "linear-gradient(135deg,#E5462E,#FF7A1A)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34 }}>🍜</div>
        <div style={{ fontFamily: SANS, fontSize: 10, color: INK, marginTop: 5 }}><b>calvin</b> cooked</div>
        <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 13, color: INK, lineHeight: 1 }}>ramen night</div>
      </div>
    </div>
  </Stage>
);

const PANELS: { art: ReactNode; title: string; sub: string }[] = [
  { art: ART_HERO, title: "The recipe app that actually cooks", sub: "save it · plan it · cook it · share it — with your people" },
  { art: ART_TEXT, title: "Do it all from a text", sub: "save a link, ask what to cook, plan the week, build the grocery list — right from Messages, with your household." },
  { art: ART_TABLES, title: "Cook with your people", sub: "see what your family and close friends actually cook — make a table for each, and share recipes in the group chat." },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [step, setStep] = useState(0); // 0..PANELS.length-1 = tour; PANELS.length = name
  const naming = step >= PANELS.length;

  useEffect(() => {
    let active = true;
    async function load() {
      const r = await fetch("/api/profile", { cache: "no-store" });
      if (r.status === 401) { router.replace("/auth/login"); return; }
      if (!r.ok) throw new Error("Your profile could not be loaded. Please retry.");
      const data = await r.json();
      if (!active) return;
      if (data.profile?.onboarding_completed) { router.replace("/friends-stack"); return; }
      setName(data.profile?.display_name || ""); setReady(true);
    }
    void load().catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [router, reload]);

  async function finish(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const r = await fetch("/api/onboarding/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ display_name: name }) });
      const value = await r.json(); if (!r.ok) throw new Error(value.error || "Could not save your setup.");
      router.replace("/friends-stack"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save. Try again."); setBusy(false); }
  }

  return (
    <div className="min-h-[100dvh] w-full" style={{ background: "#E9E2D3", backgroundImage: "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)", backgroundSize: "13px 13px", color: INK }}>
      <div className="relative mx-auto flex flex-col w-full max-w-md px-6" style={{ minHeight: "100dvh", paddingTop: "calc(env(safe-area-inset-top,0px) + 20px)", paddingBottom: 28 }}>
        <div className="flex items-center justify-between">
          <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 20, color: INK }}>Marco</span>
          {!naming && <button onClick={() => setStep(PANELS.length)} style={{ fontFamily: HAND, fontSize: 15, color: INK, opacity: 0.6, background: "none", border: "none" }}>skip →</button>}
        </div>

        {error && <div role="alert" className="mt-4 rounded-xl bg-white p-4" style={{ border: `2px solid ${INK}` }}>{error}{!ready && <button className="block underline mt-2" onClick={() => { setError(""); setReload(v => v + 1); }}>Retry</button>}</div>}
        {!ready && !error && <p role="status" className="mt-8" style={{ fontFamily: HAND, fontSize: 17, color: TOMATO }}>getting your kitchen ready…</p>}

        {ready && !naming && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex flex-col justify-center">
              {PANELS[step].art}
              <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 30, lineHeight: 1.05, letterSpacing: "-0.01em", color: INK, marginTop: 20 }}>{PANELS[step].title}</h1>
              <p style={{ fontFamily: SANS, fontSize: 16, color: "#4A4742", marginTop: 10, lineHeight: 1.45 }}>{PANELS[step].sub}</p>
            </div>
            {/* dots */}
            <div className="flex items-center justify-center gap-1.5" style={{ marginBottom: 16 }}>
              {PANELS.map((_, i) => <span key={i} style={{ width: i === step ? 22 : 8, height: 8, borderRadius: 99, background: i === step ? TOMATO : "rgba(23,20,16,0.2)", transition: "all .2s" }} />)}
            </div>
            <div className="flex items-center gap-3">
              {step > 0 && <button onClick={() => setStep(step - 1)} className="active:scale-95 transition-transform" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 15, color: INK, background: PAPER, border: `2px solid ${INK}`, borderRadius: 12, padding: "13px 18px" }}>←</button>}
              <button onClick={() => setStep(step + 1)} className="flex-1 active:scale-[0.98] transition-transform" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 17, color: PAPER, background: TOMATO, border: `2.5px solid ${INK}`, borderRadius: 14, padding: "14px 0", boxShadow: "0 8px 18px rgba(229,70,46,0.28)" }}>
                {step === PANELS.length - 1 ? "Everything a recipe app does — but better →" : "Next →"}
              </button>
            </div>
          </div>
        )}

        {ready && naming && (
          <form onSubmit={finish} className="flex-1 flex flex-col">
            <div className="flex-1 flex flex-col justify-center">
              <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 32, lineHeight: 1.03, color: INK }}>Let&apos;s get cooking</h1>
              <svg width="150" height="11" viewBox="0 0 150 11" fill="none" aria-hidden className="block" style={{ marginTop: 2 }}><path d="M2 7 C 26 2, 50 10, 76 6 S 128 2, 148 6" stroke={TOMATO} strokeWidth="3.5" strokeLinecap="round" /></svg>
              <label className="block" style={{ marginTop: 24, fontFamily: DISP, fontWeight: 700, fontSize: 17, color: INK }}>What should we call you?
                <input autoFocus autoComplete="given-name" required maxLength={60} value={name} onChange={e => setName(e.target.value)} className="block w-full" style={{ marginTop: 10, background: PAPER, border: `2.5px solid ${INK}`, borderRadius: 14, padding: "14px 16px", fontFamily: SANS, fontSize: 17, color: INK }} />
              </label>
              <p style={{ fontFamily: HAND, fontSize: 15, color: TOMATO, marginTop: 12, transform: "rotate(-1deg)" }}>next: add who you cook with (optional)</p>
            </div>
            <button disabled={busy || !name.trim()} className="w-full active:scale-[0.98] transition-transform disabled:opacity-50" style={{ background: INK, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 18, padding: "16px 0", borderRadius: 14, border: `2.5px solid ${INK}` }}>{busy ? "Saving…" : "Let's cook →"}</button>
            <button type="button" onClick={() => setStep(PANELS.length - 1)} style={{ fontFamily: HAND, fontSize: 15, color: INK, opacity: 0.6, background: "none", border: "none", marginTop: 12 }}>← back</button>
          </form>
        )}
      </div>
    </div>
  );
}
