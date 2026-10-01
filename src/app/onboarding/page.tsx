"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [destination, setDestination] = useState("/friends-stack");
  useEffect(() => {
    let active = true;
    async function load() {
      const r = await fetch("/api/profile", { cache: "no-store" });
      if (r.status === 401) { router.replace("/auth/login"); return; }
      if (!r.ok) throw new Error("Your profile could not be loaded. Please retry.");
      const data = await r.json();
      if (!active) return;
      if (data.profile?.onboarding_completed) { router.replace("/friends-stack"); return; }
      setName(data.profile?.display_name || ""); setReady(true);
    }
    void load().catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [router, reload]);
  async function finish(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const r = await fetch("/api/onboarding/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ display_name: name }) });
      const value = await r.json(); if (!r.ok) throw new Error(value.error || "Could not save your setup.");
      let pending = false; try { pending = !!localStorage.getItem("marco_pending_crew"); } catch {}
      router.replace(pending ? "/friends-stack" : destination); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save. Try again."); setBusy(false); }
  }
  return <div className="min-h-[100dvh] bg-[#E9E2D3] px-6 py-12 text-[#171410]"><div className="max-w-md mx-auto">
    <p className="font-bold text-[#A13924] mb-5">MARCO</p><h1 className="text-4xl font-bold" style={{ fontFamily: '"Marker Felt", Georgia, serif' }}>Good food. Your people.</h1>
    <p className="mt-4 mb-8 text-[#675B4E]">Save what you want to cook, plan your week, and share what you make with your tables.</p>
    {error && <div role="alert" className="mb-4 rounded-xl bg-white p-4">{error}{!ready && <button className="block underline mt-2" onClick={() => { setError(""); setReload(v => v + 1); }}>Retry</button>}</div>}
    {!ready && !error && <p role="status">Getting your kitchen ready…</p>}
    {ready && <form onSubmit={finish} className="space-y-6">
      <label className="block font-semibold">What should we call you?<input autoComplete="given-name" required maxLength={60} value={name} onChange={e => setName(e.target.value)} className="block w-full mt-2 rounded-xl border-2 border-[#171410] bg-[#FBF7EE] px-4 py-3" /></label>
      <fieldset><legend className="font-semibold mb-3">Where would you like to start?</legend><div className="space-y-2">
        {[["/friends-stack", "Your table", "See your people and invite friends"], ["/recipes/new", "Save a recipe", "Bring a recipe into your kitchen"], ["/meal-plan", "Plan a meal", "Choose what to cook this week"]].map(([value, title, detail]) => <label key={value} className={`flex gap-3 rounded-xl border-2 p-4 cursor-pointer ${destination === value ? "border-[#171410] bg-[#FFD84D]" : "border-[#171410]/20 bg-[#FBF7EE]"}`}><input type="radio" name="destination" value={value} checked={destination === value} onChange={() => setDestination(value)} /><span><strong>{title}</strong><span className="block text-sm mt-1">{detail}</span></span></label>)}
      </div></fieldset>
      <button disabled={busy || !name.trim()} className="w-full rounded-xl bg-[#171410] text-white py-4 font-semibold disabled:opacity-50">{busy ? "Saving…" : "Let’s cook →"}</button>
      <p className="text-sm text-[#675B4E]">You can add dietary preferences and notifications later in your profile.</p>
    </form>}
  </div></div>;
}
