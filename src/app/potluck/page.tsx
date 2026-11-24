"use client";

/* Potluck — a table says what it is bringing, cooks it, then sees the spread.
 *
 * Four things were wrong with this screen, fixed in order:
 *
 *   1. It never ended. The cook-by date is now the close (lib/potluck).
 *   2. The dishes were text. The spread is now the photos.
 *   3. You could only bring something you had ALREADY cooked, which is
 *      backwards: a submission now starts as a claim and gains its photo.
 *   4. One dish each, picked from a sideways strip of tiles. People bring two
 *      things, and nobody can scan a library sideways — so your spot at the
 *      table holds a list, and recipes are picked in a sheet with a search
 *      field (components/potluck/RecipeSheet).
 */

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import type { Crew } from "@/lib/social";
import { useRecipes } from "@/lib/hooks/use-data";
import PageHeader from "@/components/layout/PageHeader";
import RecipeSheet, { type SheetMode, type TakenBy } from "@/components/potluck/RecipeSheet";
import PotluckTable, { type TablePlate } from "@/components/potluck/PotluckTable";
import { sharePotluckCard } from "@/components/potluck/shareCard";
import { deadlineLabel, isServed, localISO } from "@/lib/potluck";
import { BUTTER, CREAM_WARM, DISPLAY, HAND, INK, INK_MUTED, INK_SOFT, LIME, PAPER, SURFACE, TOMATO } from "@/lib/theme";

const DISP = DISPLAY;

type Dish = { id: string; user_id: string; cook: { id: string; title: string | null; photo_url: string | null; author_name: string | null; source_recipe_id: string | null } | null };
interface Potluck { id: string; crew_id: string; theme: string; emoji: string | null; deadline: string | null; status: string; submissions: Dish[] }
type MyCook = { id: string; title: string | null; photo_url: string | null; crew_id: string | null };
type Member = { id: string; name: string; isYou: boolean };
/** The columns that live in hand-run migrations, keyed by submission id. */
type Extra = { co_user_id: string | null; recipe_id: string | null; claimed_title: string | null; claimed_image: string | null };
type Extras = Record<string, Extra>;

const NO_EXTRA: Extra = { co_user_id: null, recipe_id: null, claimed_title: null, claimed_image: null };

const fetcher = async (url: string) => { const r = await fetch(url); const data = await r.json(); if (!r.ok) throw new Error(data.error || "Could not load potlucks."); return data; };

export default function PotluckPage() {
  return (
    <Suspense fallback={<Shell><p role="status" style={{ fontFamily: HAND, fontSize: 16, color: INK, opacity: 0.6 }}>setting the table…</p></Shell>}>
      <Potlucks />
    </Suspense>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh]" style={{ background: SURFACE, backgroundImage: "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)", backgroundSize: "13px 13px", color: INK }}>
      <PageHeader title="Potluck" subtitle="bring a dish, cook together" back={{ href: "/friends-stack", label: "Table" }} />
      <div className="mx-auto w-full max-w-lg px-4" style={{ paddingBottom: 130 }}>{children}</div>
    </div>
  );
}

