"use client";
// My Kitchen — home. Three things, in order of "what do I need right now":
//   1. Tonight — what's on the menu today (or what's next, or a nudge to plan)
//   2. Fresh in your kitchen — ONE feed of every recipe landing here, tagged
//      with where it came from (you, your household, a table)
//   3. Top cooks — what you've cooked, Beli-ranked; unranked cooks wait below
// Plus your people: the Household / Family / Friends group-chat checklist.
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { motion } from "motion/react";
import { useGuideActive } from "@/components/guide/guideStore";
import GroupChats, { peoplePollInterval, type Groups } from "@/components/people/GroupChats";
import { SPRING_STICKER } from "@/lib/motion";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const LIME = "#C4EE45";
const BUTTER = "#FFD84D";
const LAV = "#C9B8FF";
const DISP = '"Marker Felt", Georgia, serif';
const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
const SANS = "system-ui, -apple-system, sans-serif";

type FeedItem = { key: string; source: "you" | "household" | "table"; title: string; image: string | null; by: string | null; href: string | null; at: string };
type RankedItem = { key: string; title: string; image: string | null; score: number | null; sentiment: string | null; href: string | null };
interface KitchenData {
  name: string; recipeCount: number; cookCount: number;
  feed: FeedItem[]; ranked: RankedItem[];
  tonight: { title: string; image: string | null; href: string } | null;
  next: { title: string; date: string; href: string } | null;
  peopleCount?: number;
}
type Member = { user_id: string; role: string; profile: { display_name?: string | null } | null };
interface HouseholdData { household: { id: string; name: string; invite_code: string; members: Member[] } | null }

