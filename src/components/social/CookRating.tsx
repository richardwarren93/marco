"use client";

/* Beli-style cook rating — fired right after you post a cook. Pick how it felt
   (loved / fine / nope), then place it with a few head-to-head comparisons
   against dishes you've already ranked (binary search). Produces a score +
   rank that feeds your taste. Beautiful-chaos throughout. */

import { useState } from "react";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const LIME = "#C4EE45";
const BUTTER = "#FFD84D";
const LAV = "#C9B8FF";
const COBALT = "#2540E8";
const DISP = '"Marker Felt", Georgia, serif';
const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
const SANS = "system-ui, -apple-system, sans-serif";

type Sentiment = "loved" | "fine" | "nope";
type Item = { recipe_id: string; score: number; title: string; image_url: string | null };
const RANGE: Record<Sentiment, [number, number]> = { loved: [6.67, 10], fine: [3.33, 6.67], nope: [0, 3.33] };
const SENTIMENTS: { k: Sentiment; label: string; emoji: string; c: string }[] = [
  { k: "loved", label: "Loved it", emoji: "😍", c: LIME },
  { k: "fine", label: "It was fine", emoji: "🙂", c: BUTTER },
  { k: "nope", label: "Not for me", emoji: "😬", c: LAV },
];
const MAX_COMPARISONS = 5;

function Photo({ src, h = 150 }: { src: string | null; h?: number }) {
  if (!src) return <div className="flex items-center justify-center" style={{ width: "100%", height: h, background: "rgba(255,216,77,0.3)", fontSize: 40, borderRadius: 7, border: `2px solid ${INK}` }}>🍳</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" referrerPolicy="no-referrer" style={{ width: "100%", height: h, objectFit: "cover", display: "block", borderRadius: 7, border: `2px solid ${INK}` }} />;
}