function Potlucks() {
  const search = useSearchParams();
  const [table, setTable] = useState(search?.get("table") || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  /** Which potluck the sheet is open for, and whether it is adding or swapping. */
  const [sheet, setSheet] = useState<{ potluckId: string; crewId: string; mode: SheetMode } | null>(null);

  const { data: tables } = useSWR<{ tables: { crew: Crew; members: Member[] }[] }>("/api/table", fetcher);
  const { data, error, mutate } = useSWR<{ userId: string; potlucks: Potluck[]; cooks: MyCook[]; extras: Extras; extrasReady: boolean; coCooksReady: boolean }>(
    `/api/potlucks${table ? `?table=${encodeURIComponent(table)}` : ""}`, fetcher,
  );
  // The whole library, SWR-shared with /recipes — the sheet searches it.
  const { data: library, isLoading: libraryLoading } = useRecipes();

  async function act(body: object, done: string) {
    setBusy(true); setMessage("");
    try {
      const r = await fetch("/api/potlucks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const v = await r.json();
      if (!r.ok) throw new Error(v.error);
      await mutate();
      setMessage(done);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not save. Try again."); }
    finally { setBusy(false); }
  }

  const today = localISO();
  const all = data?.potlucks ?? [];
  const open = all.filter((p) => !isServed(p, today));
  const served = all.filter((p) => isServed(p, today));
  const tableName = (id: string) => tables?.tables.find((t) => t.crew.id === id)?.crew.name ?? "your table";
  const membersOf = (crewId: string) => tables?.tables.find((t) => t.crew.id === crewId)?.members ?? [];
  // Your own name is never shown back to you — a dish you cooked with someone
  // reads "you & Ama", not "Richard & Ama".
  const nameOf = (id: string) => (id === data?.userId ? "you" : tables?.tables.flatMap((t) => t.members).find((m) => m.id === id)?.name ?? "a friend");

  // Which of your recipes are already spoken for in the open sheet's potluck,
  // so the list can say "Ama is bringing this" without forbidding it — two
  // people turning up with garlic bread is a thing that happens.
  // Not memoised on purpose: it walks one potluck's submissions, and every
  // input to it already changes identity each render, so a useMemo here would
  // cost two more hooks to cache nothing.
  const takenBy: TakenBy = (() => {
    if (!sheet || !data) return {};
    const p = all.find((x) => x.id === sheet.potluckId);
    if (!p) return {};
    const out: TakenBy = {};
    for (const s of p.submissions) {
      const e = data.extras?.[s.id];
      if (e?.recipe_id) out[e.recipe_id] = s.user_id === data.userId ? "you" : nameOf(s.user_id);
    }
    return out;
  })();

  const cardProps = (p: Potluck) => ({
    p, today, tableName: tableName(p.crew_id), myId: data!.userId, myCooks: data!.cooks,
    extras: data!.extras ?? {}, extrasReady: data!.extrasReady !== false, coCooksReady: data!.coCooksReady !== false, members: membersOf(p.crew_id), nameOf, busy,
  });

  const sheetMembers = sheet ? membersOf(sheet.crewId).filter((m) => !m.isYou && m.id !== data?.userId).map((m) => ({ id: m.id, name: m.name })) : [];

  return (
    <Shell>
      <div className="flex items-center gap-2" style={{ marginTop: 6 }}>
        <label className="sr-only" htmlFor="potluck-table">Your table</label>
        <select
          id="potluck-table" value={table} onChange={(e) => setTable(e.target.value)}
          className="min-w-0 flex-1"
          style={{ background: PAPER, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 15, border: `2.5px solid ${INK}`, borderRadius: 12, padding: "11px 12px", boxShadow: `2px 2px 0 ${INK}` }}
        >
          <option value="">All your tables</option>
          {tables?.tables.map(({ crew }) => <option key={crew.id} value={crew.id}>{crew.emoji} {crew.name}</option>)}
        </select>
      </div>

      {tables?.tables.length === 0 && (
        <Link href="/crew" className="block active:scale-[0.99] transition-transform" style={{ marginTop: 14, background: BUTTER, border: `2.5px solid ${INK}`, borderRadius: 14, padding: "14px 16px", boxShadow: `3px 3px 0 ${INK}`, fontFamily: DISP, fontWeight: 700, fontSize: 15, color: INK, textDecoration: "none" }}>
          Start a table first — a potluck needs people →
        </Link>
      )}

      <StartPotluck table={table} busy={busy} onCreate={(theme, deadline) => act({ action: "create", crew_id: table, theme, deadline }, "Potluck set. Go cook.")} />

      {message && <p role="status" style={{ marginTop: 12, fontFamily: HAND, fontSize: 15, color: TOMATO }}>{message}</p>}
      {error && (
        <div role="alert" style={{ marginTop: 14, background: PAPER, border: `2.5px solid ${INK}`, borderRadius: 14, padding: 16, boxShadow: `3px 3px 0 ${INK}` }}>
          <p style={{ fontFamily: DISP, fontWeight: 700, fontSize: 15 }}>{error.message}</p>
          <button onClick={() => mutate()} style={{ marginTop: 8, fontFamily: HAND, fontSize: 15, color: TOMATO, background: "none", border: "none", padding: 0 }}>try again</button>
        </div>
      )}
      {!data && !error && <p role="status" style={{ marginTop: 20, fontFamily: HAND, fontSize: 16, color: INK, opacity: 0.6 }}>setting the table…</p>}

      {data && all.length === 0 && (
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <div style={{ fontFamily: HAND, fontSize: 17, color: TOMATO, transform: "rotate(-1.5deg)" }}>nothing on the table yet</div>
          <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 19, color: INK, marginTop: 10 }}>pick a theme, pick a night</div>
          <div style={{ fontFamily: HAND, fontSize: 15, color: INK, opacity: 0.7, marginTop: 6 }}>everyone says what they&rsquo;re bringing, then cooks it</div>
        </div>
      )}

      {data && open.map((p) => (
        <PotluckCard key={p.id} {...cardProps(p)}
          onPick={(mode) => setSheet({ potluckId: p.id, crewId: p.crew_id, mode })}
          onRemove={(submissionId) => act({ action: "remove", potluck_id: p.id, submission_id: submissionId }, "Taken off the table.")}
          onBring={(cookId, coUserId) => act({ action: "submit", potluck_id: p.id, cook_id: cookId, co_user_id: coUserId }, "Your dish is on the table.")}
          onCooked={(submissionId, cookId) => act({ action: "cooked", potluck_id: p.id, submission_id: submissionId, cook_id: cookId }, "Your dish is on the table.")} />
      ))}

      {data && served.length > 0 && (
        <div style={{ marginTop: 26 }}>
          <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 18, color: INK, paddingLeft: 2 }}>already served</div>
          {served.map((p) => (
            <PotluckCard key={p.id} {...cardProps(p)} onPick={() => {}} onRemove={() => {}} onBring={() => {}} onCooked={() => {}} />
          ))}
        </div>
      )}

      {sheet && <RecipeSheet
        mode={sheet.mode}
        recipes={library ?? []}
        loading={libraryLoading}
        takenBy={takenBy}
        members={sheet?.mode.kind === "add" ? sheetMembers : []}
        busy={busy}
        onClose={() => setSheet(null)}
        onConfirm={(ids, coUserId) => {
          const s = sheet;
          setSheet(null);
          if (!s || ids.length === 0) return;
          if (s.mode.kind === "swap") {
            void act({ action: "swap", potluck_id: s.potluckId, submission_id: s.mode.submissionId, recipe_id: ids[0] }, "Swapped.");
          } else {
            void act({ action: "claim", potluck_id: s.potluckId, recipe_ids: ids, co_user_id: coUserId },
              ids.length > 1 ? `${ids.length} dishes added.` : "You're on the list.");
          }
        }}
      />}
    </Shell>
  );
}

