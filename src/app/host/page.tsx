"use client";

// Host a live cooking class. Marco handles the listing + registration; the live
// session runs on a third-party room (Zoom / Meet / Daily / Whereby) you paste.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClass } from "@/lib/social";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const LIME = "#C4EE45";
const COBALT = "#2540E8";
const DISP = '"Marker Felt", Georgia, serif';
const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
const MONO = "ui-monospace, monospace";

const field: React.CSSProperties = { width: "100%", background: PAPER, border: `2px solid ${INK}`, borderRadius: 12, padding: "12px 14px", fontFamily: DISP, fontWeight: 700, fontSize: 16, color: INK, marginTop: 8 };
const label: React.CSSProperties = { fontFamily: MONO, fontSize: 11, letterSpacing: "0.14em", color: INK, textTransform: "uppercase", marginTop: 18, display: "block" };

export default function HostClass() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [dish, setDish] = useState("");
  const [desc, setDesc] = useState("");
  const [when, setWhen] = useState("");
  const [cap, setCap] = useState("12");
  const [room, setRoom] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (busy) return;
    if (!title.trim()) { setErr("give it a title"); return; }
    setBusy(true); setErr("");
    const c = await createClass({
      title: title.trim(), dish: dish.trim(), description: desc.trim(),
      startsAt: when ? new Date(when).toISOString() : null,
      capacity: Number(cap) || 12, roomUrl: room.trim(),
    });
    setBusy(false);
    if (c) router.push(`/class/${c.id}`);
    else setErr("couldn't create — try again");
  }

  return (
    <div className="min-h-[100dvh] w-full" style={{ background: "#E9E2D3", position: "relative", overflowX: "hidden" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)", backgroundSize: "13px 13px" }} />
      <div className="relative mx-auto w-full max-w-md px-5" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 16px)", paddingBottom: 120 }}>
        <div className="flex items-center justify-between">
          <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 26, color: INK }}>Host a class</span>
          <button onClick={() => router.back()} style={{ fontSize: 22, color: INK, background: "none", border: "none" }}>✕</button>
        </div>
        <div style={{ fontFamily: HAND, fontSize: 17, color: TOMATO, transform: "rotate(-1.5deg)", marginTop: 4 }}>teach your people to cook something good.</div>

        <label style={label}>class title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mom's Bengali fish curry" style={field} />

        <label style={label}>the dish</label>
        <input value={dish} onChange={(e) => setDish(e.target.value)} placeholder="what you'll cook together" style={field} />

        <label style={label}>what to expect</label>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="a cozy 45 min · we'll make it start to finish" rows={2} style={{ ...field, fontFamily: HAND, fontSize: 16, fontWeight: 400 }} />

        <div className="flex gap-3">
          <div className="flex-1">
            <label style={label}>when</label>
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} style={{ ...field, fontFamily: MONO, fontWeight: 400, fontSize: 13 }} />
          </div>
          <div style={{ width: 96 }}>
            <label style={label}>spots</label>
            <input type="number" value={cap} onChange={(e) => setCap(e.target.value)} min={1} max={200} style={{ ...field, textAlign: "center" }} />
          </div>
        </div>

        <label style={label}>video room link</label>
        <input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="paste a Zoom / Meet / Daily / Whereby link" style={{ ...field, fontFamily: MONO, fontWeight: 400, fontSize: 13 }} />
        <div style={{ fontFamily: HAND, fontSize: 14, color: INK, opacity: 0.55, marginTop: 6 }}>the class runs there — Marco handles the invites + who&apos;s coming.</div>

        <div style={{ marginTop: 18, background: LIME, border: `2px solid ${INK}`, borderRadius: 12, padding: "10px 14px", fontFamily: DISP, fontWeight: 700, fontSize: 14, color: INK, textAlign: "center" }}>free for now · 🍅 you can charge later</div>

        <button onClick={submit} disabled={busy} className="w-full active:scale-[0.98] transition-transform" style={{ marginTop: 18, background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 19, padding: "16px 0", borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: "0 10px 24px rgba(229,70,46,0.35)", opacity: busy ? 0.6 : 1 }}>{busy ? "creating…" : "Post the class 🎥"}</button>
        {err && <div style={{ fontFamily: HAND, fontSize: 15, color: TOMATO, marginTop: 12, textAlign: "center" }}>{err}</div>}
      </div>
    </div>
  );
}
