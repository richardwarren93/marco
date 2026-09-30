"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { OAuthAuthorizationDetails } from "@supabase/supabase-js";

export default function Consent() {
  const id = useSearchParams().get("authorization_id");
  const supabase = useMemo(() => createClient(), []);
  const [signedIn, setSignedIn] = useState(false);
  const [details, setDetails] = useState<OAuthAuthorizationDetails | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!id) { setError("Open this page from the Marco connection flow in ChatGPT."); setBusy(false); return; }
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!active) return;
      if (userError || !user) { setSignedIn(false); setBusy(false); return; }
      setSignedIn(true);
      const response = await fetch(`/api/mcp/authorization?authorization_id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await response.json();
      if (!active) return;
      if (!response.ok) setError(data.error ?? "Connection request could not be loaded.");
      else if (data.redirect_url) window.location.assign(data.redirect_url);
      else setDetails(data);
      setBusy(false);
    }
    load().catch(() => { if (active) { setError("Connection could not be loaded. Try again from ChatGPT."); setBusy(false); } });
    return () => { active = false; };
  }, [id, supabase, reload]);

  async function login(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setPassword("");
      if (error) { setError("Sign-in failed. Check your email and password."); setBusy(false); }
      else setReload(value => value + 1);
    } catch { setError("Sign-in is unavailable. Try again shortly."); setBusy(false); }
  }
  async function decide(decision: "approve" | "deny") {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/mcp/authorization", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorization_id: id, decision }) });
      const data = await response.json();
      if (!response.ok || !data.redirect_url) throw new Error("Connection could not be completed. Try again from ChatGPT.");
      window.location.assign(data.redirect_url);
    } catch { setError("Connection could not be completed. Try again from ChatGPT."); setBusy(false); }
  }
  const button = "rounded-xl border-2 border-[#1C1A17] px-5 py-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-50";
  return <div className="space-y-5">
    {error && <p role="alert" className="text-red-800">{error}</p>}
    {busy && <p role="status">Please wait…</p>}
    {!signedIn && id && <form onSubmit={login} className="space-y-4">
      <p>Sign in with your existing Marco account to review the connection.</p>
      <label className="block">Email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className="block w-full rounded-lg border p-3 mt-1" /></label>
      <label className="block">Password<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="block w-full rounded-lg border p-3 mt-1" /></label>
      <button disabled={busy} className={button}>Sign in</button>
      <p className="text-sm">Use Apple sign-in in <a className="underline" href="/auth/login" target="_blank" rel="noreferrer">Marco</a> if needed, then <button type="button" className="underline" onClick={() => { setBusy(true); setReload(v => v + 1); }}>check sign-in again</button>.</p>
    </form>}
    {details && <>
      <h2 className="text-xl font-bold">Allow {details.client.name} to read Marco?</h2>
      <p>Connected account: {details.user.email}</p>
      <ul className="list-disc pl-5 space-y-2">
        <li>Read your saved recipes, ingredients, and cooking steps.</li>
        <li>Read your meal plan and pantry.</li>
        <li>Read your saved grocery lists, including your shared household list.</li>
        <li>Use your account identity and email to link the connection.</li>
      </ul>
      <p>This free plugin cannot change your data, send messages, or buy groceries. Results requested in ChatGPT are shared with OpenAI.</p>
      <p className="text-sm">Requested identity permissions: {details.scope || "Account access"}</p>
      <div className="flex flex-wrap gap-3">
        <button disabled={busy} className={`${button} bg-[#1C1A17] text-white`} onClick={() => decide("approve")}>Allow access</button>
        <button disabled={busy} className={button} onClick={() => decide("deny")}>Cancel</button>
      </div>
      <p className="text-sm">You can disconnect Marco in ChatGPT’s plugin settings. <a className="underline" href="/privacy">Privacy policy</a> · <a className="underline" href="/terms">Terms</a></p>
    </>}
  </div>;
}