/* ── Start one ──────────────────────────────────────────────────────────── */

function StartPotluck({ table, busy, onCreate }: { table: string; busy: boolean; onCreate: (theme: string, deadline: string) => void }) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState("");
  // Default the cook-by to the coming Sunday. The shape this is for is weekly,
  // and a date field opened on today's date suggests tonight.
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
    return localISO(d);
  });

  const field = { background: PAPER, color: INK, border: `2px solid ${INK}`, borderRadius: 10, padding: "11px 12px", fontFamily: DISP, fontWeight: 700, fontSize: 15, width: "100%" } as const;

  return (
    <div style={{ marginTop: 14, background: BUTTER, border: `2.5px solid ${INK}`, borderRadius: 16, boxShadow: `4px 5px 0 ${INK}`, overflow: "hidden" }}>
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="w-full flex items-center justify-between active:scale-[0.99] transition-transform" style={{ background: "none", border: "none", padding: "14px 16px", textAlign: "left", fontFamily: DISP, fontWeight: 700, fontSize: 16, color: INK }}>
        <span>🍲 Start a potluck</span>
        <span aria-hidden style={{ fontSize: 20, lineHeight: 1 }}>{open ? "–" : "+"}</span>
      </button>
      {open && (
        <form onSubmit={(e) => { e.preventDefault(); onCreate(theme, deadline); }} style={{ padding: "0 16px 16px", display: "grid", gap: 10 }}>
          {!table && <p style={{ fontFamily: HAND, fontSize: 15, color: INK }}>choose a table above first</p>}
          <label style={{ display: "block" }}>
            <span style={{ fontFamily: HAND, fontSize: 14.5, color: INK, opacity: 0.8 }}>the theme</span>
            <input required maxLength={100} value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="pasta night, childhood favourites…" style={{ ...field, marginTop: 4 }} className="placeholder:text-[var(--ink-muted)]" />
          </label>
          <label style={{ display: "block" }}>
            <span style={{ fontFamily: HAND, fontSize: 14.5, color: INK, opacity: 0.8 }}>cook by</span>
            <input required type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} style={{ ...field, marginTop: 4 }} />
          </label>
          <button disabled={busy || !table} className="active:scale-[0.98] transition-transform" style={{ background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 16, padding: "13px 0", borderRadius: 12, border: `2.5px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`, opacity: busy || !table ? 0.45 : 1 }}>
            Set the table
          </button>
        </form>
      )}
    </div>
  );
}

