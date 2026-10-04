"use client";

/* The post-onboarding finishing flow — fired once on the first app open AFTER
   onboarding, floating over the blurred app as an "almost there" touch. Two
   quick beats:
     1. taste  — tap the dishes you'd cook, seeding your taste profile.
     2. table  — add Marco to a group chat with friends, so you can share
                 recipes and see what everyone's cooking in one thread.
   Finishing (or skipping) clears the pending flag via /api/user/taste. */

import { useEffect, useState } from "react";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const LIME = "#C4EE45";
const BUTTER = "#FFD84D";
const DISP = '"Marker Felt", Georgia, serif';
const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
const SANS = "system-ui, -apple-system, sans-serif";
const img = (p: string) => encodeURI(p);

const DISHES = [
  { t: "Mapo Tofu", img: "/onboarding/recipes/mapo-tofu.jpg" },
  { t: "Shrimp Scampi", img: "/onboarding/recipes/shrimp scampi.jpg" },
  { t: "Chicken Shawarma", img: "/onboarding/recipes/Chicken-Shawarma-8.jpg" },
  { t: "Buffalo Wings", img: "/onboarding/recipes/buffalowings.jpg" },
  { t: "Lamb Biryani", img: "/onboarding/recipes/lamb-biryani-83e5c3d.jpg" },
  { t: "Salmon Teriyaki", img: "/onboarding/recipes/salmon terriyaki.jpg" },
  { t: "Smoked Brisket", img: "/onboarding/recipes/smoked-brisket.jpg" },
  { t: "Creamy Pork Stew", img: "/onboarding/recipes/245361-creamy-pork-stew-Beauty-4x3-a56080e9b5a4462a8dad0a7661f6d1f4.jpg" },
  { t: "Fettuccine Alfredo", img: "/onboarding/recipes/fettuccine-alfredo.jpg" },
];

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "rgba(23,20,16,0.42)", backdropFilter: "blur(7px)", WebkitBackdropFilter: "blur(7px)", padding: 20, animation: "ti-fade .3s ease both" }}>
    <div className="relative w-full" style={{ maxWidth: 400, background: "#E9E2D3", backgroundImage: "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)", backgroundSize: "13px 13px", border: `2.5px solid ${INK}`, borderRadius: 20, padding: "22px 18px 18px", boxShadow: "0 26px 60px rgba(23,20,16,0.4)", transform: "rotate(-0.5deg)", animation: "ti-pop .4s cubic-bezier(0.34,1.56,0.64,1) both" }}>
      <div aria-hidden style={{ position: "absolute", top: -10, left: "50%", marginLeft: -36, width: 72, height: 20, background: "rgba(255,216,77,0.85)", border: `1px solid rgba(23,20,16,0.15)`, transform: "rotate(-4deg)" }} />
      {children}
    </div>
    <style>{`@keyframes ti-fade{from{opacity:0}to{opacity:1}}@keyframes ti-pop{0%{opacity:0;transform:rotate(-0.5deg) scale(0.92) translateY(10px)}100%{opacity:1;transform:rotate(-0.5deg) scale(1) translateY(0)}}`}</style>
  </div>
);

function Progress({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 overflow-hidden" style={{ height: 9, borderRadius: 99, background: "rgba(23,20,16,0.1)", border: `1.5px solid ${INK}` }}>
        <div style={{ width: `${pct}%`, height: "100%", background: LIME, borderRight: `1.5px solid ${INK}` }} />
      </div>
      <span style={{ fontFamily: HAND, fontSize: 14, color: TOMATO, whiteSpace: "nowrap", transform: "rotate(-2deg)" }}>{label}</span>
    </div>
  );
}

