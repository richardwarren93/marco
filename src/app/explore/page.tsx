"use client";

// Marco — Explore: discovery beyond your circle. Trending dishes + cooks to
// follow are demo texture for now; "cook with a pro" is REAL live classes.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUpcomingClasses, type CookClass } from "@/lib/social";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const COBALT = "#2540E8";
const LIME = "#C4EE45";
const PINK = "#FF4D9D";
const BUTTER = "#FFD84D";
const LAV = "#C9B8FF";
const ORANGE = "#FF7A1A";

const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
const DISP = '"Marker Felt", Georgia, serif';
const SANS = "system-ui, -apple-system, sans-serif";
const MONO = "ui-monospace, monospace";

function whenLabel(iso: string | null) {
  if (!iso) return "anytime";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short" }) + " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function Explore() {
  const router = useRouter();
  const [classes, setClasses] = useState<CookClass[] | null>(null);
  useEffect(() => { getUpcomingClasses().then(setClasses); }, []);
  return (
    <div className="min-h-[100dvh] w-full" style={{ background: "#E9E2D3", position: "relative", overflowX: "hidden" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)", backgroundSize: "13px 13px" }} />
      <div className="relative mx-auto w-full max-w-md px-4" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 16px)", paddingBottom: 120 }}>
        <div className="px-1">
          <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 30, color: INK, lineHeight: 1 }}>Explore</div>
          <div style={{ fontFamily: HAND, fontSize: 17, color: TOMATO, transform: "rotate(-2deg)", marginTop: 5 }}>find cooks worth bringing into your world</div>
        </div>
        <div className="flex gap-2 overflow-x-auto py-3 px-1" style={{ scrollbarWidth: "none" }}>
          {[["trending", TOMATO], ["new cooks", LIME], ["chefs", COBALT], ["classes", PINK], ["lowkey", LAV]].map(([t, c], i) => (
            <span key={t as string} style={{ flexShrink: 0, background: i === 0 ? INK : PAPER, color: i === 0 ? PAPER : INK, border: `2px solid ${INK}`, borderRadius: 99, padding: "6px 14px", fontFamily: DISP, fontWeight: 700, fontSize: 13, transform: `rotate(${i % 2 ? 1 : -1}deg)` }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 99, background: c as string, marginRight: 6, verticalAlign: "middle" }} />{t as string}
            </span>
          ))}
        </div>

        {/* trending dishes */}
        <div className="px-1" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 18, color: INK, marginTop: 8 }}>trending in your city 🔥</div>
        <div className="flex gap-3 overflow-x-auto py-3 px-1" style={{ scrollbarWidth: "none" }}>
          {[["Birria tacos", "/food/meal3.jpg", "312 cooked", PINK], ["Gochujang wings", "/food/meal4.jpg", "204 cooked", LIME], ["Miso ramen", "/food/meal1.jpg", "188 cooked", COBALT]].map(([name, img, n, c], i) => (
            <div key={name as string} style={{ flexShrink: 0, width: 168, background: PAPER, border: `2px solid ${INK}`, borderRadius: 12, overflow: "hidden", transform: `rotate(${i % 2 ? 1.5 : -1.5}deg)`, boxShadow: "0 8px 18px rgba(23,20,16,0.14)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img as string} alt="" style={{ width: "100%", height: 116, objectFit: "cover", display: "block" }} />
              <div style={{ padding: "8px 10px 10px" }}>
                <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 15, color: INK, lineHeight: 1.05 }}>{name as string}</div>
                <div style={{ fontFamily: HAND, fontSize: 14, color: c as string }}>{n as string}</div>
              </div>
            </div>
          ))}
        </div>

        {/* cooks to discover */}
        <div className="px-1" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 18, color: INK, marginTop: 18 }}>cooks to follow</div>
        <div className="flex gap-3 overflow-x-auto py-3 px-1" style={{ scrollbarWidth: "none" }}>
          {[["priya", "35 cooks · veg", LAV], ["chef ben", "thai · 2 classes", BUTTER], ["noor", "28 cooks", PINK], ["marco", "the tomato", TOMATO]].map(([n, m, c], i) => (
            <div key={n as string} style={{ flexShrink: 0, width: 122, background: PAPER, borderRadius: 12, border: `2px solid ${INK}`, padding: 10, textAlign: "center", transform: `rotate(${i % 2 ? -2 : 2}deg)` }}>
              <div className="flex items-center justify-center" style={{ width: 56, height: 56, borderRadius: 99, margin: "0 auto", background: c as string, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 22, border: `2.5px solid ${INK}` }}>{(n as string)[0].toUpperCase()}</div>
              <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 15, color: INK, marginTop: 6 }}>{n as string}</div>
              <div style={{ fontFamily: MONO, fontSize: 9.5, color: INK, opacity: 0.7 }}>{m as string}</div>
              <button style={{ marginTop: 6, width: "100%", background: INK, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 12, padding: "6px 0", borderRadius: 99, border: "none" }}>Follow</button>
            </div>
          ))}
        </div>

        {/* cook with a pro — REAL classes */}
        <div className="flex items-baseline justify-between px-1" style={{ marginTop: 18 }}>
          <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 18, color: INK }}>cook with a pro</span>
          <button onClick={() => router.push("/host")} style={{ fontFamily: HAND, fontSize: 15, color: COBALT, background: "none", border: "none" }}>+ host one</button>
        </div>
        {classes === null ? (
          <div style={{ fontFamily: HAND, fontSize: 15, color: INK, opacity: 0.5, marginTop: 10 }}>loading classes…</div>
        ) : classes.length === 0 ? (
          <div style={{ marginTop: 10, background: PAPER, border: `2px dashed ${INK}`, borderRadius: 14, padding: 16, textAlign: "center" }}>
            <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 17, color: INK }}>no classes yet</div>
            <div style={{ fontFamily: HAND, fontSize: 15, color: TOMATO, marginTop: 2 }}>be the first to teach your people</div>
            <button onClick={() => router.push("/host")} style={{ marginTop: 10, background: INK, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 14, padding: "9px 18px", borderRadius: 99, border: "none" }}>Host a class 🎥</button>
          </div>
        ) : (
          <div className="space-y-3" style={{ marginTop: 10 }}>
            {classes.map((cl) => (
              <button key={cl.id} onClick={() => router.push(`/class/${cl.id}`)} className="w-full text-left active:scale-[0.98] transition-transform" style={{ background: COBALT, border: `2.5px solid ${INK}`, borderRadius: 16, padding: 14, color: PAPER, transform: "rotate(-0.6deg)", boxShadow: "0 12px 26px rgba(23,20,16,0.18)", position: "relative" }}>
                <div style={{ position: "absolute", top: -12, right: 16, background: LIME, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 11, padding: "4px 12px", borderRadius: 99, border: `2px solid ${INK}`, transform: "rotate(5deg)" }}>{cl.price_cents === 0 ? "free" : `$${(cl.price_cents / 100).toFixed(0)}`} · {whenLabel(cl.starts_at)}</div>
                <div className="flex gap-3">
                  <div style={{ flexShrink: 0, width: 92, height: 92, borderRadius: 10, overflow: "hidden", border: `2px solid ${PAPER}`, transform: "rotate(-2deg)", background: "#101E63", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>
                    {cl.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cl.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : <span aria-hidden>🍳</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.14em", color: LIME }}>COOK WITH ME</div>
                    <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 19, lineHeight: 1.02, marginTop: 2 }}>{cl.title}</div>
                    <div style={{ fontFamily: HAND, fontSize: 15, color: BUTTER, marginTop: 2 }}>{cl.host_name ?? "a cook"} · {cl.capacity} spots</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