/* ── One potluck ────────────────────────────────────────────────────────── */

type CardProps = {
  p: Potluck; today: string; tableName: string; myId: string; myCooks: MyCook[];
  extras: Extras; extrasReady: boolean; coCooksReady: boolean; members: Member[]; nameOf: (id: string) => string; busy: boolean;
  onPick: (mode: SheetMode) => void;
  onRemove: (submissionId: string) => void;
  onBring: (cookId: string, coUserId: string | null) => void;
  onCooked: (submissionId: string, cookId: string) => void;
};

function PotluckCard({ p, today, tableName, myId, myCooks, extras, extrasReady, coCooksReady, members, nameOf, busy, onPick, onRemove, onBring, onCooked }: CardProps) {
  const served = isServed(p, today);
  const extraOf = (id: string) => extras[id] ?? NO_EXTRA;
  const dishes = p.submissions.length;
  const cooked = p.submissions.filter((s) => s.cook).length;
  const mine = p.submissions.filter((s) => s.user_id === myId);
  const alsoOn = p.submissions.filter((s) => s.user_id !== myId && extraOf(s.id).co_user_id === myId);
  const spare = myCooks.filter((c) => c.crew_id === p.crew_id);
  const status = summary(dishes, cooked, served, extrasReady);
  // One plate per dish, in the order they were brought. The table and the
  // shareable card read the same list, so they can never disagree.
  const plates: TablePlate[] = p.submissions.map((s) => ({
    id: s.id,
    label: s.cook?.title || extraOf(s.id).claimed_title || "a dish",
    who: s.user_id === myId ? "you" : s.cook?.author_name || nameOf(s.user_id),
    cooked: !!s.cook,
  }));

  return (
    <section style={{ marginTop: 16, background: PAPER, border: `2.5px solid ${INK}`, borderRadius: 18, padding: "16px 14px", boxShadow: `4px 5px 0 ${INK}` }}>
      <div className="flex items-start gap-2">
        <h2 className="min-w-0 flex-1" style={{ margin: 0 }}>
          <Link href={`/potluck/${p.id}`} className="block truncate active:scale-[0.99] transition-transform" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 22, lineHeight: 1.1, color: INK, textDecoration: "none" }}>
            {p.emoji ? `${p.emoji} ` : ""}{p.theme} <span aria-hidden style={{ color: TOMATO }}>→</span>
          </Link>
        </h2>
        <span style={{ flexShrink: 0, background: served ? CREAM_WARM : LIME, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 11.5, letterSpacing: "0.04em", padding: "4px 10px", borderRadius: 99, border: `2px solid ${INK}`, transform: "rotate(3deg)" }}>
          {deadlineLabel(p, today)}
        </span>
      </div>
      <div style={{ fontFamily: HAND, fontSize: 15, color: TOMATO, transform: "rotate(-1.5deg)", marginTop: 6 }}>
        {tableName} · {status}
      </div>

      {/* A summary of the table. The LIVE one is the Pixi scene at
          /potluck/<id> — this stays drawn because it is also what the
          shareable postcard is rendered from. */}
      <Link href={`/potluck/${p.id}`} className="block active:scale-[0.99] transition-transform" style={{ margin: "10px auto 0", maxWidth: 260 }} aria-label={`Open ${p.theme}`}>
        <PotluckTable plates={plates} open={!served} centre={cooked === dishes && dishes > 0 ? "ON THE TABLE" : "COMING"} />
      </Link>

      <ShareTable theme={p.theme} tableName={tableName} plates={plates} status={status} open={!served} />

      {dishes > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
          {p.submissions.map((s, i) => (
            <DishTile key={s.id} dish={s} extra={extraOf(s.id)} mine={s.user_id === myId || extraOf(s.id).co_user_id === myId}
              tilt={i % 2 ? 1.6 : -1.8} credit={credit(s, myId, extraOf(s.id).co_user_id, nameOf)} />
          ))}
        </div>
      )}

      {!served && (
        <YourDishes
          mine={mine} alsoOn={alsoOn} extraOf={extraOf} crewId={p.crew_id} cooks={spare}
          canClaim={extrasReady} canCoCook={coCooksReady} members={members} busy={busy}
          onPick={onPick} onRemove={onRemove} onBring={onBring} onCooked={onCooked}
        />
      )}
    </section>
  );
}

