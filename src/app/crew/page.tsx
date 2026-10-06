"use client";

// Crews — the cold-start solver. Create a crew or join one by invite code, and
// share your code so friends land in a populated table.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyCrews, createCrew, joinCrewByCode, type Crew } from "@/lib/social";
import { TableChatButton } from "@/components/people/GroupChats";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const LIME = "#C4EE45";
const COBALT = "#2540E8";
const DISP = '"Marker Felt", Georgia, serif';
const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
const SANS = "system-ui, -apple-system, sans-serif";
const MONO = "ui-monospace, monospace";

export default function CrewPage() {
  const router = useRouter();
  const [crews, setCrews] = useState<Crew[] | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => { getMyCrews().then(setCrews).catch(() => { setCrews([]); setErr("Your tables could not be loaded. Refresh to retry."); }); }, []);

  async function create() {
    if (!name.trim() || busy) return;
    setBusy(true); setErr("");
    try {
    const c = await createCrew(name.trim());
    if (c) { setCrews((cs) => [...(cs ?? []), c]); setName(""); }
    else setErr("couldn't create — try again");
    } catch { setErr("Your table could not be created. Try again."); }
    finally { setBusy(false); }
  }
  async function join() {
    if (!code.trim() || busy) return;
    setBusy(true); setErr("");
    try {
    const c = await joinCrewByCode(code.trim());
    if (c) { setCrews((cs) => [...(cs ?? []).filter((x) => x.id !== c.id), c]); setCode(""); }
    else setErr("no table with that code");
    } catch { setErr("Your table could not be joined. Try again."); }
    finally { setBusy(false); }
  }
  async function copyCode(c: Crew) {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://marco-eta-lyart.vercel.app";
    const link = `${origin}/join/${c.invite_code}`;
    const msg = `come sit at my table on Marco 🍅\n${link}\n(or enter code ${c.invite_code})`;
    try {
      if (navigator.share) { await navigator.share({ title: `Join ${c.name} on Marco`, text: msg, url: link }); }
      else { await navigator.clipboard.writeText(msg); }
      setCopied(c.id); setTimeout(() => setCopied(""), 1500);
    } catch { /* user dismissed share sheet, or clipboard blocked */ }
  }

  return (
    <div className="min-h-[100dvh] w-full" style={{ background: "#E9E2D3", position: "relative", overflowX: "hidden" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)", backgroundSize: "13px 13px" }} />
      <div className="relative mx-auto w-full max-w-md px-5" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 16px)", paddingBottom: 120 }}>
        <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 30, color: INK, lineHeight: 1 }}>Your tables</div>
        <div style={{ fontFamily: HAND, fontSize: 17, color: TOMATO, transform: "rotate(-2deg)", marginTop: 5 }}>your people. your table.</div>

        {/* existing crews */}
        {crews === null ? (
          <div style={{ fontFamily: SANS, fontSize: 14, color: INK, opacity: 0.6, marginTop: 20 }}>loading…</div>
        ) : crews.length > 0 ? (
          <div className="space-y-3" style={{ marginTop: 18 }}>
            {crews.map((c) => (
              <div key={c.id} style={{ background: PAPER, border: `2.5px solid ${INK}`, borderRadius: 16, padding: 16, transform: "rotate(-0.6deg)", boxShadow: "0 8px 18px rgba(23,20,16,0.14)" }}>
                <div className="flex items-center justify-between">
                  <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 22, color: INK }}>{c.emoji} {c.name}</div>
                </div>
                <div className="flex items-center gap-2" style={{ marginTop: 10 }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: INK, opacity: 0.6 }}>invite code</span>
                  <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 15, letterSpacing: "0.2em", color: INK, background: LIME, border: `2px solid ${INK}`, borderRadius: 8, padding: "3px 10px" }}>{c.invite_code}</span>
                  <button onClick={() => copyCode(c)} style={{ fontFamily: DISP, fontWeight: 700, fontSize: 13, color: PAPER, background: INK, borderRadius: 99, padding: "6px 14px", border: "none" }}>{copied === c.id ? "shared ✓" : "invite"}</button>
                </div>
                {/* each table gets its own group chat with Marco */}
                <TableChatButton crewId={c.id} name={c.name} emoji={c.emoji} />
              </div>
            ))}
            <button onClick={() => router.push("/friends-stack")} className="w-full active:scale-[0.98] transition-transform" style={{ marginTop: 6, background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 18, padding: "15px 0", borderRadius: 16, border: `2.5px solid ${INK}` }}>Go to the table →</button>
          </div>
        ) : (
          <div style={{ fontFamily: HAND, fontSize: 16, color: INK, marginTop: 18, opacity: 0.7 }}>no table yet — start one or join with a code.</div>
        )}

        {/* create */}
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.14em", color: INK, textTransform: "uppercase", marginTop: 28 }}>start a table</div>
        <div className="flex gap-2" style={{ marginTop: 10 }}>
          <input aria-label="New table name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. the usual suspects" maxLength={30}
            style={{ flex: 1, background: PAPER, border: `2px solid ${INK}`, borderRadius: 12, padding: "12px 14px", fontFamily: DISP, fontWeight: 700, fontSize: 16, color: INK }} />
          <button onClick={create} disabled={busy} className="active:scale-95 transition-transform" style={{ background: INK, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 16, padding: "12px 20px", borderRadius: 12, border: "none" }}>Create</button>
        </div>

        {/* join */}
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.14em", color: INK, textTransform: "uppercase", marginTop: 22 }}>join with a code</div>
        <div className="flex gap-2" style={{ marginTop: 10 }}>
          <input aria-label="Table invite code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="8-char code" maxLength={8}
            style={{ flex: 1, background: PAPER, border: `2px solid ${INK}`, borderRadius: 12, padding: "12px 14px", fontFamily: MONO, fontWeight: 700, fontSize: 16, letterSpacing: "0.2em", color: INK }} />
          <button onClick={join} disabled={busy} className="active:scale-95 transition-transform" style={{ background: COBALT, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 16, padding: "12px 20px", borderRadius: 12, border: "none" }}>Join</button>
        </div>

        {err && <div style={{ fontFamily: HAND, fontSize: 15, color: TOMATO, marginTop: 12 }}>{err}</div>}
      </div>
    </div>
  );
}