export default function TasteInterstitial({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"taste" | "table">("taste");
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [marcoNumber, setMarcoNumber] = useState("");
  const toggle = (t: string) => setPicked(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  useEffect(() => {
    void fetch("/api/imessage/link", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(v => { if (v?.marcoNumber) setMarcoNumber(v.marcoNumber); }).catch(() => {});
  }, []);

  async function saveTaste(liked: string[]) {
    setBusy(true);
    try { await fetch("/api/user/taste", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ liked }) }); } catch { /* best-effort */ }
    setBusy(false);
    setPhase("table");
  }

  function startTable() {
    const body = "This is our table 🍽️ Add whoever you cook with — drop any recipe here and Marco saves it for all of us.";
    if (marcoNumber) { try { window.location.href = `sms:${marcoNumber}&body=${encodeURIComponent(body)}`; } catch { /* ignore */ } }
    else { window.location.href = "/crew"; }
    onDone();
  }

  const enough = picked.length >= 3;

  if (phase === "table") {
    return (
      <Shell>
        <Progress pct={100} label="last step 🎉" />
        <div className="mt-3 text-center" style={{ fontSize: 40 }}>🍽️</div>
        <h2 className="text-center" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 25, lineHeight: 1.05, color: INK, marginTop: 4 }}>Start your table</h2>
        <p className="text-center" style={{ fontFamily: SANS, fontSize: 14.5, color: "#4A4742", marginTop: 8, lineHeight: 1.45 }}>
          Add <b>Marco to a group chat</b> with friends. Drop recipes to share them, and see what everyone&apos;s cooking — all in one thread.
        </p>
        <div className="mx-auto" style={{ marginTop: 14, maxWidth: 300 }}>
          {["🔗 share recipes in one tap", "👀 see what friends actually cook", "🍅 Marco saves them for everyone"].map((b) => (
            <div key={b} className="flex items-center gap-2" style={{ fontFamily: SANS, fontSize: 13.5, color: INK, padding: "4px 0" }}><span>{b}</span></div>
          ))}
        </div>
        <button onClick={startTable} disabled={busy} className="mt-5 w-full transition-transform active:scale-[0.98] disabled:opacity-50" style={{ color: PAPER, background: TOMATO, fontFamily: DISP, fontWeight: 700, fontSize: 17, padding: "14px 0", borderRadius: 13, border: `2.5px solid ${INK}`, boxShadow: "0 8px 18px rgba(229,70,46,0.28)" }}>
          Add Marco to a group chat →
        </button>
        <button onClick={onDone} className="mx-auto mt-3 block" style={{ fontFamily: HAND, fontSize: 14, color: INK, opacity: 0.55, background: "none", border: "none" }}>maybe later — take me in</button>
      </Shell>
    );
  }

  return (
    <Shell>
      <Progress pct={88} label="almost there ✨" />
      <h2 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 25, lineHeight: 1.05, color: INK, marginTop: 14 }}>One last thing — your taste</h2>
      <p style={{ fontFamily: SANS, fontSize: 14, color: "#4A4742", marginTop: 6, lineHeight: 1.4 }}>Tap the dishes you&apos;d actually cook. Marco learns from these — the rest fills in as you cook.</p>
      <div className="grid grid-cols-3" style={{ gap: 8, marginTop: 14 }}>
        {DISHES.map((d) => {
          const on = picked.includes(d.t);
          return (
            <button key={d.t} onClick={() => toggle(d.t)} className="relative overflow-hidden transition-transform active:scale-95" style={{ borderRadius: 11, border: `2.5px solid ${on ? TOMATO : INK}`, aspectRatio: "1/1", padding: 0, boxShadow: on ? "0 6px 14px rgba(229,70,46,0.3)" : "none" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img(d.img)} alt={d.t} referrerPolicy="no-referrer" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              <span className="absolute inset-x-0 bottom-0 truncate" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 9, color: PAPER, padding: "8px 4px 3px", textAlign: "left", background: "linear-gradient(to top, rgba(23,20,16,0.82), transparent)" }}>{d.t}</span>
              {on && (
                <span className="absolute flex items-center justify-center" style={{ top: 4, right: 4, width: 20, height: 20, borderRadius: 99, background: TOMATO, border: `2px solid ${PAPER}` }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
      <button onClick={() => saveTaste(picked)} disabled={!enough || busy} className="mt-4 w-full transition-transform active:scale-[0.98] disabled:opacity-50" style={{ color: PAPER, background: TOMATO, fontFamily: DISP, fontWeight: 700, fontSize: 17, padding: "14px 0", borderRadius: 13, border: `2.5px solid ${INK}`, boxShadow: "0 8px 18px rgba(229,70,46,0.28)" }}>
        {busy ? "Saving…" : enough ? "Next →" : `Pick ${3 - picked.length} more`}
      </button>
      <button onClick={() => saveTaste([])} disabled={busy} className="mx-auto mt-3 block" style={{ fontFamily: HAND, fontSize: 14, color: INK, opacity: 0.55, background: "none", border: "none" }}>skip for now</button>
    </Shell>
  );
}