/* "3 coming · 1 cooked" mid-week, and once it is over, what actually turned
   up. A claim nobody cooked is not a dish on the table, and saying it was
   would be the exact dishonesty that claiming is here to remove. */
function summary(dishes: number, cooked: number, served: boolean, canSay: boolean): string {
  const plate = (n: number) => `${n} ${n === 1 ? "dish" : "dishes"} on the table`;
  if (served) {
    if (dishes === 0) return "nobody cooked";
    if (cooked === 0) return `nobody cooked · ${dishes} said they would`;
    if (cooked === dishes) return plate(cooked);
    return `${plate(cooked)} · ${dishes - cooked} didn't make it`;
  }
  // Without the claim columns nobody CAN say, so saying they have not is nonsense.
  if (dishes === 0) return canSay ? "nobody has said yet" : "nobody has cooked yet";
  if (cooked === dishes) return plate(dishes);
  return `${dishes} coming · ${cooked === 0 ? "none cooked yet" : `${cooked} cooked`}`;
}

/** Who gets the credit line under a dish. One dish can carry two names. */
function credit(dish: Dish, myId: string, coId: string | null, nameOf: (id: string) => string): string {
  const first = dish.user_id === myId ? "you" : dish.cook?.author_name || nameOf(dish.user_id);
  if (!coId) return first === "you" ? "yours" : first;
  return `${first} & ${nameOf(coId)}`;
}

