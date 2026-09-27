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
        <TableSeats tables={tables} you={me} cooks={cooks ?? []} onInvite={() => router.push("/crew")} />

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
                    return <RealCook key={c.id} c={c} treatment={t} myId={me?.id ?? null} initialSaved={savedIds.has(c.id)} />;
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
function TableSeats({ tables, you, cooks, onInvite }: { tables: { crew: Crew; members: TableMember[] }[]; you: TableMember | null; cooks: Cook[]; onInvite: () => void }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (tables.length <= 1) return;
    const t = setInterval(() => setIdx((v) => (v + 1) % tables.length), 4200); // rotate through your tables
    return () => clearInterval(t);
  }, [tables.length]);

  const active = tables.length > 0 ? tables[Math.min(idx, tables.length - 1)] : null;
  const members = active ? active.members : (you ? [you] : []);

  // "how often" — cooks per member in this table over the last 7 days
  const weekAgo = Date.now() - 7 * 864e5;
  const counts = new Map<string, number>();
  if (active) for (const ck of cooks) {
    if (ck.crew_id === active.crew.id && ck.user_id && new Date(ck.created_at).getTime() >= weekAgo) {
      counts.set(ck.user_id, (counts.get(ck.user_id) ?? 0) + 1);
    }
  }
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
          {members.map((m, i) => {
            const n = counts.get(m.id) ?? 0;
            return (
              <div key={m.id} style={{ flexShrink: 0, width: 64, textAlign: "center" }}>
                <div className="flex items-center justify-center" style={{ width: 48, height: 48, borderRadius: 99, margin: "0 auto", background: SEAT_COLORS[i % SEAT_COLORS.length], color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 19, border: `2.5px solid ${INK}`, transform: `rotate(${i % 2 ? 3 : -3}deg)` }}>{m.avatar}</div>
                <div style={{ fontFamily: SANS, fontSize: 11.5, color: INK, marginTop: 5, fontWeight: m.isYou ? 700 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.isYou ? "you" : m.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: n > 0 ? TOMATO : "rgba(23,20,16,0.4)", marginTop: 1 }}>{n > 0 ? `🍳 ${n}× this wk` : "quiet"}</div>
              </div>
            );
          })}
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

function RealCook({ c, featured = false, treatment, myId = null, initialSaved = false }: { c: Cook; featured?: boolean; treatment?: string; myId?: string | null; initialSaved?: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const router = useRouter();
  const isMine = !!myId && c.user_id === myId;
  const openRecipe = () => c.source_recipe_id && router.push(`/recipes/${c.source_recipe_id}`);
  return (
    <div>
      <div style={{ position: "relative" }}>
        {featured && (
          <div style={{ position: "absolute", top: -11, right: 16, zIndex: 3, background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 11, letterSpacing: "0.04em", padding: "4px 11px", borderRadius: 99, border: `2px solid ${INK}`, transform: "rotate(5deg)", boxShadow: "0 4px 10px rgba(23,20,16,0.2)" }}>🍅 from Marco</div>
        )}
        <CookCard treatment={treatment ?? c.card_treatment} photo={c.photo_url ?? ""} title={c.title ?? ""} note={c.note ?? ""} authorName={isMine ? "you" : (c.author_name ?? "someone")} authorAvatar={c.author_avatar ?? "?"} timeLabel={timeAgo(c.created_at)} h={180} />
      </div>

      {/* recipe — every cook with a recipe is one tap from the full recipe */}
      {c.source_recipe_id ? (
        <button onClick={openRecipe} className="w-full flex items-center justify-between active:scale-[0.99] transition-transform" style={{ marginTop: 14, background: BUTTER, border: `2px solid ${INK}`, borderRadius: 12, padding: "11px 14px" }}>
          <span className="flex items-center gap-2">
            <span style={{ fontSize: 18 }} aria-hidden>📖</span>
            <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 15, color: INK }}>see the recipe</span>
          </span>
          <span style={{ color: INK, fontSize: 18 }}>›</span>
        </button>
      ) : (
        <div style={{ marginTop: 12, fontFamily: HAND, fontSize: 13.5, color: INK, opacity: 0.5, textAlign: "center" }}>no recipe on this one yet</div>
      )}

      {/* your own cook doesn't get "add to my kitchen" — it's already yours */}
      {!isMine && (
        <button onClick={async () => { if (!saved) { setSaved(true); const ok = await saveCook(c); if (!ok) setSaved(false); } }} className="w-full active:scale-[0.97] transition-transform" style={{ marginTop: 10, background: saved ? LIME : INK, color: saved ? INK : PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 15, padding: "12px 0", borderRadius: 12, border: `2px solid ${INK}` }}>{saved ? "✓ saved to your kitchen" : "Add to my kitchen"}</button>
      )}
    </div>
  );
}