const fetcher = async (url: string) => { const r = await fetch(url); const v = await r.json(); if (!r.ok) throw new Error(v.error || "Could not load."); return v; };
const localISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// Encode spaces etc. without double-encoding URLs that are already escaped
// (CDN paths like w_2560%2Cc_limit).
const safeSrc = (u: string) => { try { return encodeURI(decodeURI(u)); } catch { return u.replace(/ /g, "%20"); } };
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function KitchenHub() {
  const guideActive = useGuideActive();
  // The viewer's local date — re-read when the app comes back to the
  // foreground, so a phone left open overnight doesn't show yesterday's dinner.
  const [today, setToday] = useState(() => localISO(new Date()));
  useEffect(() => {
    const sync = () => { if (document.visibilityState === "visible") setToday(localISO(new Date())); };
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    return () => { document.removeEventListener("visibilitychange", sync); window.removeEventListener("focus", sync); };
  }, []);
  const { data, error, mutate } = useSWR<KitchenData>(`/api/kitchen?today=${today}`, fetcher, { revalidateOnFocus: true, focusThrottleInterval: 30000 });
  const { data: hh } = useSWR<HouseholdData>("/api/household", fetcher, { revalidateOnFocus: false });
  // A fresh refreshInterval identity after each send makes SWR re-arm its poll
  // (it only re-reads the function when the option changes).
  const [sentTick, setSentTick] = useState(0);
  const pollInterval = useMemo(() => (d: { groups?: Groups; uid?: string } | undefined) => peoplePollInterval(d), [sentTick]); // eslint-disable-line react-hooks/exhaustive-deps
  const { data: quests, mutate: mutateQuests } = useSWR<{ groups?: Groups; uid?: string }>("/api/quests", fetcher, { revalidateOnFocus: true, refreshInterval: pollInterval });

  return (
    <div className="min-h-[100dvh]" style={{ background: "#E9E2D3", backgroundImage: "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)", backgroundSize: "13px 13px", color: INK }}>
      <div className="mx-auto w-full max-w-lg px-4" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 16px)", paddingBottom: 130 }}>
        {/* header */}
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="min-w-0">
            <h1 className="truncate" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 23, letterSpacing: "-0.01em", color: INK, lineHeight: 1.05 }}>{data ? `${data.name}'s kitchen` : "Your kitchen"}</h1>
            <div style={{ fontFamily: HAND, fontSize: 14, color: TOMATO, transform: "rotate(-1deg)", marginTop: 2 }}>{data ? `${plural(data.recipeCount, "recipe", "recipes")} · ${plural(data.cookCount, "cook", "cooks")}` : "make yourself at home"}</div>
          </div>
          <Link href="/profile" aria-label="Your profile" className="flex flex-shrink-0 items-center justify-center" style={{ width: 44, height: 44, borderRadius: 99, background: INK, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 15, transform: "rotate(5deg)", border: `2px solid ${BUTTER}` }}>{data?.name.slice(0, 1).toUpperCase() ?? "·"}</Link>
        </div>

        <People hh={hh} groups={quests?.groups} uid={quests?.uid} guideActive={guideActive} onChange={() => { setSentTick((t) => t + 1); void mutateQuests(); }} />

        {/* recipes here, plan & shop a tap away */}
        <div className="flex" style={{ marginTop: 14, background: PAPER, border: `2.5px solid ${INK}`, borderRadius: 14, padding: 4, gap: 4, boxShadow: "0 5px 12px rgba(23,20,16,0.1)" }}>
          <span className="flex-1 text-center" style={{ background: INK, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 15, padding: "10px 0", borderRadius: 10 }}>Recipes</span>
          <Link href="/meal-plan" data-guide="tab-mealplan" className="flex-1 text-center active:scale-95 transition-transform" style={{ color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 15, padding: "10px 0", borderRadius: 10 }}>Meal plan</Link>
          <Link href="/grocery" data-guide="tab-groceries" className="flex-1 text-center active:scale-95 transition-transform" style={{ color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 15, padding: "10px 0", borderRadius: 10 }}>Groceries</Link>
        </div>

        {error && <div role="alert" className="mt-4 rounded-xl bg-white p-4" style={{ border: `2px solid ${INK}` }}><p>{error.message}</p><button className="mt-2 underline" onClick={() => mutate()}>Try again</button></div>}
        {!data && !error && <p role="status" className="mt-6" style={{ fontFamily: HAND, fontSize: 16, color: INK, opacity: 0.6 }}>loading your kitchen…</p>}

        {data && (
          <>
            {/* tonight's dish lives in the hero — don't show it twice */}
            {(() => {
              const fresh = data.feed.filter((f) => !data.tonight || f.href !== data.tonight.href);
              return (
                <>
                  <Tonight data={data} guide={!fresh.some((f) => f.source === "you")} />
                  <Fresh feed={fresh} total={data.recipeCount} hasTonight={!!data.tonight} hideEmpty={guideActive} />
                </>
              );
            })()}
            <TopCooks ranked={data.ranked} hideEmpty={guideActive} />
          </>
        )}
      </div>
    </div>
  );
}