function DishTile({ dish, extra, mine, tilt, credit }: { dish: Dish; extra: Extra; mine: boolean; tilt: number; credit: string }) {
  const c = dish.cook;
  // A claim shows the recipe's picture; a cooked dish shows the real one.
  const photo = c?.photo_url || extra.claimed_image || "";
  const title = c?.title || extra.claimed_title || "a dish";
  const promised = !c;

  const body = (
    // minWidth 0 because a grid item defaults to min-width:auto, and `truncate`
    // sets white-space:nowrap — so a long dish name stretched its column and ran
    // out past the card's own border instead of ellipsing.
    <div style={{ minWidth: 0, background: PAPER, border: `2.5px solid ${INK}`, padding: 6, paddingBottom: 9, boxShadow: `3px 4px 0 ${INK}`, transform: `rotate(${tilt}deg)` }}>
      <div style={{ position: "relative" }}>
        {photo
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={photo} alt="" style={{ width: "100%", height: 104, objectFit: "cover", display: "block", opacity: promised ? 0.75 : 1 }} />
          : <div className="flex items-center justify-center" style={{ width: "100%", height: 104, background: CREAM_WARM, fontSize: 30 }} aria-hidden>🍳</div>}
        {/* A promise is not a plate, and the spread should not pretend
            otherwise — the photo is the recipe's, not theirs, until they cook. */}
        {promised && (
          <span style={{ position: "absolute", left: -2, bottom: 6, background: BUTTER, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 10.5, letterSpacing: "0.04em", padding: "3px 8px", border: `2px solid ${INK}`, transform: "rotate(-2deg)" }}>
            bringing
          </span>
        )}
      </div>
      <div className="truncate" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 13, color: INK, marginTop: 7 }}>{title}</div>
      <div className="truncate" style={{ fontFamily: HAND, fontSize: 13, color: mine ? TOMATO : INK_SOFT, marginTop: 1 }}>{credit}</div>
    </div>
  );

  return c?.source_recipe_id
    ? <Link href={`/recipes/${c.source_recipe_id}`} className="block active:scale-[0.98] transition-transform" style={{ minWidth: 0, textDecoration: "none" }}>{body}</Link>
    : body;
}

/* ── Your dishes ────────────────────────────────────────────────────────── */

function YourDishes({ mine, alsoOn, extraOf, crewId, cooks, canClaim, canCoCook, members, busy, onPick, onRemove, onBring, onCooked }: {
  mine: Dish[]; alsoOn: Dish[]; extraOf: (id: string) => Extra; crewId: string; cooks: MyCook[];
  canClaim: boolean; canCoCook: boolean; members: Member[]; busy: boolean;
  onPick: (mode: SheetMode) => void;
  onRemove: (submissionId: string) => void;
  onBring: (cookId: string, coUserId: string | null) => void;
  onCooked: (submissionId: string, cookId: string) => void;
}) {
  /** Which of your dishes has its "I cooked it" picker open. */
  const [cooking, setCooking] = useState("");

  // Naming a second cook comes from a different migration than claiming,
  // so it gets its own switch rather than riding on that one.
  const others = canCoCook ? members.filter((m) => !m.isYou) : [];

  if (mine.length === 0 && alsoOn.length === 0) {
    return (
      <div style={{ marginTop: 14 }}>
        {canClaim && (
          <button onClick={() => onPick({ kind: "add" })} className="w-full active:scale-[0.98] transition-transform"
            style={{ background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 16, padding: "14px 0", borderRadius: 13, border: `2.5px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}` }}>
            Say what you&rsquo;re bringing →
          </button>
        )}
        {cooks.length > 0 && (canClaim ? (
          <details style={{ marginTop: 12 }}>
            <summary style={{ fontFamily: HAND, fontSize: 14.5, color: INK_MUTED, cursor: "pointer" }}>already made it?</summary>
            <CookPicker cooks={cooks} confirm="Bring this dish" busy={busy} others={[]} onConfirm={(id, co) => onBring(id, co)} />
          </details>
        ) : (
          // Without the claim columns there is nothing else to offer, so the cook
          // picker is the primary action rather than a disclosure. An unmigrated
          // deployment keeps exactly the screen it had before claims existed.
          <>
            <div style={{ fontFamily: HAND, fontSize: 14.5, color: INK, opacity: 0.8 }}>bring one of yours</div>
            <CookPicker cooks={cooks} confirm="Bring this dish" busy={busy} others={others} onConfirm={(id, co) => onBring(id, co)} />
          </>
        ))}
        {!canClaim && cooks.length === 0 && <NewCookLink crewId={crewId} label="Post what you cooked →" findRecipe />}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 14, background: BUTTER, border: `2px solid ${INK}`, borderRadius: 12, padding: "10px 12px" }}>
      <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: INK }}>
        {mine.length > 0 ? `you're bringing ${mine.length === 1 ? "1 dish" : `${mine.length} dishes`}` : "you're on someone else's dish"}
      </div>

      {mine.map((s) => {
        const e = extraOf(s.id);
        const label = s.cook?.title || e.claimed_title || "a dish";
        const done = !!s.cook;
        return (
          <div key={s.id} style={{ marginTop: 9, borderTop: `1.5px solid rgba(23,20,16,0.12)`, paddingTop: 9 }}>
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: INK }}>
                {done ? "✓ " : ""}{label}
              </span>
              {!done && (
                <span className="flex gap-1.5 flex-shrink-0">
                  <TinyButton label={cooking === s.id ? "never mind" : "cooked it"} onClick={() => setCooking(cooking === s.id ? "" : s.id)} primary />
                  {canClaim && <TinyButton label="swap" onClick={() => onPick({ kind: "swap", submissionId: s.id, current: e.recipe_id })} />}
                  {canClaim && <TinyButton label="✕" ariaLabel={`Take ${label} off the table`} onClick={() => onRemove(s.id)} />}
                </span>
              )}
            </div>
            {cooking === s.id && (
              cooks.length === 0
                ? <NewCookLink crewId={crewId} label="Post what you cooked →" />
                : <CookPicker cooks={cooks} confirm="That's the one" busy={busy} others={[]} onConfirm={(cookId) => { setCooking(""); onCooked(s.id, cookId); }} />
            )}
          </div>
        );
      })}

      {alsoOn.map((s) => (
        <div key={s.id} style={{ marginTop: 9, borderTop: `1.5px solid rgba(23,20,16,0.12)`, paddingTop: 9, fontFamily: HAND, fontSize: 14, color: INK_SOFT }}>
          you&rsquo;re named on {extraOf(s.id).claimed_title ? `“${extraOf(s.id).claimed_title}”` : "a dish"} with them
        </div>
      ))}

      {canClaim && (
        <button onClick={() => onPick({ kind: "add" })} className="w-full active:scale-[0.98] transition-transform"
          style={{ marginTop: 11, background: PAPER, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 13.5, padding: "10px 0", borderRadius: 10, border: `2px solid ${INK}`, boxShadow: `2px 2px 0 ${INK}` }}>
          + bring something else
        </button>
      )}
    </div>
  );
}

