"use client";

// PROTOTYPE — Marco social pivot, the + creation tray. Creation, never saving.
// "I cooked something" is the hero; Potluck + Host are the other creation acts;
// "Add a recipe" is the quiet import. Dev-only.

import { useRouter } from "next/navigation";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const LIME = "#C4EE45";
const PINK = "#FF4D9D";
const BUTTER = "#FFD84D";

const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
const DISP = '"Marker Felt", Georgia, serif';
const SANS = "system-ui, -apple-system, sans-serif";

export default function CreateTray() {
  const router = useRouter();
  return (
    <div className="min-h-[100dvh] w-full flex flex-col justify-end" style={{ background: "rgba(23,20,16,0.55)", position: "relative" }}>
      {/* tray */}
      <div style={{ background: "#EDE7DA", borderTopLeftRadius: 26, borderTopRightRadius: 26, border: `2.5px solid ${INK}`, borderBottom: "none", padding: "10px 18px calc(env(safe-area-inset-bottom,0px) + 26px)", boxShadow: "0 -20px 50px rgba(0,0,0,0.4)", position: "relative" }}>
        <div style={{ width: 44, height: 5, borderRadius: 99, background: "rgba(23,20,16,0.25)", margin: "0 auto 6px" }} />
        <div className="flex items-center justify-between" style={{ marginTop: 6 }}>
          <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 22, color: INK }}>make something</span>
          <button onClick={() => router.back()} aria-label="Close" style={{ fontSize: 22, color: INK, background: "none", border: "none" }}>✕</button>
        </div>
        <div style={{ fontFamily: HAND, fontSize: 16, color: TOMATO, transform: "rotate(-1.5deg)", marginTop: 2 }}>what are you up to in the kitchen?</div>

        {/* HERO — I cooked something */}
        <button onClick={() => router.push("/i-cooked")} className="w-full active:scale-[0.98] transition-transform" style={{ marginTop: 16, background: TOMATO, border: `2.5px solid ${INK}`, borderRadius: 18, padding: 16, textAlign: "left", transform: "rotate(-1deg)", boxShadow: "0 12px 26px rgba(229,70,46,0.35)", position: "relative" }}>
          <div style={{ position: "absolute", top: -12, right: 14, background: LIME, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 12, padding: "4px 12px", borderRadius: 99, border: `2px solid ${INK}`, transform: "rotate(5deg)" }}>most people start here</div>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 40 }} aria-hidden>📸</span>
            <div>
              <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 24, color: PAPER, lineHeight: 1 }}>I cooked something</div>
              <div style={{ fontFamily: SANS, fontSize: 13.5, color: "rgba(255,247,238,0.9)", marginTop: 4 }}>post what you just made · 10 seconds</div>
            </div>
          </div>
        </button>

        {/* Potluck */}
        <button onClick={() => router.push("/potluck")} className="w-full active:scale-[0.98] transition-transform flex items-center gap-3" style={{ marginTop: 14, background: LIME, border: `2.5px solid ${INK}`, borderRadius: 16, padding: "14px 16px", textAlign: "left", transform: "rotate(-0.5deg)" }}>
          <span style={{ fontSize: 28 }} aria-hidden>🍲</span>
          <div>
            <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 18, color: INK, lineHeight: 1 }}>Start a Potluck</div>
            <div style={{ fontFamily: SANS, fontSize: 12.5, color: "#3B5200", marginTop: 3 }}>a theme + a deadline for your table</div>
          </div>
        </button>

        {/* quiet — add a recipe (imports to your Kitchen, not the feed) */}
        <button onClick={() => router.push("/recipes/new?mode=url")} className="w-full active:scale-[0.98] transition-transform flex items-center gap-3" style={{ marginTop: 14, background: PAPER, border: `2px solid ${INK}`, borderRadius: 14, padding: "12px 16px", textAlign: "left" }}>
          <span style={{ fontSize: 22 }} aria-hidden>🔖</span>
          <div className="flex-1">
            <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 16, color: INK, lineHeight: 1 }}>Add a recipe</div>
            <div style={{ fontFamily: SANS, fontSize: 12.5, color: INK, opacity: 0.6, marginTop: 2 }}>paste a link → straight to your kitchen</div>
          </div>
          <span style={{ color: INK, fontSize: 18, opacity: 0.5 }}>›</span>
        </button>
      </div>
    </div>
  );
}
