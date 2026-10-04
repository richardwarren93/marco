"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MarcoPhone, { type MarcoScreen } from "@/components/onboarding/MarcoPhone";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const DISP = '"Marker Felt", Georgia, serif';
const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
const SANS = "system-ui, -apple-system, sans-serif";
const DOTS = "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)";

// Each panel shows one or more REAL Marco screens (beautiful-chaos) in the phone.
const PANELS: { screens: MarcoScreen[]; title: string; sub: string }[] = [
  { screens: ["text"], title: "The whole kitchen, by text", sub: "Save any recipe, ask what to cook, and plan the week — just by texting Marco, together with your household." },
  { screens: ["plan", "grocery"], title: "Plan the week, shop in a tap", sub: "Your saves turn into a weekly plan — then the grocery list writes itself, in sync with your household." },
  { screens: ["feed"], title: "See what your people cook", sub: "Family and friends each get a table — swap what you're actually cooking, not just what you saved." },
];

// Auto-rotates through a panel's screens so planning + groceries read as one flow.
function PhoneRotator({ screens }: { screens: MarcoScreen[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (screens.length < 2) return;
    const t = setInterval(() => setI(v => (v + 1) % screens.length), 2400);
    return () => clearInterval(t);
  }, [screens]);
  const cur = i % screens.length;
  return (
    <div className="relative h-full w-full">
      <MarcoPhone screen={screens[cur]} />
      {screens.length > 1 && (
        <div className="absolute inset-x-0 flex items-center justify-center gap-1" style={{ bottom: -14 }}>
          {screens.map((_, j) => <span key={j} style={{ width: 5, height: 5, borderRadius: 99, background: j === cur ? TOMATO : "rgba(23,20,16,0.22)", transition: "all .25s" }} />)}
        </div>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [step, setStep] = useState(0);
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
    <div className="min-h-[100dvh] w-full" style={{ background: "#E9E2D3", backgroundImage: DOTS, backgroundSize: "13px 13px", color: INK }}>
      <div className="relative mx-auto flex w-full max-w-md flex-col px-6" style={{ minHeight: "100dvh", paddingTop: "calc(env(safe-area-inset-top,0px) + 16px)", paddingBottom: 24 }}>
        <div className="flex items-center justify-between">
          <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 20, color: INK }}>Marco</span>
          {!naming && <button onClick={() => setStep(PANELS.length)} style={{ fontFamily: HAND, fontSize: 15, color: INK, opacity: 0.55, background: "none", border: "none" }}>skip →</button>}
        </div>

        {error && <div role="alert" className="mt-4 rounded-xl bg-white p-4" style={{ border: `2px solid ${INK}` }}>{error}{!ready && <button className="mt-2 block underline" onClick={() => { setError(""); setReload(v => v + 1); }}>Retry</button>}</div>}
        {!ready && !error && <p role="status" className="mt-8" style={{ fontFamily: HAND, fontSize: 17, color: TOMATO }}>getting your kitchen ready…</p>}

        {ready && !naming && (
          <div className="flex flex-1 flex-col">
            {/* Phone — the real app screens, sized in the 186:380 bezel ratio */}
            <div className="flex flex-1 items-center justify-center overflow-hidden pt-3" style={{ minHeight: 0 }}>
              <div key={`phone-${step}`} style={{ height: "min(400px, 46vh)", width: "calc(min(400px, 46vh) * 186 / 380)", animation: "ob-slide 0.4s ease both" }}>
                <PhoneRotator key={step} screens={PANELS[step].screens} />
              </div>
            </div>

            <div key={`copy-${step}`} className="text-center" style={{ animation: "ob-slide 0.4s ease 0.05s both" }}>
              <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 30, lineHeight: 1.04, letterSpacing: "-0.01em", color: INK }}>{PANELS[step].title}</h1>
              <p className="mx-auto" style={{ fontFamily: SANS, fontSize: 15, color: "#4A4742", marginTop: 8, lineHeight: 1.45, maxWidth: "20rem" }}>{PANELS[step].sub}</p>
            </div>

            <div className="flex items-center justify-center gap-1.5" style={{ margin: "16px 0" }}>
              {PANELS.map((_, i) => <span key={i} style={{ width: i === step ? 22 : 8, height: 8, borderRadius: 99, background: i === step ? TOMATO : "rgba(23,20,16,0.2)", transition: "all .25s" }} />)}
            </div>

            <div className="flex items-center gap-3">
              {step > 0 && <button onClick={() => setStep(step - 1)} className="transition-transform active:scale-95" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 15, color: INK, background: PAPER, border: `2px solid ${INK}`, borderRadius: 12, padding: "13px 18px" }}>←</button>}
              <button onClick={() => setStep(step + 1)} className="flex-1 transition-transform active:scale-[0.98]" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 17, color: PAPER, background: TOMATO, border: `2.5px solid ${INK}`, borderRadius: 14, padding: "15px 0", boxShadow: "0 8px 18px rgba(229,70,46,0.28)" }}>
                {step === PANELS.length - 1 ? "Set up my kitchen →" : "Next →"}
              </button>
            </div>
          </div>
        )}

        {ready && naming && (
          <form onSubmit={finish} className="flex flex-1 flex-col">
            <div className="flex flex-1 flex-col justify-center">
              <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 32, lineHeight: 1.03, color: INK }}>Let&apos;s get cooking</h1>
              <svg width="150" height="11" viewBox="0 0 150 11" fill="none" aria-hidden className="block" style={{ marginTop: 2 }}><path d="M2 7 C 26 2, 50 10, 76 6 S 128 2, 148 6" stroke={TOMATO} strokeWidth="3.5" strokeLinecap="round" /></svg>
              <label className="block" style={{ marginTop: 24, fontFamily: DISP, fontWeight: 700, fontSize: 17, color: INK }}>What should we call you?
                <input autoFocus autoComplete="given-name" required maxLength={60} value={name} onChange={e => setName(e.target.value)} className="block w-full" style={{ marginTop: 10, background: PAPER, border: `2.5px solid ${INK}`, borderRadius: 14, padding: "14px 16px", fontFamily: SANS, fontSize: 17, color: INK }} />
              </label>
              <p style={{ fontFamily: HAND, fontSize: 15, color: TOMATO, marginTop: 12, transform: "rotate(-1deg)" }}>next: add who you cook with (optional)</p>
            </div>
            <button disabled={busy || !name.trim()} className="w-full transition-transform active:scale-[0.98] disabled:opacity-50" style={{ background: INK, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 18, padding: "16px 0", borderRadius: 14, border: `2.5px solid ${INK}` }}>{busy ? "Saving…" : "Let's cook →"}</button>
            <button type="button" onClick={() => setStep(PANELS.length - 1)} style={{ fontFamily: HAND, fontSize: 15, color: INK, opacity: 0.6, background: "none", border: "none", marginTop: 12 }}>← back</button>
          </form>
        )}
      </div>
      <style>{`@keyframes ob-slide{0%{opacity:0;transform:translateX(20px)}100%{opacity:1;transform:translateX(0)}}@media (prefers-reduced-motion: reduce){[style*="ob-slide"]{animation:none !important}}`}</style>
    </div>
  );
}