/* Sharing a table is sending a picture of it, not a link — a potluck lives
   inside a crew, and there is no public page for one to point at. */
function ShareTable({ theme, tableName, plates, status, open }: { theme: string; tableName: string; plates: TablePlate[]; status: string; open: boolean }) {
  const [state, setState] = useState<"" | "working" | "saved" | "failed">("");
  if (plates.length === 0) return null;
  return (
    <div style={{ textAlign: "center", marginTop: 2 }}>
      <button
        onClick={async () => {
          setState("working");
          const r = await sharePotluckCard({ theme, tableName, plates, status, open });
          setState(r === "downloaded" ? "saved" : r === "failed" ? "failed" : "");
        }}
        className="active:scale-[0.97] transition-transform"
        style={{ background: PAPER, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 13, padding: "0 16px", minHeight: 40, borderRadius: 99, border: `2px solid ${INK}`, boxShadow: `2px 2px 0 ${INK}` }}
      >
        {state === "working" ? "drawing…" : "📸 Share the table"}
      </button>
      {state === "saved" && <div style={{ fontFamily: HAND, fontSize: 13.5, color: INK_SOFT, marginTop: 5 }}>saved to your downloads</div>}
      {state === "failed" && <div role="alert" style={{ fontFamily: HAND, fontSize: 13.5, color: TOMATO, marginTop: 5 }}>couldn&rsquo;t make the card</div>}
    </div>
  );
}

function TinyButton({ label, ariaLabel, onClick, primary = false }: { label: string; ariaLabel?: string; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick} aria-label={ariaLabel} className="active:scale-[0.96] transition-transform"
      style={{ background: primary ? TOMATO : PAPER, color: primary ? PAPER : INK, fontFamily: DISP, fontWeight: 700, fontSize: 12, padding: "0 10px", minHeight: 32, borderRadius: 99, border: `2px solid ${INK}` }}>
      {label}
    </button>
  );
}

