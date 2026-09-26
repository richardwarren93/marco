"use client";

// Marco — the Table. Your crew's real cooks first, then an honest "Fresh from
// Marco" featured floor so a brand-new table is alive but never fakes friends.
// A persistent invite/post nudge keeps the cold-start action one tap away.
// All in the "beautiful chaos" language.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTableCooks, saveCook, joinCrewByCode, type Cook } from "@/lib/social";

const PENDING_CREW_KEY = "marco_pending_crew";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const COBALT = "#2540E8";
const LIME = "#C4EE45";
const PINK = "#FF4D9D";
const BUTTER = "#FFD84D";
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
  useEffect(() => {
    (async () => {
      // If they arrived via an invite link before signing in, finish the join now.
      let pending: string | null = null;
      try { pending = localStorage.getItem(PENDING_CREW_KEY); } catch { /* ignore */ }
      if (pending) {
        await joinCrewByCode(pending);
        try { localStorage.removeItem(PENDING_CREW_KEY); } catch { /* ignore */ }
      }
      setCooks(await getTableCooks());
    })();
  }, []);

  const real = cooks?.filter((c) => !c.is_featured) ?? [];
  const featured = cooks?.filter((c) => c.is_featured) ?? [];
  const totallyEmpty = cooks !== null && cooks.length === 0;

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

        {/* persistent cold-start nudge — always one tap from pulling people in */}
        <button onClick={() => router.push("/crew")} className="w-full active:scale-[0.98] transition-transform" style={{ marginTop: 4, marginBottom: 4, background: COBALT, border: `2.5px solid ${INK}`, borderRadius: 14, padding: "11px 14px", textAlign: "left", transform: "rotate(-0.6deg)", boxShadow: "0 10px 22px rgba(37,64,232,0.22)", position: "relative" }}>
          <Tape style={{ top: -9, right: 18, background: "rgba(196,238,69,0.9)", transform: "rotate(7deg)" }} />
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 26 }} aria-hidden>🍽️</span>
            <div className="flex-1">
              <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 16, color: PAPER, lineHeight: 1 }}>pull your people in</div>
              <div style={{ fontFamily: HAND, fontSize: 14.5, color: BUTTER, marginTop: 2 }}>share your table code · the feed gets real fast</div>
            </div>
            <span style={{ color: PAPER, fontSize: 20, opacity: 0.8 }}>›</span>
          </div>
        </button>

        {/* ===== loading ===== */}
        {cooks === null && (
          <div style={{ fontFamily: HAND, fontSize: 16, color: INK, opacity: 0.5, marginTop: 20, textAlign: "center" }}>loading your table…</div>
        )}

        {/* ===== real crew cooks ===== */}
        {real.length > 0 && (
          <div className="space-y-5" style={{ marginTop: 8 }}>
            {real.map((c) => <RealCook key={c.id} c={c} />)}
          </div>
        )}

        {/* ===== honest featured floor ===== */}
        {featured.length > 0 && (
          <div style={{ marginTop: real.length > 0 ? 28 : 10 }}>
            <div className="flex items-baseline gap-2 px-1">
              <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 18, color: INK }}>Fresh from Marco 🍅</span>
              <span style={{ fontFamily: HAND, fontSize: 14, color: TOMATO, transform: "rotate(-2deg)" }}>while your table fills up</span>
            </div>
            <div className="space-y-5" style={{ marginTop: 10 }}>
              {featured.map((c) => <RealCook key={c.id} c={c} featured />)}
            </div>
          </div>
        )}

        {/* ===== truly empty (no featured seeded yet either) ===== */}
        {totallyEmpty && (
          <div style={{ marginTop: 16, background: PAPER, border: `2.5px dashed ${INK}`, borderRadius: 16, padding: "22px 18px", textAlign: "center" }}>
            <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 20, color: INK }}>your table&apos;s quiet 🍽️</div>
            <div style={{ fontFamily: HAND, fontSize: 16, color: TOMATO, marginTop: 4 }}>be the first to cook — or pull your people in</div>
            <div className="flex gap-2 justify-center" style={{ marginTop: 14 }}>
              <button onClick={() => router.push("/i-cooked")} style={{ background: INK, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 15, padding: "11px 18px", borderRadius: 12, border: "none" }}>I cooked something</button>
              <button onClick={() => router.push("/crew")} style={{ background: LIME, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 15, padding: "11px 18px", borderRadius: 12, border: `2px solid ${INK}` }}>my crew</button>
            </div>
          </div>
        )}
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

function RealCook({ c, featured = false }: { c: Cook; featured?: boolean }) {
  const [saved, setSaved] = useState(false);
  return (
    <div style={{ transform: "rotate(-1.2deg)" }}>
      <div style={{ position: "relative", background: PAPER, borderRadius: 12, padding: 14, boxShadow: "0 18px 40px rgba(23,20,16,0.22)", border: `2px solid ${INK}` }}>
        {featured && (
          <div style={{ position: "absolute", top: -11, right: 16, zIndex: 2, background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 11, letterSpacing: "0.04em", padding: "4px 11px", borderRadius: 99, border: `2px solid ${INK}`, transform: "rotate(5deg)", boxShadow: "0 4px 10px rgba(23,20,16,0.2)" }}>🍅 from Marco</div>
        )}
        <div style={{ position: "relative", transform: "rotate(1.2deg)" }}>
          <Tape style={{ top: -8, left: "50%", marginLeft: -40, transform: "rotate(-4deg)" }} />
          <div style={{ background: "#fff", padding: 8, border: `1px solid rgba(23,20,16,0.12)`, boxShadow: "0 6px 14px rgba(23,20,16,0.14)" }}>
            <Photo img={c.photo_url ?? undefined} h={196} emoji="🍳" />
          </div>
        </div>
        <div style={{ padding: "14px 4px 0" }}>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center" style={{ width: 24, height: 24, borderRadius: 99, background: featured ? TOMATO : PINK, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 11, border: `1.5px solid ${INK}` }}>{c.author_avatar ?? "?"}</div>
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
