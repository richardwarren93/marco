"use client";

// Marco — the Table. Sacred to your crew: only your people's cooks. A "your
// table" seats visual up top shows who's here and pulls the rest in; the Marco
// floor lives in Explore, not here. All in the "beautiful chaos" language.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTableCooks, getTables, getMe, getSavedCookIds, saveCook, joinCrewByCode, type Cook, type TableMember, type Crew } from "@/lib/social";
import CardPeek from "@/components/social/CardPeek";
import CookCard from "@/components/social/CookCard";

const PENDING_CREW_KEY = "marco_pending_crew";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const COBALT = "#2540E8";
const LIME = "#C4EE45";
const PINK = "#FF4D9D";
const BUTTER = "#FFD84D";
const LAV = "#C9B8FF";

const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
const DISP = '"Marker Felt", Georgia, serif';
const SANS = "system-ui, -apple-system, sans-serif";
const MONO = "ui-monospace, monospace";

function Tape({ style }: { style?: React.CSSProperties }) {
  return <div style={{ position: "absolute", width: 80, height: 24, background: "rgba(255,216,77,0.82)", ...style }} />;
}

const TREATMENTS = ["polaroid", "receipt", "poster"];
function hashStr(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

export default function FriendsFeed() {
  const router = useRouter();
  const [cooks, setCooks] = useState<Cook[] | null>(null);
  const [tables, setTables] = useState<{ crew: Crew; members: TableMember[] }[]>([]);
  const [me, setMe] = useState<TableMember | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<Record<string, number>>({});
  const load = useCallback(async () => {
    // Finish a pending invite join (from an invite link opened before sign-in).
    // Retry every load and only clear on success, so a not-yet-ready session
    // right after signup doesn't drop the invite.
    let pending: string | null = null;
    try { pending = localStorage.getItem(PENDING_CREW_KEY); } catch { /* ignore */ }
    if (pending) {
      const joined = await joinCrewByCode(pending);
      if (joined) { try { localStorage.removeItem(PENDING_CREW_KEY); } catch { /* ignore */ } }
    }
    const [cs, tbls, meData, saved] = await Promise.all([getTableCooks(), getTables(), getMe(), getSavedCookIds()]);
    setCooks(cs);
    setTables(tbls);
    setSavedIds(new Set(saved));
    if (meData) setMe({ id: meData.id, name: meData.name, avatar: meData.avatar, isYou: true });
    // Lineage counts for the "cooked N×" stamp — true totals via the admin route.
    const rids = Array.from(new Set(cs.map((c) => c.source_recipe_id).filter((x): x is string => !!x)));
    if (rids.length) {
      try {
        const r = await fetch("/api/recipes/lineage-counts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: rids }) });
        if (r.ok) setCounts((await r.json()).counts ?? {});
      } catch { /* best-effort — the stamp just won't show */ }
    }
  }, []);

  useEffect(() => {
    load();
    // Refetch (and retry a pending invite) when the app returns to the foreground.
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.removeEventListener("focus", load); document.removeEventListener("visibilitychange", onVisible); };
  }, [load]);

  const real = cooks ?? [];

  return (
    <div className="min-h-[100dvh] w-full" style={{ background: "#E9E2D3", position: "relative", overflowX: "hidden" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)", backgroundSize: "13px 13px" }} />

      <div className="relative mx-auto w-full max-w-md px-4" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 14px)", paddingBottom: 120 }}>
        {/* header */}
        <div className="flex items-end justify-between px-1">
          <div>
            <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 30, letterSpacing: "-0.02em", color: INK, lineHeight: 1 }}>Marco</div>
            <div style={{ fontFamily: HAND, fontSize: 17, color: TOMATO, transform: "rotate(-2deg)", marginTop: 5 }}>what are your people cooking?</div>
          </div>
          <div className="flex items-center justify-center" style={{ width: 42, height: 42, borderRadius: 99, background: INK, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 16, transform: "rotate(5deg)", border: `2px solid ${LIME}` }}>S</div>
        </div>

        {/* your table — who's seated, and empty chairs to pull people in */}
        <TableSeats tables={tables} you={me} onInvite={() => router.push("/crew")} onMember={(mid) => router.push(`/u/${mid}`)} />

        {/* ===== loading ===== */}
        {cooks === null && (
          <div style={{ fontFamily: HAND, fontSize: 16, color: INK, opacity: 0.5, marginTop: 20, textAlign: "center" }}>loading your table…</div>
        )}

        {/* ===== your crew's cooks — the whole point ===== */}
        {cooks !== null && (
          real.length > 0 ? (
            <div style={{ marginTop: 20 }}>
              <div className="flex items-baseline gap-2 px-1" style={{ marginBottom: 10 }}>
                <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 18, color: INK }}>hot off the stove 🔥</span>
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

// "Your table" — a tabletop with your table seated around it and open chairs
// that pull the rest in. With multiple tables it rotates through them (the feed
// stays aggregate). The cold-start hero: even solo it reads as a table waiting.
const SEAT_COLORS = [LIME, BUTTER, PINK, LAV, "#FFB86B"];
function TableSeats({ tables, you, onInvite, onMember }: { tables: { crew: Crew; members: TableMember[] }[]; you: TableMember | null; onInvite: () => void; onMember: (id: string) => void }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (tables.length <= 1) return;
    const t = setInterval(() => setIdx((v) => (v + 1) % tables.length), 4200); // rotate through your tables
    return () => clearInterval(t);
  }, [tables.length]);

  const active = tables.length > 0 ? tables[Math.min(idx, tables.length - 1)] : null;
  const members = active ? active.members : (you ? [you] : []);
  const title = active ? `${active.crew.emoji ?? "🍽️"} ${active.crew.name}` : "your table";
  const filled = members.length;
  // Solo → several open chairs (invite-forward). Once your people are here, just
  // one open chair, so the table reads full instead of half-empty.
  const empties = filled >= 2 ? 1 : 3;
  const multi = tables.length > 1;

  return (
    <div style={{ marginTop: 12 }}>
      <div className="flex items-baseline justify-between px-1">
        <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 18, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "62%" }}>{title}</span>
        {multi ? (
          <div className="flex items-center gap-1.5">
            {tables.map((t, k) => (
              <button key={t.crew.id} onClick={() => setIdx(k)} aria-label={`Table ${k + 1}`} style={{ width: k === idx ? 20 : 8, height: 8, borderRadius: 99, background: k === idx ? INK : "rgba(23,20,16,0.2)", border: "none", transition: "width .2s" }} />
            ))}
          </div>
        ) : (
          <button onClick={onInvite} style={{ fontFamily: HAND, fontSize: 14.5, color: TOMATO, transform: "rotate(-2deg)", background: "none", border: "none" }}>
            {filled <= 1 ? "pull up some chairs →" : `${filled} seated · invite more →`}
          </button>
        )}
      </div>
      <div style={{ position: "relative", marginTop: 8, background: PAPER, border: `2.5px solid ${INK}`, borderRadius: 16, padding: "16px 10px 12px", boxShadow: "0 10px 22px rgba(23,20,16,0.14)", transform: "rotate(-0.5deg)" }}>
        <Tape style={{ top: -9, left: 22, transform: "rotate(-6deg)" }} />
        <div key={active?.crew.id ?? "solo"} className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none", animation: "seatFade .35s ease" }}>
          {members.map((m, i) => (
            <button key={m.id} onClick={() => onMember(m.id)} className="active:scale-95 transition-transform" style={{ flexShrink: 0, width: 64, textAlign: "center", background: "none", border: "none", padding: 0 }}>
              <div className="flex items-center justify-center" style={{ width: 48, height: 48, borderRadius: 99, margin: "0 auto", background: SEAT_COLORS[i % SEAT_COLORS.length], color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 19, border: `2.5px solid ${INK}`, transform: `rotate(${i % 2 ? 3 : -3}deg)` }}>{m.avatar}</div>
              <div style={{ fontFamily: SANS, fontSize: 11.5, color: INK, marginTop: 5, fontWeight: m.isYou ? 700 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.isYou ? "you" : m.name}</div>
            </button>
          ))}
          {Array.from({ length: empties }, (_, i) => (
            <button key={`e${i}`} onClick={onInvite} className="active:scale-95 transition-transform" style={{ flexShrink: 0, width: 64, textAlign: "center", background: "none", border: "none", padding: 0 }}>
              <div className="flex items-center justify-center" style={{ width: 48, height: 48, borderRadius: 99, margin: "0 auto", color: INK, fontSize: 22, border: `2.5px dashed ${INK}`, opacity: 0.5 }}>+</div>
              <div style={{ fontFamily: HAND, fontSize: 12.5, color: TOMATO, marginTop: 5 }}>invite</div>
            </button>
          ))}
        </div>
      </div>
      <style>{`@keyframes seatFade{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  );
}

// The empty state's ONE job: post your first cook. Show a rotating PREVIEW of
// what a cook becomes so it feels worth doing (clearly a preview, never a fake
// post). Inviting lives in the seats visual above, so this never repeats it.
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
  return (
    <div>
      {/* the card itself opens the recipe — tapping it is the obvious gesture */}
      <button onClick={openRecipe} disabled={!rid} aria-label={rid ? "See the recipe" : undefined} className="block w-full text-left active:scale-[0.99] transition-transform" style={{ background: "none", border: "none", padding: 0, cursor: rid ? "pointer" : "default" }}>
        <div style={{ position: "relative" }}>
          {featured && (
            <div style={{ position: "absolute", top: -11, right: 16, zIndex: 3, background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 11, letterSpacing: "0.04em", padding: "4px 11px", borderRadius: 99, border: `2px solid ${INK}`, transform: "rotate(5deg)", boxShadow: "0 4px 10px rgba(23,20,16,0.2)" }}>🍅 from Marco</div>
          )}
          <CookCard treatment={treatment ?? c.card_treatment} photo={c.photo_url ?? ""} title={c.title ?? ""} note={c.note ?? ""} authorName={isMine ? "you" : (c.author_name ?? "someone")} authorAvatar={c.author_avatar ?? "?"} timeLabel={timeAgo(c.created_at)} h={180} cookedCount={cookedCount} />
        </div>
      </button>

      {/* recipe actions — a compact cornered cluster (save · plan · cooked),
          not a full-width bar, so it sits lightly under the art */}
      {rid ? (
        <div className="flex items-center justify-end gap-2" style={{ marginTop: 10 }}>
          {!isMine && (
            <button onClick={async () => { if (!saved) { setSaved(true); const ok = await saveCook(c); if (!ok) setSaved(false); } }} aria-label={saved ? "Saved to your kitchen" : "Save to your kitchen"} className="flex items-center justify-center active:scale-90 transition-transform" style={{ width: 40, height: 40, borderRadius: 99, background: saved ? LIME : PAPER, border: `2px solid ${INK}`, fontSize: 17 }}>🔖</button>
          )}
          <button onClick={() => router.push(`/recipes/${rid}?openMealSheet=true`)} aria-label="Add to meal plan" className="flex items-center justify-center active:scale-90 transition-transform" style={{ width: 40, height: 40, borderRadius: 99, background: PAPER, border: `2px solid ${INK}`, fontSize: 17 }}>📅</button>
          <button onClick={() => router.push(`/i-cooked?recipe=${rid}`)} className="flex items-center gap-1.5 active:scale-95 transition-transform" style={{ background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 14, padding: "9px 15px", borderRadius: 99, border: `2px solid ${INK}` }}><span aria-hidden>🍳</span> cooked</button>
        </div>
      ) : (
        <div style={{ marginTop: 10, textAlign: "right", fontFamily: HAND, fontSize: 13.5, color: INK, opacity: 0.5 }}>no recipe on this one yet</div>
      )}
    </div>
  );
}
