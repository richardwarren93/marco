"use client";

/* The deferred taste profile — fired once on the first app open AFTER
   onboarding (not inside it). It floats over the blurred app as an "almost
   there" finishing touch: tap the dishes you'd actually cook, and Marco seeds
   your taste. Saving (or skipping) clears the pending flag via /api/user/taste. */

import { useState } from "react";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const LIME = "#C4EE45";
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

export default function TasteInterstitial({ onDone }: { onDone: () => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const toggle = (t: string) => setPicked(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  async function finish(liked: string[]) {
    setBusy(true);
    try { await fetch("/api/user/taste", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ liked }) }); } catch { /* clearing is best-effort */ }
    onDone();
  }

  const enough = picked.length >= 3;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "rgba(23,20,16,0.42)", backdropFilter: "blur(7px)", WebkitBackdropFilter: "blur(7px)", padding: "20px", animation: "ti-fade .3s ease both" }}>
      <div className="relative w-full" style={{ maxWidth: 400, background: "#E9E2D3", backgroundImage: "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)", backgroundSize: "13px 13px", border: `2.5px solid ${INK}`, borderRadius: 20, padding: "22px 18px 18px", boxShadow: "0 26px 60px rgba(23,20,16,0.4)", transform: "rotate(-0.5deg)", animation: "ti-pop .4s cubic-bezier(0.34,1.56,0.64,1) both" }}>
        {/* taped tab */}
        <div aria-hidden style={{ position: "absolute", top: -10, left: "50%", marginLeft: -36, width: 72, height: 20, background: "rgba(255,216,77,0.85)", border: `1px solid rgba(23,20,16,0.15)`, transform: "rotate(-4deg)" }} />

        {/* almost-there progress */}
        <div className="flex items-center gap-2">
          <div className="flex-1 overflow-hidden" style={{ height: 9, borderRadius: 99, background: "rgba(23,20,16,0.1)", border: `1.5px solid ${INK}` }}>
            <div style={{ width: "88%", height: "100%", background: LIME, borderRight: `1.5px solid ${INK}` }} />
          </div>
          <span style={{ fontFamily: HAND, fontSize: 14, color: TOMATO, whiteSpace: "nowrap", transform: "rotate(-2deg)" }}>almost there ✨</span>
        </div>

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

        <button onClick={() => finish(picked)} disabled={!enough || busy} className="mt-4 w-full transition-transform active:scale-[0.98] disabled:opacity-50" style={{ color: PAPER, background: TOMATO, fontFamily: DISP, fontWeight: 700, fontSize: 17, padding: "14px 0", borderRadius: 13, border: `2.5px solid ${INK}`, boxShadow: "0 8px 18px rgba(229,70,46,0.28)" }}>
          {busy ? "Saving…" : enough ? "Done — take me in →" : `Pick ${3 - picked.length} more`}
        </button>
        <button onClick={() => finish([])} disabled={busy} className="mx-auto mt-3 block" style={{ fontFamily: HAND, fontSize: 14, color: INK, opacity: 0.55, background: "none", border: "none" }}>skip for now</button>
      </div>
      <style>{`@keyframes ti-fade{from{opacity:0}to{opacity:1}}@keyframes ti-pop{0%{opacity:0;transform:rotate(-0.5deg) scale(0.92) translateY(10px)}100%{opacity:1;transform:rotate(-0.5deg) scale(1) translateY(0)}}`}</style>
    </div>
  );
}
