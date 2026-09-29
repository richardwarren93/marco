"use client";

// PROTOTYPE — Marco social pivot, My Kitchen: the personal hub. Expressive
// scrapbook (Cooked / Want to Cook / Potlucks / Classes) + calm FUNCTIONAL LAYERS
// you enter (Meal Plan, Grocery — the existing features, re-homed here). Dev-only.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, getUserCooks, type Cook } from "@/lib/social";

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

const WANT = [
  ["Weekend shakshuka", "/food/meal5.jpg", "Maya", PINK], ["Dan dan noodles", "/food/meal2.jpg", "Rohan", COBALT],
];

export default function KitchenHub() {
  const router = useRouter();
  const [me, setMe] = useState<{ name: string; avatar: string } | null>(null);
  const [cooked, setCooked] = useState<Cook[]>([]);
  useEffect(() => {
    (async () => {
      const m = await getMe();
      if (m) { setMe({ name: m.name, avatar: m.avatar }); setCooked(await getUserCooks(m.id)); }
    })();
  }, []);
  const openCook = (c: Cook) => { if (c.source_recipe_id) router.push(`/recipes/${c.source_recipe_id}`); };

  return (
    <div className="min-h-[100dvh] w-full" style={{ background: "#E9E2D3", position: "relative", overflowX: "hidden" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)", backgroundSize: "13px 13px" }} />

      <div className="relative mx-auto w-full max-w-md px-4" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 16px)", paddingBottom: 120 }}>
        {/* header */}
        <div className="flex items-center gap-3 px-1">
          <div className="flex items-center justify-center" style={{ width: 52, height: 52, borderRadius: 99, background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 22, border: `2.5px solid ${INK}`, transform: "rotate(-4deg)" }}>{me?.avatar ?? "·"}</div>
          <div>
            <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 26, color: INK, lineHeight: 1 }}>{me ? `${me.name}'s Kitchen` : "Your Kitchen"}</div>
            <div style={{ fontFamily: HAND, fontSize: 16, color: TOMATO }}>🍳 {cooked.length} cooked · a work in progress ♡</div>
          </div>
        </div>

        {/* FUNCTIONAL LAYERS — calm, you go into them */}
        <div className="flex gap-3" style={{ marginTop: 18 }}>
          <Link href="/meal-plan" className="flex-1 block active:scale-[0.98] transition-transform" style={{ background: PAPER, border: `2px solid ${INK}`, borderRadius: 14, padding: "13px 14px" }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 20 }} aria-hidden>🗓️</span>
              <span style={{ color: INK, opacity: 0.4, fontSize: 18 }}>›</span>
            </div>
            <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 16, color: INK, marginTop: 6 }}>This week</div>
            <div style={{ fontFamily: SANS, fontSize: 12, color: INK, opacity: 0.6 }}>4 dinners planned</div>
          </Link>
          <Link href="/grocery" className="flex-1 block active:scale-[0.98] transition-transform" style={{ background: PAPER, border: `2px solid ${INK}`, borderRadius: 14, padding: "13px 14px" }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 20 }} aria-hidden>🛒</span>
              <span style={{ color: INK, opacity: 0.4, fontSize: 18 }}>›</span>
            </div>
            <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 16, color: INK, marginTop: 6 }}>Grocery</div>
            <div style={{ fontFamily: SANS, fontSize: 12, color: INK, opacity: 0.6 }}>12 items · 3 aisles</div>
          </Link>
        </div>
        <div style={{ fontFamily: HAND, fontSize: 13, color: INK, opacity: 0.55, marginTop: 6, marginLeft: 4 }}>your plan + list live here — tap to open</div>

        {/* My recipes — the full collection (old recipe browser) */}
        <Link href="/recipes" className="w-full flex items-center gap-3 active:scale-[0.99] transition-transform" style={{ marginTop: 12, background: BUTTER, border: `2px solid ${INK}`, borderRadius: 14, padding: "13px 16px" }}>
          <span style={{ fontSize: 22 }} aria-hidden>📖</span>
          <div className="flex-1">
            <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 16, color: INK, lineHeight: 1 }}>My recipes</div>
            <div style={{ fontFamily: SANS, fontSize: 12.5, color: INK, opacity: 0.65, marginTop: 2 }}>everything you&apos;ve cooked &amp; saved</div>
          </div>
          <span style={{ color: INK, fontSize: 18, opacity: 0.5 }}>›</span>
        </Link>

        {/* COOKED — your real cooks, tap into the recipe */}
        <Section title="Cooked" hint="your real dishes" />
        {cooked.length === 0 ? (
          <div style={{ background: PAPER, border: `2px dashed ${INK}`, borderRadius: 14, padding: "18px", textAlign: "center", fontFamily: HAND, fontSize: 15, color: INK, opacity: 0.6 }}>nothing cooked yet — post an “I cooked” and it lands here.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {cooked.map((c, i) => (
              <button key={c.id} onClick={() => openCook(c)} style={{ background: "#fff", border: `2px solid ${INK}`, padding: 6, transform: `rotate(${i % 2 ? 2 : -2}deg)`, boxShadow: "0 8px 18px rgba(23,20,16,0.16)", textAlign: "left" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.photo_url ?? "/food/meal1.jpg"} alt="" style={{ width: "100%", height: 116, objectFit: "cover", display: "block" }} />
                <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: INK, marginTop: 5, lineHeight: 1.05 }}>{c.title ?? "a cook"}</div>
                {c.source_recipe_id && <div style={{ fontFamily: MONO, fontSize: 9, color: TOMATO, marginTop: 2 }}>📖 recipe ›</div>}
              </button>
            ))}
          </div>
        )}

        {/* WANT TO COOK — with provenance */}
        <Section title="Want to cook" hint="saved from your people" />
        <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {WANT.map(([name, img, who, c], i) => (
            <div key={name as string} style={{ flexShrink: 0, width: 168, background: PAPER, border: `2px solid ${INK}`, borderRadius: 12, overflow: "hidden", transform: `rotate(${i % 2 ? 1.5 : -1.5}deg)`, boxShadow: "0 8px 18px rgba(23,20,16,0.14)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img as string} alt="" style={{ width: "100%", height: 104, objectFit: "cover", display: "block" }} />
              <div style={{ padding: "8px 10px 10px" }}>
                <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 15, color: INK, lineHeight: 1.05 }}>{name as string}</div>
                <div style={{ display: "inline-block", marginTop: 5, background: c as string, color: INK, fontFamily: SANS, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, border: `1.5px solid ${INK}` }}>from {who as string}</div>
              </div>
            </div>
          ))}
        </div>

        {/* POTLUCKS */}
        <Section title="Potlucks" hint="cooked together" />
        <div style={{ background: TOMATO, border: `2.5px solid ${INK}`, borderRadius: 14, padding: 12, transform: "rotate(-1deg)", boxShadow: "0 10px 22px rgba(23,20,16,0.18)" }}>
          <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 18, color: PAPER }}>Something Spicy 🌶️</div>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em", color: PAPER, opacity: 0.85, marginBottom: 8 }}>5 COOKS · SUNDAY</div>
          <div className="flex gap-2">
            {["/food/meal3.jpg", "/food/meal2.jpg", "/food/meal4.jpg", "/food/meal5.jpg"].map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={p} alt="" style={{ width: 62, height: 62, objectFit: "cover", border: `2px solid ${PAPER}`, transform: `rotate(${i % 2 ? 3 : -3}deg)` }} />
            ))}
          </div>
        </div>

        {/* CLASSES */}
        <Section title="Classes" hint="cooked with a pro" />
        <div style={{ background: COBALT, border: `2.5px solid ${INK}`, borderRadius: 14, padding: "14px 16px", transform: "rotate(0.8deg)", color: PAPER }}>
          <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 18 }}>Mom&apos;s Bengali Fish Curry</div>
          <div style={{ fontFamily: HAND, fontSize: 15, color: LIME }}>with chef Ben · you were there ♡</div>
        </div>
      </div>

    </div>
  );
}

function Section({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex items-baseline gap-2 px-1" style={{ marginTop: 26, marginBottom: 12 }}>
      <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 20, color: INK }}>{title}</span>
      <span style={{ fontFamily: HAND, fontSize: 14, color: TOMATO }}>{hint}</span>
    </div>
  );
}
