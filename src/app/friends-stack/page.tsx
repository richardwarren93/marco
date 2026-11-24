"use client";

// Marco — the Table. Sacred to your crew: only your people's cooks. A "your
// table" seats visual up top shows who's here and pulls the rest in; the Marco
// floor lives in Explore, not here. All in the "beautiful chaos" language.

import { useEffect, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { saveCook, unsaveCook, joinCrewByCode, type Cook, type TableMember, type Crew } from "@/lib/social";
import CardPeek from "@/components/social/CardPeek";
import CookCard from "@/components/social/CookCard";
import PageHeader from "@/components/layout/PageHeader";
import TableLobby, { type LobbyPotluck } from "@/components/social/TableLobby";
import { DISPLAY, HAND, INK, INK_SOFT, LIME, PAPER, SURFACE, TOMATO } from "@/lib/theme";

const PENDING_CREW_KEY = "marco_pending_crew";


const DISP = DISPLAY;

const TREATMENTS = ["polaroid", "receipt", "poster"];
function hashStr(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

export default function FriendsFeed() {
  const router = useRouter();
  const [selectedTable, setSelectedTable] = useState("");
  const { data, error, mutate, isLoading } = useSWR<{ cooks: Cook[]; tables: { crew: Crew; members: TableMember[] }[]; me: TableMember; savedIds: string[]; potlucks: LobbyPotluck[]; coCooks: Record<string, string> }>(
    `/api/table${selectedTable ? `?table=${encodeURIComponent(selectedTable)}` : ""}`,
    async (url: string) => { const r = await fetch(url); const value = await r.json(); if (!r.ok) throw new Error(value.error || "Could not load your table."); return value; },
    { revalidateOnFocus: true, focusThrottleInterval: 30000, dedupingInterval: 10000, keepPreviousData: true },
  );
  const cooks = isLoading ? null : data?.cooks ?? null;
  const tables = data?.tables ?? [];
  const me = data?.me ?? null;
  const savedIds = new Set(data?.savedIds ?? []);
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => { async function finishInvite() {
    // Finish a pending invite join (from an invite link opened before sign-in).
    // Retry every load and only clear on success, so a not-yet-ready session
    // right after signup doesn't drop the invite.
    let pending: string | null = null;
    try { pending = localStorage.getItem(PENDING_CREW_KEY); } catch { /* ignore */ }
    if (pending) {
      const joined = await joinCrewByCode(pending);
      if (joined) { try { localStorage.removeItem(PENDING_CREW_KEY); } catch { /* ignore */ } await mutate(); }
    }
  } void finishInvite().catch(() => {}); }, [mutate]);
  useEffect(() => {
    let active = true;
    const cs = data?.cooks ?? [];
    // Lineage counts for the "cooked N×" stamp — true totals via the admin route.
    const rids = Array.from(new Set(cs.map((c) => c.source_recipe_id).filter((x): x is string => !!x)));
    if (rids.length) {
      void fetch("/api/recipes/lineage-counts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: rids }) })
        .then(r => r.ok ? r.json() : null).then(v => { if (active && v) setCounts(v.counts ?? {}); }).catch(() => {});
    }
    return () => { active = false; };
  }, [data?.cooks]);

  const real = cooks ?? [];

  return (
    <div className="min-h-[100dvh] w-full" style={{ background: SURFACE, position: "relative", overflowX: "hidden" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)", backgroundSize: "13px 13px" }} />

      <div className="relative mx-auto w-full max-w-md px-4" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 14px)", paddingBottom: 120 }}>
        <PageHeader title="Marco" subtitle="what are your people cooking?" avatar />

        {/* Every table as a room you can look into: who is in it, and what is
            on. The potluck line used to be a separate bar below, which said
            the same thing about only one table. */}
        <TableLobby
          tables={tables}
          potlucks={data?.potlucks ?? []}
          coCooks={data?.coCooks ?? {}}
          myId={me?.id ?? null}
          selected={selectedTable}
          onSelect={setSelectedTable}
          onNew={() => router.push("/crew")}
        />
        {error && <div role="alert" className="mt-4 rounded-xl bg-white p-4"><p>{error.message}</p><button className="underline mt-2" onClick={() => mutate()}>Try again</button></div>}

        {/* ===== loading ===== */}
        {cooks === null && !error && (
          <div style={{ fontFamily: HAND, fontSize: 16, color: INK, opacity: 0.5, marginTop: 20, textAlign: "center" }}>loading your table…</div>
        )}

        {/* ===== your crew's cooks — the whole point ===== */}
        {cooks !== null && (
          real.length > 0 ? (
            <div style={{ marginTop: 20 }}>
              <div className="flex items-baseline gap-2 px-1" style={{ marginBottom: 10 }}>
                <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 18, color: INK }}>hot off the stove 🔥</span>
                {selectedTable && (
                  <span style={{ fontFamily: HAND, fontSize: 14, color: INK_SOFT }}>
                    {tables.find((t) => t.crew.id === selectedTable)?.crew.name}
                  </span>
                )}
              </div>
              <div className="space-y-5">
                {(() => {
                  // random treatment, but never the same as the card above it
                  let prev = "";
                  return real.map((c) => {
                    let t = c.card_treatment || "polaroid";
                    if (t === prev) { const opts = TREATMENTS.filter((x) => x !== prev); t = opts[hashStr(c.id) % opts.length]; }
                    prev = t;
                    return <RealCook key={c.id} c={c} treatment={t} myId={me?.id ?? null} initialSaved={savedIds.has(c.id)} cookedCount={c.source_recipe_id ? counts[c.source_recipe_id] : undefined} />;
                  });
                })()}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 18 }}><FirstCookCard onPost={() => router.push("/i-cooked")} /></div>
          )
        )}
      </div>

    </div>
  );
}