// ── 1. Tonight ───────────────────────────────────────────────────────────────
function Tonight({ data, guide }: { data: KitchenData; guide: boolean }) {
  if (data.tonight) {
    const t = data.tonight;
    return (
      <section style={{ marginTop: 22 }} aria-label="Tonight">
        <Link href={t.href} data-guide={guide ? "saved-recipe" : undefined} className="relative block active:scale-[0.99] transition-transform" style={{ background: "#fff", border: `2.5px solid ${INK}`, padding: 10, paddingBottom: 14, transform: "rotate(-1.2deg)", boxShadow: `5px 6px 0 ${INK}` }}>
          <span aria-hidden style={{ position: "absolute", top: -11, left: 26, width: 86, height: 20, background: BUTTER, opacity: 0.85, transform: "rotate(-4deg)" }} />
          {t.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={safeSrc(t.image)} alt="" style={{ width: "100%", aspectRatio: "16/10", objectFit: "cover", display: "block", border: `2px solid ${INK}` }} />
          ) : <div style={{ aspectRatio: "16/10", background: "rgba(255,216,77,0.35)", border: `2px solid ${INK}` }} />}
          {/* the one orchestrated moment on Home: tonight's sticker slaps on */}
          <motion.span initial={{ scale: 1.6, rotate: -8, opacity: 0 }} animate={{ scale: 1, rotate: 5, opacity: 1 }} transition={{ ...SPRING_STICKER, delay: 0.15 }} style={{ position: "absolute", top: 22, right: 18, fontFamily: DISP, fontWeight: 700, fontSize: 15, color: PAPER, background: TOMATO, border: `2.5px solid ${INK}`, padding: "4px 11px", boxShadow: `2px 2px 0 ${INK}` }}>tonight</motion.span>
          <div className="flex items-end justify-between gap-3" style={{ marginTop: 10, padding: "0 2px" }}>
            <div className="min-w-0" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 24, color: INK, lineHeight: 1.05 }}>{t.title}</div>
            <span className="flex-shrink-0" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 15, color: PAPER, background: INK, border: `2px solid ${INK}`, borderRadius: 11, padding: "9px 14px" }}>Start cooking</span>
          </div>
        </Link>
      </section>
    );
  }
  if (data.next) {
    const day = new Date(`${data.next.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "long" });
    return (
      <Link href={data.next.href} className="mt-5 flex items-center gap-3 active:scale-[0.99] transition-transform" style={{ background: PAPER, border: `2px solid ${INK}`, borderRadius: 14, padding: "11px 14px" }}>
        <span style={{ fontFamily: HAND, fontSize: 15, color: TOMATO, flexShrink: 0 }}>next up, {day}</span>
        <span className="min-w-0 flex-1 truncate" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 16, color: INK }}>{data.next.title}</span>
      </Link>
    );
  }
  return (
    <Link href="/meal-plan" className="mt-5 flex items-center gap-3 active:scale-[0.99] transition-transform" style={{ border: `2px dashed ${INK}`, borderRadius: 14, padding: "11px 14px", background: "rgba(251,247,238,0.6)" }}>
      <span className="min-w-0 flex-1" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 16, color: INK }}>What&apos;s for dinner tonight?</span>
      <span style={{ fontFamily: HAND, fontSize: 15, color: TOMATO, flexShrink: 0 }}>plan something</span>
    </Link>
  );
}

// ── 2. Fresh in your kitchen — one feed ──────────────────────────────────────
const SOURCE_TAG: Record<FeedItem["source"], { bg: string; text: (by: string | null) => string }> = {
  you: { bg: LIME, text: () => "you saved" },
  household: { bg: BUTTER, text: (by) => `${by ?? "your housemate"} added` },
  table: { bg: LAV, text: (by) => (by ? `saved from ${by}` : "saved from a table") },
};
function Fresh({ feed, total, hasTonight, hideEmpty }: { feed: FeedItem[]; total: number; hasTonight: boolean; hideEmpty: boolean }) {
  if (!feed.length) {
    if (hideEmpty) return null; // the guide is already teaching this
    // Your only recipe is tonight's — a slim nudge, not a second big card.
    if (hasTonight) return (
      <Link href="/recipes?import=1" className="mt-6 flex items-center gap-3 active:scale-[0.99] transition-transform" style={{ border: `2px dashed ${INK}`, borderRadius: 14, padding: "11px 14px", background: "rgba(251,247,238,0.6)" }}>
        <span className="min-w-0 flex-1" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 16, color: INK }}>Your next recipe goes here</span>
        <span style={{ fontFamily: HAND, fontSize: 15, color: TOMATO, flexShrink: 0 }}>add one</span>
      </Link>
    );
    return (
      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 20, color: INK, marginBottom: 10, marginLeft: 2 }}>fresh in your kitchen</h2>
        <div className="text-center" style={{ border: `2px dashed ${INK}`, borderRadius: 16, padding: "22px 16px", background: PAPER }}>
          <div style={{ fontFamily: HAND, fontSize: 16, color: TOMATO }}>your collection starts here</div>
          <Link href="/recipes?import=1" className="mt-3 inline-block" style={{ background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 15, padding: "11px 20px", borderRadius: 12, border: `2.5px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}` }}>Add a recipe</Link>
        </div>
      </section>
    );
  }
  // The newest of YOUR saves is what the guide spotlights after a save.
  const guideIdx = feed.findIndex((x) => x.source === "you");
  return (
    <section style={{ marginTop: 24 }}>
      <div className="flex items-baseline justify-between px-1" style={{ marginBottom: 12 }}>
        <h2 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 20, color: INK }}>fresh in your kitchen</h2>
        {total > 1 && <Link href="/recipes" style={{ fontFamily: HAND, fontSize: 15, color: TOMATO }}>all {total} recipes</Link>}
      </div>
      <div className="space-y-5">
        {feed.slice(0, 8).map((f, i) => {
          const tag = SOURCE_TAG[f.source];
          const card = (
            <div className="relative" style={{ background: PAPER, border: `2px solid ${INK}`, borderRadius: 14, padding: 9, paddingBottom: 12, transform: `rotate(${i % 2 ? 0.5 : -0.5}deg)`, boxShadow: `4px 5px 0 rgba(23,20,16,0.85)` }}>
              {f.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={safeSrc(f.image)} alt="" loading="lazy" style={{ width: "100%", aspectRatio: "16/10", objectFit: "cover", display: "block", borderRadius: 8, border: `2px solid ${INK}` }} />
              ) : <div className="flex items-center justify-center" style={{ aspectRatio: "16/10", background: "rgba(255,216,77,0.3)", fontSize: 40, borderRadius: 8, border: `2px solid ${INK}` }} aria-hidden>🍳</div>}
              <span className="truncate" style={{ position: "absolute", top: 18, left: 18, fontFamily: HAND, fontWeight: 700, fontSize: 14, color: INK, background: tag.bg, border: `2px solid ${INK}`, padding: "3px 10px", transform: "rotate(-3deg)", boxShadow: `2px 2px 0 ${INK}`, maxWidth: "70%" }}>{tag.text(f.by)}</span>
              <div className="flex items-baseline justify-between gap-2" style={{ marginTop: 9, padding: "0 3px" }}>
                <span className="min-w-0" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 20, color: INK, lineHeight: 1.08 }}>{f.title}</span>
                <span className="flex-shrink-0" style={{ fontFamily: HAND, fontSize: 13, color: INK, opacity: 0.6 }}>{timeAgo(f.at)}</span>
              </div>
            </div>
          );
          const guide = i === guideIdx ? "saved-recipe" : undefined;
          return f.href
            ? <Link key={f.key} href={f.href} data-guide={guide} className="block active:scale-[0.99] transition-transform">{card}</Link>
            : <div key={f.key} data-guide={guide}>{card}</div>;
        })}
      </div>
    </section>
  );
}

// ── 3. Top cooks — Beli-ranked, then unranked ────────────────────────────────
function TopCooks({ ranked, hideEmpty }: { ranked: RankedItem[]; hideEmpty: boolean }) {
  if (!ranked.length) {
    if (hideEmpty) return null;
    return (
      <section style={{ marginTop: 26 }}>
        <h2 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 20, color: INK, marginBottom: 10, marginLeft: 2 }}>top cooks</h2>
        <Link href="/i-cooked" className="block text-center active:scale-[0.99] transition-transform" style={{ border: `2px dashed ${INK}`, borderRadius: 16, padding: "18px 16px", background: PAPER }}>
          <div style={{ fontFamily: HAND, fontSize: 16, color: TOMATO, transform: "rotate(-1deg)" }}>cook something, then rank it</div>
          <div style={{ fontFamily: SANS, fontSize: 13, color: "#4A4742", marginTop: 5 }}>your best dishes climb to the top</div>
          <div className="mt-3 inline-block" style={{ background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 14, padding: "10px 18px", borderRadius: 11, border: `2px solid ${INK}`, boxShadow: `2px 3px 0 ${INK}` }}>I cooked something</div>
        </Link>
      </section>
    );
  }
  // Rank numbers count scored cooks only; unranked ones get a dot.
  const ranks = ranked.reduce<number[]>((acc, c) => [...acc, (acc.at(-1) ?? 0) + (c.score !== null ? 1 : 0)], []);
  return (
    <section style={{ marginTop: 26 }}>
      <h2 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 20, color: INK, marginBottom: 10, marginLeft: 2 }}>top cooks</h2>
      <ol className="space-y-2">
        {ranked.map((c, i) => {
          const scored = c.score !== null;
          const rank = ranks[i];
          const row = (
            <div className="flex items-center gap-3" style={{ background: PAPER, border: `2px solid ${INK}`, borderRadius: 12, padding: "8px 10px", boxShadow: scored && rank === 1 ? `3px 3px 0 ${INK}` : "none" }}>
              <span className="flex-shrink-0 text-center" style={{ width: 30, fontFamily: DISP, fontWeight: 700, fontSize: scored ? 19 : 15, color: scored ? TOMATO : "rgba(23,20,16,0.35)" }}>{scored ? `#${rank}` : "·"}</span>
              {c.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={safeSrc(c.image)} alt="" loading="lazy" style={{ width: 46, height: 46, borderRadius: 8, objectFit: "cover", border: `1.5px solid ${INK}`, flexShrink: 0 }} />
              ) : <div aria-hidden className="flex flex-shrink-0 items-center justify-center" style={{ width: 46, height: 46, borderRadius: 8, background: "rgba(255,216,77,0.3)", fontSize: 20, border: `1.5px solid ${INK}` }}>🍳</div>}
              <span className="min-w-0 flex-1 truncate" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 16, color: INK }}>{c.title}</span>
              {scored ? (
                <span className="flex-shrink-0" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: INK, background: LIME, border: `2px solid ${INK}`, borderRadius: 8, padding: "3px 8px", transform: "rotate(3deg)" }} aria-label={`scored ${c.score!.toFixed(1)} out of 10`}>{c.score!.toFixed(1)}</span>
              ) : (
                <span className="flex-shrink-0" style={{ fontFamily: HAND, fontSize: 13, color: INK, opacity: 0.6 }}>not ranked yet</span>
              )}
            </div>
          );
          return <li key={c.key}>{c.href ? <Link href={c.href} className="block active:scale-[0.99] transition-transform">{row}</Link> : row}</li>;
        })}
      </ol>
    </section>
  );
}

