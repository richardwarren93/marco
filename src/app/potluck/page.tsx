"use client";

// PROTOTYPE — Marco social pivot, Potluck: a collaborative theme + deadline for
// your crew → everyone cooks → an auto-assembled shared artifact that lands in
// every Kitchen. Steps: create → active → done. Dev-only.

import { useState } from "react";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const COBALT = "#2540E8";
const LIME = "#C4EE45";
const PINK = "#FF4D9D";
const BUTTER = "#FFD84D";
const ORANGE = "#FF7A1A";
const LAV = "#C9B8FF";

const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
const DISP = '"Marker Felt", Georgia, serif';
const SANS = "system-ui, -apple-system, sans-serif";
const MONO = "ui-monospace, monospace";

const THEMES = [
  ["Something Spicy", "🌶️", TOMATO], ["Childhood Food", "🧸", BUTTER],
  ["Indian Night", "🪔", ORANGE], ["Pasta Night", "🍝", LIME],
  ["From a friend's kitchen", "🔁", COBALT], ["+ your own", "✍️", LAV],
];
const FRIENDS = [["Maya", "M", PINK], ["Rohan", "R", COBALT], ["Alex", "A", LIME], ["Priya", "P", LAV], ["Noor", "N", ORANGE]];
const DISHES = [
  ["Chili tacos", "Maya", "/food/meal3.jpg", -4, PINK], ["Dan dan noodles", "Rohan", "/food/meal2.jpg", 3, COBALT],
  ["Gochujang wings", "Alex", "/food/meal4.jpg", -3, LIME], ["Vindaloo", "Priya", "/food/meal5.jpg", 4, LAV],
  ["Nashville hot", "you", "/food/meal1.jpg", -2, TOMATO],
];