// The empty state's ONE job: post your first cook. Show a rotating PREVIEW of
// what a cook becomes so it feels worth doing (clearly a preview, never a fake
// post). Inviting lives in the lobby above, so this never repeats it.
function FirstCookCard({ onPost }: { onPost: () => void }) {
  return (
    <div style={{ marginTop: 8, textAlign: "center" }}>
      <div style={{ fontFamily: HAND, fontSize: 16, color: TOMATO, transform: "rotate(-1.5deg)" }}>here&apos;s what your cook becomes ✨</div>
      <div style={{ maxWidth: 268, margin: "12px auto 0" }}><CardPeek /></div>
      <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 20, color: INK, marginTop: 18 }}>your table starts with one cook</div>
      <button onClick={onPost} className="active:scale-[0.97] transition-transform" style={{ marginTop: 12, background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 17, padding: "13px 26px", borderRadius: 14, border: `2.5px solid ${INK}`, boxShadow: "0 10px 24px rgba(229,70,46,0.32)" }}>I cooked something</button>
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

function RealCook({ c, featured = false, treatment, myId = null, initialSaved = false, cookedCount }: { c: Cook; featured?: boolean; treatment?: string; myId?: string | null; initialSaved?: boolean; cookedCount?: number }) {
  const [saved, setSaved] = useState(initialSaved);
  const router = useRouter();
  const isMine = !!myId && c.user_id === myId;
  const rid = c.source_recipe_id;
  const openRecipe = () => rid && router.push(`/recipes/${rid}`);
  async function toggleSave() {
    if (saved) { setSaved(false); const ok = await unsaveCook(c.id); if (!ok) setSaved(true); }
    else { setSaved(true); const ok = await saveCook(c); if (!ok) setSaved(false); }
  }
  return (
    <div style={{ position: "relative" }}>
      {featured ? (
        <div style={{ position: "absolute", top: -11, right: 16, zIndex: 5, background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 11, letterSpacing: "0.04em", padding: "4px 11px", borderRadius: 99, border: `2px solid ${INK}`, transform: "rotate(5deg)", boxShadow: "0 4px 10px rgba(23,20,16,0.2)" }}>🍅 from Marco</div>
      ) : isMine ? (
        <div style={{ position: "absolute", top: -11, right: 16, zIndex: 5, background: LIME, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 11, letterSpacing: "0.04em", padding: "4px 11px", borderRadius: 99, border: `2px solid ${INK}`, transform: "rotate(5deg)", boxShadow: "0 4px 10px rgba(23,20,16,0.2)" }}>✦ your cook</div>
      ) : null}
      {/* actions live INSIDE the card (see CookCard) so it's clear they belong
          to this cook — the whole card also opens the recipe on tap */}
      <CookCard
        treatment={treatment ?? c.card_treatment}
        photo={c.photo_url ?? ""}
        title={c.title ?? ""}
        note={c.note ?? ""}
        authorName={isMine ? "you" : (c.author_name ?? "someone")}
        authorAvatar={c.author_avatar ?? "?"}
        timeLabel={timeAgo(c.created_at)}
        h={180}
        cookedCount={cookedCount}
        onOpen={rid ? openRecipe : undefined}
        onCook={rid && !isMine ? () => router.push(`/i-cooked?recipe=${rid}`) : undefined}
        onToggleSave={rid && !isMine ? toggleSave : undefined}
        onPlan={rid ? () => router.push(`/recipes/${rid}?openMealSheet=true`) : undefined}
        saved={rid ? (isMine || saved) : false}
      />
      {!rid && (
        <div style={{ marginTop: 10, textAlign: "center", fontFamily: HAND, fontSize: 13.5, color: INK, opacity: 0.5 }}>no recipe on this one yet</div>
      )}
    </div>
  );
}