// ── Your people ──────────────────────────────────────────────────────────────
// A shared household shows as a lime tag. Below it, the Household / Family /
// Friends group-chat card, persistent until Marco is in all three chats (the
// server's checkmarks — "sent, waiting for Marco" doesn't count).
function People({ hh, groups, uid, guideActive, onChange }: { hh: HouseholdData | undefined; groups: Groups | undefined; uid: string | undefined; guideActive: boolean; onChange: () => void }) {
  const [copied, setCopied] = useState(false);
  if (!hh || !groups || guideActive) return null; // still loading, or the guide is driving
  const members = hh.household?.members ?? [];
  const shared = members.length >= 2;
  const allDone = groups.household && groups.family && groups.friends;
  const waitingCode = hh.household && !shared ? hh.household.invite_code : null;
  return (
    <div style={{ marginTop: 12 }}>
      {shared && (
        <div className="flex items-center gap-2" style={{ background: LIME, border: `2px solid ${INK}`, borderRadius: 12, padding: "8px 12px", marginBottom: allDone ? 0 : 10 }}>
          <span style={{ fontSize: 14, flexShrink: 0 }} aria-hidden>🍅</span>
          <span className="truncate" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: INK }}>shared with {members.filter((m) => m.user_id !== uid).map((m) => m.profile?.display_name || "your housemate").join(" & ")}</span>
        </div>
      )}
      {!allDone && <GroupChats groups={groups} uid={uid} onChange={onChange} variant="compact" />}
      {waitingCode && (
        <div className="flex items-center gap-2" style={{ marginTop: 8, padding: "0 4px" }}>
          <span className="min-w-0 flex-1" style={{ fontFamily: HAND, fontSize: 14, color: INK, opacity: 0.8 }}>waiting for your household — share your code</span>
          <button onClick={() => { navigator.clipboard?.writeText(waitingCode).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }} aria-label={`Copy household code ${waitingCode}`} className="flex-shrink-0 active:scale-95 transition-transform" style={{ background: PAPER, border: `2px solid ${INK}`, borderRadius: 9, padding: "6px 12px", minHeight: 44, fontFamily: "ui-monospace, monospace", fontWeight: 700, fontSize: 13, color: INK }}>{copied ? "copied!" : waitingCode}</button>
        </div>
      )}
    </div>
  );
}