export default function Potluck() {
  const [step, setStep] = useState<"create" | "active" | "done">("create");
  const [theme, setTheme] = useState(0);
  const [invited, setInvited] = useState<Record<string, boolean>>({ Maya: true, Rohan: true, Alex: true });

  return (
    <div className="min-h-[100dvh] w-full" style={{ background: step === "done" ? TOMATO : "#E9E2D3", position: "relative", overflowX: "hidden" }}>
      {step !== "done" && <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)", backgroundSize: "13px 13px" }} />}

      {step === "create" && (
        <div className="relative mx-auto w-full max-w-md px-5" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 16px)", paddingBottom: 120 }}>
          <div className="flex items-center justify-between">
            <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 24, color: INK }}>Start a Potluck</span>
            <span style={{ fontSize: 22, color: INK }}>✕</span>
          </div>
          <div style={{ fontFamily: HAND, fontSize: 17, color: TOMATO, transform: "rotate(-1.5deg)", marginTop: 4 }}>give your table a reason to cook this week.</div>

          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.14em", color: INK, textTransform: "uppercase", marginTop: 20 }}>pick a theme</div>
          <div className="grid grid-cols-2 gap-2.5" style={{ marginTop: 10 }}>
            {THEMES.map(([name, emoji, c], i) => (
              <button key={name} onClick={() => setTheme(i)} style={{ background: theme === i ? (c as string) : PAPER, color: theme === i ? (c === BUTTER || c === LIME ? INK : PAPER) : INK, border: `2.5px solid ${INK}`, borderRadius: 14, padding: "12px 12px", textAlign: "left", transform: `rotate(${i % 2 ? 1 : -1}deg)`, boxShadow: theme === i ? "0 8px 18px rgba(23,20,16,0.2)" : "none" }}>
                <span style={{ fontSize: 22 }} aria-hidden>{emoji}</span>
                <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 15, marginTop: 3, lineHeight: 1.05 }}>{name}</div>
              </button>
            ))}
          </div>

          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.14em", color: INK, textTransform: "uppercase", marginTop: 22 }}>invite your people</div>
          <div className="flex gap-2.5" style={{ marginTop: 10 }}>
            {FRIENDS.map(([n, ini, c]) => (
              <button key={n} onClick={() => setInvited((v) => ({ ...v, [n]: !v[n] }))} className="flex flex-col items-center" style={{ opacity: invited[n as string] ? 1 : 0.4 }}>
                <div className="flex items-center justify-center" style={{ width: 46, height: 46, borderRadius: 99, background: c as string, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 17, border: `2.5px solid ${invited[n as string] ? INK : "rgba(23,20,16,0.3)"}` }}>{ini}{invited[n as string] && <span style={{ position: "absolute", marginLeft: 34, marginTop: -30, fontSize: 14 }}>✓</span>}</div>
                <span style={{ fontFamily: SANS, fontSize: 11, color: INK, marginTop: 3 }}>{n}</span>
              </button>
            ))}
          </div>

          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.14em", color: INK, textTransform: "uppercase", marginTop: 22 }}>cook by</div>
          <div className="flex gap-2" style={{ marginTop: 10 }}>
            {["this Friday", "this Sunday", "pick a date"].map((d, i) => (
              <span key={d} style={{ background: i === 1 ? INK : PAPER, color: i === 1 ? PAPER : INK, border: `2px solid ${INK}`, borderRadius: 99, padding: "8px 14px", fontFamily: DISP, fontWeight: 700, fontSize: 14 }}>{d}</span>
            ))}
          </div>

          <button onClick={() => setStep("active")} className="w-full active:scale-[0.98] transition-transform" style={{ marginTop: 26, background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 19, padding: "16px 0", borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: "0 10px 24px rgba(229,70,46,0.35)" }}>Send it 🍲</button>
        </div>
      )}

      {step === "active" && (
        <div className="relative mx-auto w-full max-w-md px-5" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 18px)", paddingBottom: 40 }}>
          {/* the potluck object */}
          <div style={{ background: THEMES[theme][2] as string, borderRadius: 18, border: `2.5px solid ${INK}`, padding: 18, transform: "rotate(-1deg)", boxShadow: "0 16px 34px rgba(23,20,16,0.2)", color: PAPER }}>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.16em", opacity: 0.9 }}>POTLUCK · COOK BY SUNDAY</div>
            <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 30, marginTop: 4, lineHeight: 1 }}>{THEMES[theme][0]} {THEMES[theme][1]}</div>
            <div style={{ fontFamily: HAND, fontSize: 16, marginTop: 4 }}>you + {Object.values(invited).filter(Boolean).length} cooking</div>
          </div>

          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.14em", color: INK, textTransform: "uppercase", marginTop: 22 }}>2 of 4 cooked so far</div>
          <div style={{ marginTop: 12 }} className="space-y-2">
            {[["Maya", "M", PINK, "cooked ✓", true], ["Rohan", "R", COBALT, "planning: birria", false], ["Alex", "A", LIME, "cooked ✓", true], ["you", "Y", TOMATO, "haven't cooked yet", false]].map(([n, ini, c, s, done]) => (
              <div key={n as string} className="flex items-center gap-3" style={{ background: PAPER, border: `2px solid ${INK}`, borderRadius: 12, padding: "10px 14px" }}>
                <div className="flex items-center justify-center" style={{ width: 34, height: 34, borderRadius: 99, background: c as string, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 14, border: `2px solid ${INK}` }}>{ini as string}</div>
                <span style={{ fontFamily: SANS, fontSize: 14, color: INK, flex: 1 }}><b>{n as string}</b> · <span style={{ fontFamily: done ? DISP : HAND, color: done ? "#3B6D11" : INK, opacity: done ? 1 : 0.7 }}>{s as string}</span></span>
              </div>
            ))}
          </div>

          <button className="w-full active:scale-[0.98] transition-transform" style={{ marginTop: 20, background: INK, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 18, padding: "15px 0", borderRadius: 16, border: "none" }}>I cooked for this 📸</button>
          <button onClick={() => setStep("done")} className="w-full" style={{ marginTop: 10, background: "transparent", color: INK, fontFamily: HAND, fontSize: 16, padding: "8px 0", border: "none" }}>▸ skip to Sunday (everyone&apos;s done)</button>
        </div>
      )}

      {step === "done" && (
        <div className="relative mx-auto w-full max-w-md px-4" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 20px)", paddingBottom: 40 }}>
          <div className="text-center">
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.28em", color: PAPER }}>THE POTLUCK IS SERVED</div>
            <div style={{ fontFamily: HAND, fontSize: 18, color: BUTTER, transform: "rotate(-1.5deg)", marginTop: 2 }}>5 friends cooked. one beautiful mess.</div>
          </div>

          {/* the auto-assembled artifact */}
          <div style={{ marginTop: 18, background: PAPER, borderRadius: 16, border: `2.5px solid ${INK}`, padding: "18px 14px 26px", boxShadow: "0 20px 44px rgba(0,0,0,0.35)", position: "relative" }}>
            <div className="text-center">
              <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 26, color: INK, lineHeight: 1 }}>{THEMES[theme][0]} {THEMES[theme][1]}</div>
              <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.14em", color: INK, marginTop: 3 }}>SUNDAY · 5 COOKS</div>
            </div>
            {/* collage of mini dish cards */}
            <div style={{ position: "relative", height: 470, marginTop: 12 }}>
              {DISHES.map(([name, who, img, rot, c], i) => {
                const pos = [{ left: 4, top: 6 }, { right: 2, top: 40 }, { left: 10, top: 200 }, { right: 6, top: 226 }, { left: 62, top: 130 }][i];
                return (
                  <div key={name as string} style={{ position: "absolute", ...pos, width: 132, background: "#fff", border: `2px solid ${INK}`, padding: 6, transform: `rotate(${rot}deg)`, boxShadow: "0 8px 18px rgba(23,20,16,0.22)", zIndex: i === 4 ? 6 : i } as React.CSSProperties}>
                    <div style={{ position: "absolute", top: -8, left: "40%", width: 40, height: 16, background: "rgba(255,216,77,0.85)", transform: "rotate(-6deg)" }} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img as string} alt="" style={{ width: "100%", height: 92, objectFit: "cover", display: "block" }} />
                    <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 13, color: INK, marginTop: 5, lineHeight: 1 }}>{name as string}</div>
                    <div style={{ fontFamily: HAND, fontSize: 13, color: c as string }}>{who as string}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-center" style={{ fontFamily: HAND, fontSize: 15, color: PAPER, marginTop: 14 }}>this lives in everyone&apos;s kitchen forever ♡</div>
          <div className="flex gap-2" style={{ marginTop: 12 }}>
            <button className="flex-1 active:scale-[0.98] transition-transform" style={{ background: LIME, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 16, padding: "14px 0", borderRadius: 14, border: `2px solid ${INK}` }}>Save to my kitchen</button>
            <button className="active:scale-[0.98] transition-transform" style={{ background: PAPER, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 16, padding: "14px 20px", borderRadius: 14, border: `2px solid ${INK}` }}>Share ↗</button>
          </div>
        </div>
      )}
    </div>
  );
}
