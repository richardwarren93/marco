"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const LIME = "#C4EE45";
const BUTTER = "#FFD84D";
const DISP = '"Marker Felt", Georgia, serif';
const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
const MONO = "ui-monospace, monospace";

export default function IMessageConnection() {
  const [linked, setLinked] = useState<boolean | null>(null);
  const [signIn, setSignIn] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [account, setAccount] = useState("");
  const [marcoNumber, setMarcoNumber] = useState("");
  async function request(method = "GET") {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/imessage/link", { method, cache: "no-store" });
      const v = await r.json(); setSignIn(r.status === 401);
      if (!r.ok) throw new Error(v.error);
      if (typeof v.linked === "boolean") setLinked(v.linked);
      if (v.account) setAccount(v.account);
      if (typeof v.marcoNumber === "string") setMarcoNumber(v.marcoNumber);
      setCode(v.code || "");
    } catch (e) { setError(e instanceof Error ? e.message : "Please retry."); }
    finally { setBusy(false); }
  }
  useEffect(() => { void request(); }, []);

  const primaryBtn: React.CSSProperties = { background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 17, padding: "13px 20px", borderRadius: 14, border: `2.5px solid ${INK}`, boxShadow: "0 8px 18px rgba(229,70,46,0.28)" };
  const outlineBtn: React.CSSProperties = { background: PAPER, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 15, padding: "11px 18px", borderRadius: 12, border: `2px solid ${INK}` };

  return (
    <main className="min-h-[100dvh] w-full" style={{ background: "#E9E2D3", backgroundImage: "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)", backgroundSize: "13px 13px" }}>
      <div className="mx-auto w-full max-w-lg px-6" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 20px)", paddingBottom: 48 }}>
        <Link href="/kitchen" style={{ fontFamily: HAND, fontSize: 16, color: INK }}>‹ Kitchen</Link>

        <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 38, letterSpacing: "-0.01em", color: INK, lineHeight: 1.02, marginTop: 14 }}>Marco in iMessage</h1>
        <svg width="186" height="11" viewBox="0 0 186 11" fill="none" aria-hidden className="block" style={{ marginTop: 2 }}><path d="M2 7 C 30 2, 56 10, 84 6 S 146 2, 184 6" stroke={TOMATO} strokeWidth="3.5" strokeLinecap="round" /></svg>

        <p style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 16, color: INK, marginTop: 18, lineHeight: 1.5 }}>
          Marco already saves any recipe link you text him — no setup. <b>Link your number</b> here to see &amp; manage everything in the app, and to keep your saves if you switch phones.
        </p>
        <p style={{ fontFamily: HAND, fontSize: 15, color: TOMATO, transform: "rotate(-1deg)", marginTop: 10 }}>saves recipes · can&apos;t buy groceries or edit recipes · reminders not on yet</p>

        {error && <p role="alert" style={{ fontFamily: DISP, fontWeight: 700, color: TOMATO, marginTop: 16 }}>{error}</p>}
        {account && !signIn && <p style={{ fontFamily: MONO, fontSize: 12.5, color: INK, opacity: 0.7, marginTop: 16 }}>account · {account}</p>}

        <div style={{ marginTop: 18 }}>
          {signIn ? (
            <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 15, color: INK, lineHeight: 1.5 }}>
              <a href="/auth/login" target="_blank" rel="noreferrer" style={{ fontWeight: 700, color: TOMATO, textDecoration: "underline" }}>Sign in to Marco</a>, then come back and{" "}
              <button onClick={() => request()} style={{ fontWeight: 700, color: INK, textDecoration: "underline", background: "none", border: "none" }}>check sign-in</button>.
            </p>
          ) : linked !== null && (
            <>
              <p role="status" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 16, color: INK, marginBottom: 12 }}>
                {linked ? "✓ Your number is linked." : "Your number isn't linked yet."}
              </p>
              <button disabled={busy} onClick={() => request(linked ? "DELETE" : "POST")} className="active:scale-[0.98] transition-transform disabled:opacity-50" style={linked ? outlineBtn : primaryBtn}>
                {linked ? "Unlink my number" : "Link my number →"}
              </button>
            </>
          )}
        </div>

        {code && (
          <div className="relative" style={{ marginTop: 22, background: PAPER, border: `2.5px solid ${INK}`, borderRadius: 16, padding: "22px 18px 18px", boxShadow: "0 12px 28px rgba(23,20,16,0.16)", transform: "rotate(-0.6deg)" }}>
            <div aria-hidden style={{ position: "absolute", top: -9, left: "50%", marginLeft: -36, width: 72, height: 20, background: BUTTER, transform: "rotate(-4deg)", border: `1px solid ${INK}` }} />
            <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 14.5, color: INK, lineHeight: 1.45 }}>Send this to Marco in a <b>direct message</b> within 10 minutes. Keep it private.</p>
            {marcoNumber && (
              <a href={`sms:${marcoNumber}&body=${encodeURIComponent(`link ${code}`)}`} className="inline-block active:scale-[0.98] transition-transform" style={{ ...primaryBtn, marginTop: 14 }}>Send to Marco ➜</a>
            )}
            <p style={{ fontFamily: HAND, fontSize: 15, color: INK, opacity: 0.7, marginTop: 12 }}>{marcoNumber ? "…or copy this and text it:" : "Copy this and text it to Marco:"}</p>
            <code className="block break-all select-all" style={{ fontFamily: MONO, fontSize: 14, color: INK, background: "#fff", border: `2px dashed ${INK}`, borderRadius: 10, padding: "10px 12px", marginTop: 6 }}>link {code}</code>
            <button onClick={() => request()} style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: TOMATO, background: "none", border: "none", marginTop: 14 }}>I sent it — check connection ↻</button>
          </div>
        )}

        {!signIn && !code && linked !== null && (
          <button disabled={busy} onClick={() => request()} style={{ display: "block", fontFamily: HAND, fontSize: 15, color: INK, opacity: 0.7, background: "none", border: "none", marginTop: 18 }}>refresh ↻</button>
        )}
      </div>
    </main>
  );
}
