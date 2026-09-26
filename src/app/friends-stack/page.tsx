"use client";

// PROTOTYPE — Marco social pivot: the Friends feed as a VARIETY of auto-generated
// module types (hero cook card, weekly roundup, friend note, "you missed" rec,
// potluck invite, cooks-to-discover), all in the "beautiful chaos" language.
// Real sample photos via loremflickr with graphic fallback. Dev-only.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTableCooks, saveCook, type Cook } from "@/lib/social";

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

function Photo({ img, h, emoji, tint = COBALT, style }: { img?: string; h: number; emoji: string; tint?: string; style?: React.CSSProperties }) {
  const [err, setErr] = useState(false);
  if (!img || err) return <div style={{ height: h, width: "100%", background: `linear-gradient(135deg, ${tint}, #101E63)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: h * 0.42, ...style }} aria-hidden>{emoji}</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={img} alt="" onError={() => setErr(true)} style={{ height: h, width: "100%", objectFit: "cover", display: "block", ...style }} />;
}
function Tape({ style }: { style?: React.CSSProperties }) {
  return <div style={{ position: "absolute", width: 80, height: 24, background: "rgba(255,216,77,0.82)", ...style }} />;
}
function Scribble({ color = TOMATO, w = 180 }: { color?: string; w?: number }) {
  return <svg width={w} height="11" viewBox="0 0 180 11" fill="none" aria-hidden style={{ display: "block" }}><path d="M2 7 C 28 2, 52 10, 78 6 S 132 2, 178 6" stroke={color} strokeWidth="3.5" strokeLinecap="round" /></svg>;
}

export default function FriendsFeed() {
  const router = useRouter();
  const [cooks, setCooks] = useState<Cook[] | null>(null);
  useEffect(() => { getTableCooks().then(setCooks); }, []);
  return (
    <div className="min-h-[100dvh] w-full" style={{ background: "#E9E2D3", position: "relative", overflowX: "hidden" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)", backgroundSize: "13px 13px" }} />

      <div className="relative mx-auto w-full max-w-md px-4" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 14px)", paddingBottom: 120 }}>
        {/* header */}
        <div className="flex items-end justify-between px-1">
          <div>
            <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 30, letterSpacing: "-0.02em", color: INK, lineHeight: 1 }}>Marco</div>
            <div style={{ fontFamily: HAND, fontSize: 17, color: TOMATO, transform: "rotate(-2deg)", marginTop: 5 }}>what are your people cooking?</div>
          </div>
          <div className="flex items-center justify-center" style={{ width: 42, height: 42, borderRadius: 99, background: INK, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 16, transform: "rotate(5deg)", border: `2px solid ${LIME}` }}>S</div>
        </div>

        {/* filter pills */}
        <div className="flex gap-2 overflow-x-auto py-3 px-1" style={{ scrollbarWidth: "none" }}>
          {[["tonight", TOMATO], ["quick ⚡", BUTTER], ["veggie", LIME], ["potlucks", PINK], ["new cooks", LAV]].map(([t, c], i) => (
            <span key={t} style={{ flexShrink: 0, background: i === 0 ? INK : PAPER, color: i === 0 ? PAPER : INK, border: `2px solid ${INK}`, borderRadius: 99, padding: "6px 14px", fontFamily: DISP, fontWeight: 700, fontSize: 13, transform: `rotate(${i % 2 ? 1 : -1}deg)` }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 99, background: c as string, marginRight: 6, verticalAlign: "middle" }} />{t as string}
            </span>
          ))}
        </div>

        {/* ===== Real cooks from your crew ===== */}
        {cooks === null ? (
          <div style={{ fontFamily: HAND, fontSize: 16, color: INK, opacity: 0.5, marginTop: 20, textAlign: "center" }}>loading your table…</div>
        ) : cooks.length > 0 ? (
          <div className="space-y-5" style={{ marginTop: 8 }}>
            {cooks.map((c) => <RealCook key={c.id} c={c} />)}
          </div>
        ) : (
          <div style={{ marginTop: 16, background: PAPER, border: `2.5px dashed ${INK}`, borderRadius: 16, padding: "22px 18px", textAlign: "center" }}>
            <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 20, color: INK }}>your table&apos;s quiet 🍽️</div>
            <div style={{ fontFamily: HAND, fontSize: 16, color: TOMATO, marginTop: 4 }}>be the first to cook — or pull your people in</div>
            <div className="flex gap-2 justify-center" style={{ marginTop: 14 }}>
              <button onClick={() => router.push("/i-cooked")} style={{ background: INK, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 15, padding: "11px 18px", borderRadius: 12, border: "none" }}>I cooked something</button>
              <button onClick={() => router.push("/crew")} style={{ background: LIME, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 15, padding: "11px 18px", borderRadius: 12, border: `2px solid ${INK}` }}>my crew</button>
            </div>
          </div>
        )}

        {/* ===== MODULE 2 — weekly roundup (ranked, horizontal) ===== */}
        <div style={{ marginTop: 26 }}>
          <div className="flex items-baseline justify-between px-1">
            <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 18, color: INK }}>your people this week</span>
            <span style={{ fontFamily: HAND, fontSize: 15, color: COBALT, transform: "rotate(-2deg)" }}>🔥 6 cooked</span>
          </div>
          <div className="flex gap-3 overflow-x-auto py-3 px-1" style={{ scrollbarWidth: "none" }}>
            {[["Pork dumplings", "/food/meal2.jpg", "Rohan", ORANGE], ["Chili tacos", "/food/meal3.jpg", "Maya", PINK], ["Cacio e pepe", "/food/meal4.jpg", "Alex", LIME]].map(([name, img, who, c], i) => (
              <div key={name as string} style={{ flexShrink: 0, width: 156, background: PAPER, borderRadius: 12, border: `2px solid ${INK}`, overflow: "hidden", transform: `rotate(${i % 2 ? 1.5 : -1.5}deg)`, boxShadow: "0 8px 20px rgba(23,20,16,0.14)" }}>
                <div style={{ position: "relative" }}>
                  <Photo img={img as string} h={110} emoji="🍽️" tint={c as string} />
                  <div className="flex items-center justify-center" style={{ position: "absolute", top: 8, left: 8, width: 28, height: 28, borderRadius: 99, background: INK, color: c as string, fontFamily: DISP, fontWeight: 700, fontSize: 14, border: `2px solid ${PAPER}` }}>{i + 1}</div>
                </div>
                <div style={{ padding: "8px 10px 10px" }}>
                  <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 15, color: INK, lineHeight: 1.05 }}>{name as string}</div>
                  <div style={{ fontFamily: HAND, fontSize: 14, color: TOMATO }}>{who as string}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== MODULE 3 — "you gotta make this" highlighted rec ===== */}
        <div style={{ marginTop: 22, transform: "rotate(0.8deg)" }}>
          <div style={{ background: LIME, borderRadius: 14, border: `2.5px solid ${INK}`, padding: 14, boxShadow: "0 12px 26px rgba(23,20,16,0.16)" }}>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.15em", color: "#3B5200", textTransform: "uppercase" }}>maya says you gotta make this</div>
            <div className="flex gap-3" style={{ marginTop: 10 }}>
              <div style={{ flexShrink: 0, width: 96, borderRadius: 10, overflow: "hidden", border: `2px solid ${INK}`, transform: "rotate(-2deg)" }}>
                <Photo img="/food/meal5.jpg" h={96} emoji="🍳" tint={ORANGE} />
              </div>
              <div className="min-w-0 flex-1">
                <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 20, color: INK, lineHeight: 1.05 }}>Weekend Shakshuka</div>
                <div style={{ fontFamily: HAND, fontSize: 16, color: "#2B4A00", marginTop: 3 }}>“15 min, one pan, unreal.”</div>
                <button style={{ marginTop: 8, background: INK, color: LIME, fontFamily: DISP, fontWeight: 700, fontSize: 13, padding: "8px 14px", borderRadius: 99, border: "none" }}>Add to my kitchen</button>
              </div>
            </div>
          </div>
        </div>

        {/* ===== MODULE 4 — friend note (light receipt) ===== */}
        <div style={{ marginTop: 22, transform: "rotate(-0.8deg)" }}>
          <div style={{ background: PAPER, borderRadius: 6, borderTop: `3px solid ${INK}`, padding: "14px 16px 16px", boxShadow: "0 8px 20px rgba(23,20,16,0.12)" }}>
            <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.14em", color: INK, textTransform: "uppercase" }}>· cooked your recipe ·</div>
            <div className="flex items-center gap-2" style={{ marginTop: 6 }}>
              <div className="flex items-center justify-center" style={{ width: 22, height: 22, borderRadius: 99, background: COBALT, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 10 }}>R</div>
              <span style={{ fontFamily: SANS, fontSize: 13, color: INK }}><b>Rohan</b> made your chili oil noodles</span>
            </div>
            <div style={{ fontFamily: HAND, fontSize: 17, color: COBALT, marginTop: 6, transform: "rotate(-1deg)" }}>added crispy garlic 🔥 10/10 would slurp again</div>
          </div>
        </div>

        {/* ===== MODULE 5 — potluck invite ===== */}
        <div style={{ marginTop: 22, transform: "rotate(1.4deg)" }}>
          <div style={{ background: PINK, borderRadius: 14, border: `2.5px solid ${INK}`, padding: "16px 18px", boxShadow: "0 12px 26px rgba(23,20,16,0.18)", position: "relative" }}>
            <Tape style={{ top: -9, right: 22, background: "rgba(196,238,69,0.9)", transform: "rotate(6deg)" }} />
            <div className="flex items-center justify-between">
              <div>
                <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.16em", color: "#5A0033", textTransform: "uppercase" }}>potluck · this sunday</div>
                <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 23, color: PAPER, marginTop: 3, lineHeight: 1.02 }}>Something Spicy 🌶️</div>
                <div style={{ fontFamily: HAND, fontSize: 15, color: PAPER, marginTop: 2 }}>Maya + 4 cooking</div>
              </div>
              <button style={{ background: INK, color: PINK, fontFamily: DISP, fontWeight: 700, fontSize: 16, padding: "11px 20px", borderRadius: 99, border: `2px solid ${PAPER}`, transform: "rotate(3deg)" }}>Join</button>
            </div>
          </div>
        </div>

        {/* ===== MODULE 6 — cooks to discover ===== */}
        <div style={{ marginTop: 26 }}>
          <div className="px-1" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 18, color: INK }}>cooks worth stealing from</div>
          <div className="flex gap-3 overflow-x-auto py-3 px-1" style={{ scrollbarWidth: "none" }}>
            {[["priya", "35 cooks", LAV, 41], ["ben", "chef · thai", BUTTER, 42], ["noor", "28 cooks", PINK, 43]].map(([n, m, c, seed], i) => (
              <div key={n as string} style={{ flexShrink: 0, width: 120, background: PAPER, borderRadius: 12, border: `2px solid ${INK}`, padding: 10, textAlign: "center", transform: `rotate(${i % 2 ? -2 : 2}deg)` }}>
                <div style={{ width: 56, height: 56, borderRadius: 99, margin: "0 auto", overflow: "hidden", border: `2.5px solid ${c as string}` }}>
                  <Photo h={56} emoji="👩‍🍳" tint={c as string} />
                </div>
                <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 15, color: INK, marginTop: 6 }}>{n as string}</div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: INK, opacity: 0.7 }}>{m as string}</div>
                <button style={{ marginTop: 6, width: "100%", background: INK, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 12, padding: "6px 0", borderRadius: 99, border: "none" }}>Follow</button>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function RealCook({ c }: { c: Cook }) {
  const [saved, setSaved] = useState(false);
  return (
    <div style={{ transform: "rotate(-1.2deg)" }}>
      <div style={{ position: "relative", background: PAPER, borderRadius: 12, padding: 14, boxShadow: "0 18px 40px rgba(23,20,16,0.22)", border: `2px solid ${INK}` }}>
        <div style={{ position: "relative", transform: "rotate(1.2deg)" }}>
          <Tape style={{ top: -8, left: "50%", marginLeft: -40, transform: "rotate(-4deg)" }} />
          <div style={{ background: "#fff", padding: 8, border: `1px solid rgba(23,20,16,0.12)`, boxShadow: "0 6px 14px rgba(23,20,16,0.14)" }}>
            <Photo img={c.photo_url ?? undefined} h={196} emoji="🍳" />
          </div>
        </div>
        <div style={{ padding: "14px 4px 0" }}>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center" style={{ width: 24, height: 24, borderRadius: 99, background: PINK, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 11, border: `1.5px solid ${INK}` }}>{c.author_avatar ?? "?"}</div>
            <span style={{ fontFamily: SANS, fontSize: 13, color: INK }}><b>{c.author_name ?? "someone"}</b> cooked · {timeAgo(c.created_at)}</span>
          </div>
          {c.title && <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 27, color: INK, lineHeight: 1.02, marginTop: 8 }}>{c.title}</div>}
          <div style={{ marginTop: 2, marginLeft: 2 }}><Scribble /></div>
          {c.note && <div style={{ fontFamily: HAND, fontSize: 18, color: TOMATO, marginTop: 8, transform: "rotate(-1deg)" }}>{c.note}</div>}
        </div>
        <div className="flex items-center gap-2" style={{ marginTop: 14 }}>
          <button onClick={async () => { if (!saved) { await saveCook(c); setSaved(true); } }} className="flex-1 active:scale-[0.97] transition-transform" style={{ background: saved ? LIME : INK, color: saved ? INK : PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 15, padding: "12px 0", borderRadius: 12, border: `2px solid ${INK}` }}>{saved ? "✓ in your kitchen" : "Add to my kitchen"}</button>
          <button style={{ background: BUTTER, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 15, padding: "12px 16px", borderRadius: 12, border: `2px solid ${INK}` }}>Cook</button>
        </div>
      </div>
    </div>
  );
}
