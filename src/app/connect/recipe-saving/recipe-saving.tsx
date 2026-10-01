"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function RecipeSaving() {
  const clientId = useSearchParams().get("client_id");
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [signIn, setSignIn] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      if (!clientId) throw new Error("Open the permission link from Marco in ChatGPT.");
      const response = await fetch(`/api/mcp/permissions?client_id=${encodeURIComponent(clientId)}`, { cache: "no-store" });
      const data = await response.json();
      if (!active) return;
      setSignIn(response.status === 401);
      if (!response.ok) throw new Error(data.error);
      setEnabled(data.enabled);
    }
    load().catch(e => { if (active) setError(e.message || "Permissions could not be loaded."); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [clientId, reload]);
  async function change() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/mcp/permissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_id: clientId, enabled: !enabled }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setEnabled(data.enabled);
    } catch (e) { setError(e instanceof Error ? e.message : "Permission could not be changed."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-4">
    {error && <p role="alert">{error}</p>}
    {signIn && <p><a href="/auth/login" target="_blank" rel="noreferrer" className="underline">Sign in to Marco</a>, then <button className="underline" onClick={() => { setError(""); setBusy(true); setReload(v => v + 1); }}>check sign-in again</button>.</p>}
    <p role="status">{busy ? "Please wait…" : enabled === null ? "" : enabled ? "Recipe saving is enabled. Return to ChatGPT and retry your save." : "Recipe saving is off. Your connection can still read your cooking data."}</p>
    {enabled !== null && <button disabled={busy} onClick={change} className="rounded-xl bg-[#1C1A17] text-white px-5 py-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-50">{enabled ? "Turn off recipe saving" : "Enable recipe saving"}</button>}
  </div>;
}
