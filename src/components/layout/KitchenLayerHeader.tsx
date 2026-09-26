"use client";

// Zany header for the Kitchen's functional layers (Meal Plan, Grocery). Gives the
// utility surfaces an on-brand entry + a way back to the Kitchen, while the
// functional body underneath stays calm and legible (§11).

import Link from "next/link";

const INK = "#171410";
const TOMATO = "#E5462E";
const LIME = "#C4EE45";
const DISP = '"Marker Felt", Georgia, serif';
const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
const MONO = "ui-monospace, monospace";

export default function KitchenLayerHeader({ title, sub, emoji }: { title: string; sub: string; emoji?: string }) {
  return (
    <div style={{ background: "#E9E2D3", borderBottom: `2.5px solid ${INK}`, padding: "calc(env(safe-area-inset-top,0px) + 12px) 18px 12px", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)", backgroundSize: "13px 13px", pointerEvents: "none" }} />
      <Link href="/kitchen" className="inline-flex items-center gap-1" style={{ fontFamily: MONO, fontSize: 11.5, letterSpacing: "0.06em", color: INK, textDecoration: "none" }}>
        <span style={{ fontSize: 15 }}>‹</span> back to kitchen
      </Link>
      <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
        <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 27, color: INK, lineHeight: 1 }}>{title}</div>
        {emoji && <span style={{ fontSize: 22 }} aria-hidden>{emoji}</span>}
      </div>
      <div style={{ fontFamily: HAND, fontSize: 16, color: TOMATO, transform: "rotate(-1.5deg)", marginTop: 3 }}>{sub}</div>
      <div style={{ height: 4, width: 46, background: LIME, borderRadius: 99, border: `1.5px solid ${INK}`, marginTop: 8 }} />
    </div>
  );
}
