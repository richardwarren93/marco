"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import type { Crew } from "@/lib/social";

interface Potluck { id: string; crew_id: string; theme: string; deadline: string | null; status: string; submissions: { id: string; user_id: string; cook: { title: string; source_recipe_id: string | null } | null }[] }
const fetcher = async (url: string) => { const r = await fetch(url); const data = await r.json(); if (!r.ok) throw new Error(data.error || "Could not load potlucks."); return data; };
export default function PotluckPage() { return <Suspense fallback={<p role="status">Loading potlucks…</p>}><Potlucks /></Suspense>; }
function Potlucks() {
  const search = useSearchParams();
  const [table, setTable] = useState(search.get("table") || "");
  const [theme, setTheme] = useState("");
  const [deadline, setDeadline] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [choices, setChoices] = useState<Record<string, string>>({});
  const { data: tables } = useSWR<{ tables: { crew: Crew }[] }>("/api/table", fetcher);
  const { data, error, mutate } = useSWR<{ userId: string; potlucks: Potluck[]; cooks: { id: string; title: string; crew_id: string | null }[] }>(`/api/potlucks${table ? `?table=${encodeURIComponent(table)}` : ""}`, fetcher);
  async function act(body: object) {
    setBusy(true); setMessage("");
    try { const r = await fetch("/api/potlucks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const v = await r.json(); if (!r.ok) throw new Error(v.error); await mutate(); setMessage("Saved to your table."); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Could not save. Try again."); }
    finally { setBusy(false); }
  }
  return <div className="min-h-full bg-[#E9E2D3] px-4 py-6 pb-28 text-[#171410]"><div className="max-w-lg mx-auto space-y-5">
    <Link href="/friends-stack" className="text-sm underline">‹ Back to Table</Link>
    <header><h1 className="text-3xl font-bold" style={{ fontFamily: '"Marker Felt", Georgia, serif' }}>Potluck</h1><p className="mt-2 text-[#675B4E]">Pick a theme. Bring a dish. Cook with your people.</p></header>
    <label className="block text-sm font-semibold">Your table<select value={table} onChange={e => setTable(e.target.value)} className="block w-full mt-2 rounded-xl border-2 border-[#171410] bg-[#FBF7EE] p-3"><option value="">All tables</option>{tables?.tables.map(({ crew }) => <option key={crew.id} value={crew.id}>{crew.name}</option>)}</select></label>
    {tables?.tables.length === 0 && <Link href="/crew" className="block underline">Create or join a table to start a potluck.</Link>}
    <details className="rounded-2xl border-2 border-[#171410] bg-[#FFD84D] p-4"><summary className="cursor-pointer font-bold">+ Start a potluck</summary>
      <form className="mt-4 space-y-3" onSubmit={e => { e.preventDefault(); void act({ action: "create", crew_id: table, theme, deadline }); }}>
        {!table && <p className="text-sm">Choose a table above first.</p>}
        <label className="block text-sm">Theme<input required maxLength={100} value={theme} onChange={e => setTheme(e.target.value)} placeholder="Pasta night, childhood favourites…" className="block w-full mt-1 rounded-lg bg-white p-3" /></label>
        <label className="block text-sm">Cook by<input required type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="block w-full mt-1 rounded-lg bg-white p-3" /></label>
        <button disabled={busy || !table} className="rounded-xl bg-[#171410] text-white px-5 py-3 disabled:opacity-50">Create potluck</button>
      </form>
    </details>
    {message && <p role="status">{message}</p>}
    {error && <p role="alert">{error.message} <button className="underline" onClick={() => mutate()}>Retry</button></p>}
    {!data && !error && <p role="status">Loading potlucks…</p>}
    {data?.potlucks.length === 0 && <p className="rounded-xl bg-[#FBF7EE] p-5">No potlucks yet. Start one for your table.</p>}
    {data?.potlucks.map(p => <section key={p.id} className="rounded-2xl border-2 border-[#171410] bg-[#FBF7EE] p-5 space-y-3">
      <h2 className="text-xl font-bold">{p.theme}</h2><p className="text-sm text-[#675B4E]">{tables?.tables.find(t => t.crew.id === p.crew_id)?.crew.name}{p.deadline ? ` · Cook by ${new Date(p.deadline + "T12:00:00").toLocaleDateString()}` : ""} · {p.submissions.length} dishes</p>
      <ul className="space-y-2">{p.submissions.map(s => <li key={s.id}>{s.cook?.source_recipe_id ? <Link className="underline" href={`/recipes/${s.cook.source_recipe_id}`}>{s.cook.title}</Link> : s.cook?.title || "A dish"}{s.user_id === data.userId ? " · yours" : ""}</li>)}</ul>
      {p.submissions.some(s => s.user_id === data.userId) ? <p className="text-sm font-semibold">✓ Your dish is on the table</p> : p.status === "active" && <div className="space-y-2">
        <label className="block text-sm">Add one of your dishes<select aria-label={`Dish for ${p.theme}`} value={choices[p.id] || ""} onChange={e => setChoices(v => ({ ...v, [p.id]: e.target.value }))} className="block w-full mt-1 border rounded-lg p-2"><option value="">Choose a cook from this table</option>{data.cooks.filter(c => c.crew_id === p.crew_id).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
        <button disabled={busy || !choices[p.id]} onClick={() => act({ action: "submit", potluck_id: p.id, cook_id: choices[p.id] })} className="rounded-lg bg-[#171410] text-white px-4 py-2 disabled:opacity-40">Bring this dish</button>
        <Link className="block text-sm underline" href={`/i-cooked?table=${p.crew_id}`}>Post a new cook</Link>
      </div>}
    </section>)}
  </div></div>;
}
