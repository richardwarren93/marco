"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

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
  return <main className="mx-auto max-w-lg px-6 py-12 space-y-6">
    <Link href="/kitchen" className="underline">‹ Kitchen</Link>
    <h1 className="text-4xl font-serif">Marco in iMessage</h1>
    <p>Marco saves any public recipe link you text him — no setup needed. Link your number here to see and manage everything in the app, and to keep your saves if you switch phones.</p>
    <p className="text-sm">Your messages pass through Photon. This connection can save recipes; it cannot buy groceries or change existing recipes. Reminders are not enabled yet.</p>
    {error && <p role="alert">{error}</p>}
    {account && !signIn && <p className="text-sm">Marco account: {account}</p>}
    {signIn ? <p><a href="/auth/login" target="_blank" rel="noreferrer" className="underline">Sign in to Marco</a>, then return here and <button className="underline" onClick={() => request()}>check sign-in</button>.</p> : linked !== null && <>
      <p role="status">{linked ? "Your number is linked to this account." : "Your number isn't linked yet."}</p>
      <button disabled={busy} onClick={() => request(linked ? "DELETE" : "POST")} className="rounded-xl bg-black text-white px-5 py-3 disabled:opacity-50">{linked ? "Unlink my number" : "Link my number"}</button>
    </>}
    {code && <div className="rounded-xl border p-5 space-y-3">
      <p>Send this to Marco in a direct message within 10 minutes to link your number. Keep it private.</p>
      {marcoNumber && <a href={`sms:${marcoNumber}&body=${encodeURIComponent(`link ${code}`)}`} className="inline-block rounded-xl bg-black text-white px-5 py-3">Send to Marco ➜</a>}
      <p className="text-sm">{marcoNumber ? "…or copy this and text it to Marco:" : "Copy this and text it to Marco:"}</p>
      <code className="block break-all select-all">link {code}</code>
      <button className="underline" onClick={() => request()}>I sent it — check connection</button>
    </div>}
    {!signIn && !code && <button disabled={busy} className="block underline" onClick={() => request()}>Refresh connection</button>}
  </main>;
}