/* /i-cooked opens straight into a full-screen viewfinder that says "tap to
   snap what you made" — it is the post-a-cook flow and the photo is required.
   So this link must only ever be offered to somebody who HAS cooked. It used
   to be labelled "Cook something and bring it", which sent a person who had
   not cooked anything to a camera with nothing to photograph.
   `findRecipe` adds the way out for them, since on an unmigrated deployment
   claiming is not available and this would otherwise be a dead end. */
function NewCookLink({ crewId, label, findRecipe = false }: { crewId: string; label: string; findRecipe?: boolean }) {
  return (
    <>
      <Link href={`/i-cooked?table=${crewId}`} className="block active:scale-[0.99] transition-transform" style={{ marginTop: 10, background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 15, padding: "13px 0", borderRadius: 12, border: `2.5px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`, textAlign: "center", textDecoration: "none" }}>
        {label}
      </Link>
      {findRecipe && (
        <Link href="/recipes" className="block" style={{ marginTop: 9, textAlign: "center", fontFamily: HAND, fontSize: 14.5, color: INK_MUTED, textDecoration: "none" }}>
          haven&rsquo;t cooked yet? find something →
        </Link>
      )}
    </>
  );
}

/* Cooks are a short list — the ones you have posted to THIS table — so they
   stay a strip. It is the recipe library that needed a search field. */
function CookPicker({ cooks, confirm, busy, others, onConfirm }: {
  cooks: MyCook[]; confirm: string; busy: boolean; others: Member[];
  onConfirm: (cookId: string, coUserId: string | null) => void;
}) {
  const [picked, setPicked] = useState("");
  const [withWhom, setWithWhom] = useState("");

  return (
    <div style={{ marginTop: 8 }}>
      <div className="flex gap-2 overflow-x-auto" style={{ paddingBottom: 4, scrollbarWidth: "none" }}>
        {cooks.map((c) => {
          const on = picked === c.id;
          return (
            <button key={c.id} onClick={() => setPicked(on ? "" : c.id)} aria-pressed={on} className="flex-shrink-0 transition-transform" style={{ width: 86, background: on ? LIME : PAPER, border: `2px solid ${INK}`, borderRadius: 10, padding: 5, textAlign: "left", transform: on ? "translate(1px,1px)" : "none", boxShadow: on ? `1px 1px 0 ${INK}` : `2px 2px 0 ${INK}` }}>
              {c.photo_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={c.photo_url} alt="" style={{ width: "100%", height: 54, objectFit: "cover", display: "block", borderRadius: 6 }} />
                : <div className="flex items-center justify-center" style={{ width: "100%", height: 54, background: CREAM_WARM, borderRadius: 6, fontSize: 22 }} aria-hidden>🍳</div>}
              <div className="truncate" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 11.5, color: INK, marginTop: 5 }}>{c.title || "a dish"}</div>
            </button>
          );
        })}
      </div>

      {picked && others.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontFamily: HAND, fontSize: 14.5, color: INK, opacity: 0.8 }}>cooked it with someone?</div>
          <div className="flex gap-2 overflow-x-auto" style={{ marginTop: 7, paddingBottom: 4, scrollbarWidth: "none" }}>
            {others.map((m) => {
              const on = withWhom === m.id;
              return (
                <button key={m.id} onClick={() => setWithWhom(on ? "" : m.id)} aria-pressed={on} className="flex-shrink-0 transition-transform"
                  style={{ background: on ? LIME : PAPER, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 13, padding: "0 14px", minHeight: 44, borderRadius: 99, border: `2px solid ${INK}`, transform: on ? "translate(1px,1px)" : "none", boxShadow: on ? `1px 1px 0 ${INK}` : `2px 2px 0 ${INK}` }}>
                  {m.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button disabled={busy || !picked} onClick={() => onConfirm(picked, withWhom || null)} className="w-full active:scale-[0.98] transition-transform" style={{ marginTop: 10, background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 15, padding: "13px 0", borderRadius: 12, border: `2.5px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`, opacity: busy || !picked ? 0.45 : 1 }}>
        {confirm}
      </button>
    </div>
  );
}
