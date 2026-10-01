"use client";

// Zany header for the Kitchen's functional layers (Meal Plan, Grocery). Gives the
// utility surfaces an on-brand entry + a way back to the Kitchen, while the
// functional body underneath stays calm and legible (§11).

import Link from "next/link";

const INK = "#171410";
const DISP = '"Marker Felt", Georgia, serif';
const MONO = "ui-monospace, monospace";

export default function KitchenLayerHeader({ title, sub, emoji }: { title: string; sub: string; emoji?: string }) {
  return (
    <header style={{ background: "#E9E2D3", padding: "calc(env(safe-area-inset-top,0px) + 12px) 18px 4px" }}>
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
      <Link href="/kitchen" className="inline-flex items-center gap-1" style={{ fontFamily: MONO, fontSize: 11.5, letterSpacing: "0.06em", color: INK, textDecoration: "none" }}>
        <span style={{ fontSize: 15 }}>‹</span> Kitchen
      </Link>
      <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
        <h1 title={sub} style={{ fontFamily: DISP, fontWeight: 700, fontSize: 24, color: INK, lineHeight: 1 }}>{title}</h1>
        {emoji && <span style={{ fontSize: 18 }} aria-hidden>{emoji}</span>}
      </div>
      </div>
    </header>
  );
}
