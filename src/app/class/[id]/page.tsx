"use client";

// A class page: who's hosting, when, and Join (opens the third-party room).
// Marco = listing + registration; the live session runs on the pasted room link.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getClass, registerForClass, isRegistered, type CookClass } from "@/lib/social";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const LIME = "#C4EE45";
const COBALT = "#2540E8";
const BUTTER = "#FFD84D";
const DISP = '"Marker Felt", Georgia, serif';
const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
const SANS = "system-ui, -apple-system, sans-serif";
const MONO = "ui-monospace, monospace";

function whenLabel(iso: string | null) {
  if (!iso) return "anytime";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function ClassPage() {
  const params = useParams();
  const id = String(params?.id ?? "");
  const [cls, setCls] = useState<CookClass | null>(null);
  const [reg, setReg] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [c, r] = await Promise.all([getClass(id), isRegistered(id)]);
      setCls(c); setReg(r); setLoading(false);
    })();
  }, [id]);

  async function register() {
    if (busy) return;
    setBusy(true);
    const ok = await registerForClass(id);
    setBusy(false);
    if (ok) setReg(true);
  }
  function joinLive() {
    if (cls?.room_url) { try { window.open(cls.room_url, "_blank"); } catch { /* ignore */ } }
  }

  if (loading) return <div style={{ minHeight: "100dvh", background: "#E9E2D3", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: HAND, color: INK }}>loading…</div>;
  if (!cls) return <div style={{ minHeight: "100dvh", background: "#E9E2D3", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: HAND, color: INK }}>class not found</div>;

  return (
    <div className="min-h-[100dvh] w-full" style={{ background: "#E9E2D3", position: "relative", overflowX: "hidden" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)", backgroundSize: "13px 13px" }} />
      <div className="relative mx-auto w-full max-w-md px-4" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 16px)", paddingBottom: 140 }}>
        {/* hero */}
        <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", border: `2.5px solid ${INK}`, boxShadow: "0 16px 34px rgba(23,20,16,0.2)", transform: "rotate(-1deg)" }}>
          <div style={{ height: 200, background: `linear-gradient(135deg, ${COBALT}, #101E63)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            {cls.cover_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={cls.cover_url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: 72 }} aria-hidden>🍳</span>}
            <div style={{ position: "absolute", top: 12, left: 12, background: LIME, color: INK, fontFamily: MONO, fontSize: 11, letterSpacing: "0.14em", padding: "5px 12px", borderRadius: 99, border: `2px solid ${INK}` }}>COOK WITH ME</div>
          </div>
        </div>

        <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 28, color: INK, lineHeight: 1.02, marginTop: 16 }}>{cls.title}</div>
        {cls.dish && <div style={{ fontFamily: HAND, fontSize: 18, color: TOMATO, marginTop: 4 }}>{cls.dish}</div>}

        <div className="flex items-center gap-2" style={{ marginTop: 14 }}>
          <div className="flex items-center justify-center" style={{ width: 34, height: 34, borderRadius: 99, background: BUTTER, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 15, border: `2px solid ${INK}` }}>{cls.host_avatar ?? "?"}</div>
          <div>
            <div style={{ fontFamily: SANS, fontSize: 14, color: INK }}>hosted by <b>{cls.host_name ?? "a cook"}</b></div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: INK, opacity: 0.6 }}>{whenLabel(cls.starts_at)} · {cls.capacity} spots · {cls.price_cents === 0 ? "free" : `$${(cls.price_cents / 100).toFixed(0)}`}</div>
          </div>
        </div>

        {cls.description && <div style={{ fontFamily: SANS, fontSize: 15, color: INK, marginTop: 16, lineHeight: 1.5, background: PAPER, border: `2px solid ${INK}`, borderRadius: 12, padding: "14px 16px" }}>{cls.description}</div>}

        {/* CTA */}
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, padding: "12px 16px calc(env(safe-area-inset-bottom,0px) + 16px)", background: "linear-gradient(to top, #E9E2D3 70%, transparent)" }}>
          <div className="mx-auto w-full max-w-md">
            {reg ? (
              <button onClick={joinLive} className="w-full active:scale-[0.98] transition-transform" style={{ background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 19, padding: "16px 0", borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: "0 10px 24px rgba(229,70,46,0.35)" }}>
                {cls.room_url ? "Join live 🎥 →" : "you're in ✓ (room link soon)"}
              </button>
            ) : (
              <button onClick={register} disabled={busy} className="w-full active:scale-[0.98] transition-transform" style={{ background: LIME, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 19, padding: "16px 0", borderRadius: 16, border: `2.5px solid ${INK}`, opacity: busy ? 0.6 : 1 }}>
                {busy ? "saving your spot…" : cls.price_cents === 0 ? "Save my spot · free" : `Join · $${(cls.price_cents / 100).toFixed(0)}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