export default function CookRating({ recipeId, title, photo, onDone }: { recipeId: string; title: string; photo: string | null; onDone: () => void }) {
  const [phase, setPhase] = useState<"sentiment" | "loading" | "compare" | "saving" | "done">("sentiment");
  const [sentiment, setSentiment] = useState<Sentiment>("loved");
  const [items, setItems] = useState<Item[]>([]);
  const [lo, setLo] = useState(0);
  const [hi, setHi] = useState(0);
  const [comps, setComps] = useState(0);
  const [result, setResult] = useState<{ rank: number; total: number } | null>(null);

  async function finalize(s: Sentiment, list: Item[], pos: number) {
    setPhase("saving");
    const [min, max] = RANGE[s];
    const below = list[pos - 1]?.score ?? min;
    const above = list[pos]?.score ?? max;
    const score = Math.round(((below + above) / 2) * 100) / 100;
    try { await fetch("/api/cook-ratings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipe_id: recipeId, sentiment: s, score }) }); } catch { /* best-effort */ }
    setResult({ rank: list.length + 1 - pos, total: list.length + 1 });
    setPhase("done");
  }

  async function pickSentiment(s: Sentiment) {
    setSentiment(s);
    setPhase("loading");
    let list: Item[] = [];
    try {
      const r = await fetch(`/api/cook-ratings?sentiment=${s}`, { cache: "no-store" });
      if (r.ok) list = ((await r.json()).items ?? []).filter((x: Item) => x.recipe_id !== recipeId);
    } catch { /* best-effort */ }
    setItems(list);
    if (list.length === 0) { await finalize(s, list, 0); return; }
    setLo(0); setHi(list.length); setComps(0); setPhase("compare");
  }

  // User picked which dish they liked more. `newWins` = they prefer the cook
  // being rated over the comparison dish.
  function choose(newWins: boolean) {
    const mid = Math.floor((lo + hi) / 2);
    const nlo = newWins ? mid + 1 : lo;   // asc by score: preferred → higher index
    const nhi = newWins ? hi : mid;
    const nComps = comps + 1;
    if (nlo >= nhi || nComps >= MAX_COMPARISONS) { void finalize(sentiment, items, newWins ? mid + 1 : nlo); return; }
    setLo(nlo); setHi(nhi); setComps(nComps);
  }

  const frame: React.CSSProperties = { minHeight: "100dvh", background: "#E9E2D3", backgroundImage: "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)", backgroundSize: "13px 13px", color: INK };

  // ── Sentiment ──────────────────────────────────────────────────────────────
  if (phase === "sentiment" || phase === "loading") {
    return (
      <div className="flex flex-col" style={{ ...frame, padding: "0 22px", paddingTop: "calc(env(safe-area-inset-top,0px) + 40px)" }}>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="relative" style={{ background: "#fff", padding: 8, border: `2.5px solid ${INK}`, transform: "rotate(-2deg)", boxShadow: "0 16px 34px rgba(23,20,16,0.22)", maxWidth: 190 }}>
            <Photo src={photo} h={150} />
          </div>
          <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 28, lineHeight: 1.08, color: INK, marginTop: 22 }}>How was the {title || "cook"}?</h1>
          <div style={{ fontFamily: HAND, fontSize: 16, color: TOMATO, transform: "rotate(-1deg)", marginTop: 4 }}>be honest — Marco learns your taste</div>
          <div className="w-full" style={{ marginTop: 26, maxWidth: 360 }}>
            {SENTIMENTS.map((s) => (
              <button key={s.k} disabled={phase === "loading"} onClick={() => pickSentiment(s.k)} className="mb-3 flex w-full items-center gap-3 transition-transform active:scale-[0.98] disabled:opacity-60" style={{ background: s.c, border: `2.5px solid ${INK}`, borderRadius: 16, padding: "15px 18px", boxShadow: "0 7px 16px rgba(23,20,16,0.13)" }}>
                <span style={{ fontSize: 26 }}>{s.emoji}</span>
                <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 19, color: INK }}>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
        <button onClick={onDone} className="mx-auto" style={{ fontFamily: HAND, fontSize: 15, color: INK, opacity: 0.5, background: "none", border: "none", padding: "16px 0" }}>skip rating</button>
      </div>
    );
  }

  // ── Compare ────────────────────────────────────────────────────────────────
  if (phase === "compare" || phase === "saving") {
    const mid = Math.floor((lo + hi) / 2);
    const other = items[mid];
    const estTotal = Math.min(MAX_COMPARISONS, Math.ceil(Math.log2(items.length + 1)) || 1);
    return (
      <div className="flex flex-col" style={{ ...frame, padding: "0 18px", paddingTop: "calc(env(safe-area-inset-top,0px) + 44px)" }}>
        <div className="text-center">
          <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 27, lineHeight: 1.05, color: INK }}>Which did you<br />like more?</h1>
          <div style={{ fontFamily: HAND, fontSize: 15.5, color: TOMATO, transform: "rotate(-1deg)", marginTop: 3 }}>tap the one you&apos;d cook again</div>
        </div>
        <div className="relative flex flex-1 items-center justify-center" style={{ gap: 10, maxHeight: 420 }}>
          <CompareCard title={title} src={photo} tag="just cooked" onClick={() => choose(true)} rot={-2} />
          <div className="absolute flex items-center justify-center" style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%) rotate(-6deg)", width: 40, height: 40, borderRadius: 99, background: INK, color: BUTTER, fontFamily: DISP, fontWeight: 700, fontSize: 14, border: `2.5px solid ${PAPER}`, zIndex: 3 }}>VS</div>
          <CompareCard title={other?.title ?? ""} src={other?.image_url ?? null} tag="your pick" onClick={() => choose(false)} rot={2} />
        </div>
        <div className="flex items-center justify-center gap-1.5" style={{ padding: "16px 0 26px" }}>
          {Array.from({ length: estTotal }).map((_, i) => <span key={i} style={{ width: i === comps ? 20 : 8, height: 8, borderRadius: 99, background: i <= comps ? TOMATO : "rgba(23,20,16,0.2)", transition: "all .2s" }} />)}
        </div>
      </div>
    );
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  const s = SENTIMENTS.find((x) => x.k === sentiment)!;
  return (
    <div className="flex flex-col items-center justify-center text-center" style={{ ...frame, padding: "0 26px" }}>
      <div style={{ fontSize: 58 }}>{s.emoji}</div>
      <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 32, color: INK, marginTop: 8 }}>Ranked!</h1>
      <svg width="150" height="11" viewBox="0 0 150 11" fill="none" aria-hidden className="mx-auto" style={{ marginTop: 2 }}><path d="M2 7 C 26 2, 50 10, 76 6 S 128 2, 148 6" stroke={TOMATO} strokeWidth="3.5" strokeLinecap="round" /></svg>
      <p className="mx-auto" style={{ fontFamily: SANS, fontSize: 16, color: "#4A4742", marginTop: 16, lineHeight: 1.5, maxWidth: "19rem" }}>
        <b style={{ color: INK }}>{title || "This cook"}</b> is <b style={{ color: INK }}>#{result?.rank}</b> of {result?.total} in your <b style={{ color: INK }}>{s.label.toLowerCase()}</b> dishes.
      </p>
      <div style={{ fontFamily: HAND, fontSize: 15.5, color: TOMATO, marginTop: 10, transform: "rotate(-1deg)" }}>the more you cook, the sharper this gets</div>
      <button onClick={onDone} className="transition-transform active:scale-[0.98]" style={{ marginTop: 28, background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 18, padding: "15px 34px", borderRadius: 14, border: `2.5px solid ${INK}`, boxShadow: "0 10px 24px rgba(229,70,46,0.3)" }}>Done →</button>
    </div>
  );
}

function CompareCard({ title, src, tag, onClick, rot }: { title: string; src: string | null; tag: string; onClick: () => void; rot: number }) {
  return (
    <button onClick={onClick} className="flex-1 transition-transform active:scale-[0.96]" style={{ position: "relative", background: PAPER, border: `2.5px solid ${INK}`, borderRadius: 14, padding: 8, transform: `rotate(${rot}deg)`, boxShadow: "0 12px 26px rgba(23,20,16,0.2)", maxWidth: 180 }}>
      <span className="absolute" style={{ top: -10, left: "50%", transform: "translateX(-50%) rotate(-3deg)", background: COBALT, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 10, padding: "3px 9px", borderRadius: 99, border: `2px solid ${INK}`, whiteSpace: "nowrap", zIndex: 2 }}>{tag}</span>
      <Photo src={src} h={132} />
      <div className="truncate" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: INK, marginTop: 7, padding: "0 2px" }}>{title || "A dish"}</div>
    </button>
  );
}
