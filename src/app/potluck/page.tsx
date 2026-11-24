"use client";

/* Potluck — a table says what it is bringing, cooks it, then sees the spread.
 *
 * Three things were wrong with this screen, fixed in order:
 *
 *   1. It never ended. `potlucks.status` has always had a 'served' value and
 *      nothing ever wrote it. The cook-by date is now the close (lib/potluck).
 *   2. The dishes were text. The API has always SELECTED `cook.photo_url` and
 *      this page threw it away, so a potluck between people in different
 *      kitchens — the whole point — was a list of underlined titles.
 *   3. You could only bring something you had ALREADY cooked and posted to the
 *      table, which is backwards: the potluck is meant to be what prompts the
 *      cooking. So a submission now starts as a claim — "I'm bringing this",
 *      from your saved recipes — and gains its photo when you make it.
 *
 * One row the whole way through, because `unique (potluck_id, user_id)` means
 * a claim and a cooked dish from one person cannot be two rows.
 */

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import type { Crew } from "@/lib/social";
import PageHeader from "@/components/layout/PageHeader";
import { deadlineLabel, isServed, localISO } from "@/lib/potluck";
import { BUTTER, CREAM_WARM, DISPLAY, HAND, INK, INK_MUTED, INK_SOFT, LIME, PAPER, SURFACE, TOMATO } from "@/lib/theme";

const DISP = DISPLAY;

type Dish = { id: string; user_id: string; cook: { id: string; title: string | null; photo_url: string | null; author_name: string | null; source_recipe_id: string | null } | null };
interface Potluck { id: string; crew_id: string; theme: string; emoji: string | null; deadline: string | null; status: string; submissions: Dish[] }
type MyCook = { id: string; title: string | null; photo_url: string | null; crew_id: string | null };
type MyRecipe = { id: string; title: string; image_url: string | null };
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
  const { data: tables } = useSWR<{ tables: { crew: Crew; members: Member[] }[] }>("/api/table", fetcher);
  const { data, error, mutate } = useSWR<{ userId: string; potlucks: Potluck[]; cooks: MyCook[]; recipes: MyRecipe[]; extras: Extras; extrasReady: boolean }>(
    `/api/potlucks${table ? `?table=${encodeURIComponent(table)}` : ""}`, fetcher,
  );

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
  // This week's first, then the finished spreads underneath.
  const open = all.filter((p) => !isServed(p, today));
  const served = all.filter((p) => isServed(p, today));
  const tableName = (id: string) => tables?.tables.find((t) => t.crew.id === id)?.crew.name ?? "your table";
  const membersOf = (crewId: string) => tables?.tables.find((t) => t.crew.id === crewId)?.members ?? [];
  // Your own name is never shown back to you — a dish you cooked with someone
  // reads "you & Ama", not "Richard & Ama".
  const nameOf = (id: string) => (id === data?.userId ? "you" : tables?.tables.flatMap((t) => t.members).find((m) => m.id === id)?.name ?? "a friend");

  const cardProps = (p: Potluck) => ({
    p, today, tableName: tableName(p.crew_id), myId: data!.userId, myCooks: data!.cooks, myRecipes: data!.recipes ?? [],
    extras: data!.extras ?? {}, extrasReady: data!.extrasReady !== false, members: membersOf(p.crew_id), nameOf, busy,
  });

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
          onClaim={(recipeId, coUserId) => act({ action: "claim", potluck_id: p.id, recipe_id: recipeId, co_user_id: coUserId }, "You're on the list.")}
          onBring={(cookId, coUserId) => act({ action: "submit", potluck_id: p.id, cook_id: cookId, co_user_id: coUserId }, "Your dish is on the table.")}
          onCooked={(cookId) => act({ action: "cooked", potluck_id: p.id, cook_id: cookId }, "Your dish is on the table.")} />
      ))}

      {data && served.length > 0 && (
        <div style={{ marginTop: 26 }}>
          <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 18, color: INK, paddingLeft: 2 }}>already served</div>
          {served.map((p) => (
            <PotluckCard key={p.id} {...cardProps(p)} onClaim={() => {}} onBring={() => {}} onCooked={() => {}} />
          ))}
        </div>
      )}
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
  p: Potluck; today: string; tableName: string; myId: string; myCooks: MyCook[]; myRecipes: MyRecipe[];
  extras: Extras; extrasReady: boolean; members: Member[]; nameOf: (id: string) => string; busy: boolean;
  onClaim: (recipeId: string, coUserId: string | null) => void;
  onBring: (cookId: string, coUserId: string | null) => void;
  onCooked: (cookId: string) => void;
};

function PotluckCard({ p, today, tableName, myId, myCooks, myRecipes, extras, extrasReady, members, nameOf, busy, onClaim, onBring, onCooked }: CardProps) {
  const served = isServed(p, today);
  const extraOf = (id: string) => extras[id] ?? NO_EXTRA;
  // Being the second name on someone else's dish counts as having brought one.
  const mine = p.submissions.find((s) => s.user_id === myId || extraOf(s.id).co_user_id === myId);
  const iAmTheCook = mine?.user_id === myId;
  const dishes = p.submissions.length;
  // How many are promises rather than plates — the line that makes a potluck
  // mid-week legible ("4 coming, 1 cooked").
  const cooked = p.submissions.filter((s) => s.cook).length;
  const spare = myCooks.filter((c) => c.crew_id === p.crew_id);
  // Everyone already on the table, on either side of a dish.
  const spoken = new Set<string>();
  for (const s of p.submissions) { spoken.add(s.user_id); const co = extraOf(s.id).co_user_id; if (co) spoken.add(co); }
  const others = extrasReady ? members.filter((m) => !m.isYou && m.id !== myId && !spoken.has(m.id)) : [];

  return (
    <section style={{ marginTop: 16, background: PAPER, border: `2.5px solid ${INK}`, borderRadius: 18, padding: "16px 14px", boxShadow: `4px 5px 0 ${INK}` }}>
      <div className="flex items-start gap-2">
        <h2 className="min-w-0 flex-1" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 22, lineHeight: 1.1, color: INK, margin: 0 }}>
          {p.emoji ? `${p.emoji} ` : ""}{p.theme}
        </h2>
        <span style={{ flexShrink: 0, background: served ? CREAM_WARM : LIME, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 11.5, letterSpacing: "0.04em", padding: "4px 10px", borderRadius: 99, border: `2px solid ${INK}`, transform: "rotate(3deg)" }}>
          {deadlineLabel(p, today)}
        </span>
      </div>
      <div style={{ fontFamily: HAND, fontSize: 15, color: TOMATO, transform: "rotate(-1.5deg)", marginTop: 6 }}>
        {tableName} · {summary(dishes, cooked, served, extrasReady)}
      </div>

      {dishes > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
          {p.submissions.map((s, i) => (
            <DishTile key={s.id} dish={s} extra={extraOf(s.id)} mine={s.user_id === myId || extraOf(s.id).co_user_id === myId}
              tilt={i % 2 ? 1.6 : -1.8} credit={credit(s, myId, extraOf(s.id).co_user_id, nameOf)} />
          ))}
        </div>
      )}

      {!served && (
        <YourSpot
          mine={mine} iAmTheCook={iAmTheCook} extra={mine ? extraOf(mine.id) : NO_EXTRA}
          crewId={p.crew_id} cooks={spare} recipes={myRecipes} canClaim={extrasReady} others={others} busy={busy}
          onClaim={onClaim} onBring={onBring} onCooked={onCooked}
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

/* ── Your spot at the table ─────────────────────────────────────────────── */

function YourSpot({ mine, iAmTheCook, extra, crewId, cooks, recipes, canClaim, others, busy, onClaim, onBring, onCooked }: {
  mine: Dish | undefined; iAmTheCook: boolean; extra: Extra; crewId: string; cooks: MyCook[]; recipes: MyRecipe[];
  canClaim: boolean; others: Member[]; busy: boolean;
  onClaim: (recipeId: string, coUserId: string | null) => void;
  onBring: (cookId: string, coUserId: string | null) => void;
  onCooked: (cookId: string) => void;
}) {
  // "change what I'm bringing" / "say what I cooked", opened from the bar below
  const [panel, setPanel] = useState<"" | "change" | "cooked">("");

  // Already cooked and on the table — nothing left to do this week.
  if (mine?.cook) {
    return (
      <div style={{ marginTop: 14, background: LIME, border: `2px solid ${INK}`, borderRadius: 12, padding: "10px 12px", fontFamily: DISP, fontWeight: 700, fontSize: 14, color: INK }}>
        ✓ your dish is on the table
      </div>
    );
  }

  // You are named on someone else's claim — theirs to cook, not yours.
  if (mine && !iAmTheCook) {
    return (
      <div style={{ marginTop: 14, background: BUTTER, border: `2px solid ${INK}`, borderRadius: 12, padding: "10px 12px", fontFamily: DISP, fontWeight: 700, fontSize: 14, color: INK }}>
        ✓ you&rsquo;re on {extra.claimed_title ? `“${extra.claimed_title}”` : "a dish"} with them
      </div>
    );
  }

  // You said what you're bringing. Now cook it.
  if (mine) {
    return (
      <div style={{ marginTop: 14 }}>
        <div style={{ background: BUTTER, border: `2px solid ${INK}`, borderRadius: 12, padding: "10px 12px" }}>
          <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: INK }}>you&rsquo;re bringing {extra.claimed_title || "a dish"}</div>
          <div className="flex gap-2" style={{ marginTop: 9 }}>
            <SmallButton label={panel === "cooked" ? "never mind" : "I cooked it"} onClick={() => setPanel(panel === "cooked" ? "" : "cooked")} primary />
            {canClaim && <SmallButton label={panel === "change" ? "never mind" : "change"} onClick={() => setPanel(panel === "change" ? "" : "change")} />}
          </div>
        </div>
        {panel === "cooked" && (
          cooks.length === 0
            ? <NewCookLink crewId={crewId} label="Post what you cooked →" />
            : <PickAndConfirm kind="cook" items={cooks.map(asTile)} confirm="That's the one" busy={busy} onConfirm={(id) => { setPanel(""); onCooked(id); }} />
        )}
        {panel === "change" && (
          <PickAndConfirm kind="recipe" items={recipes.map(asRecipeTile)} confirm="Bring this instead" busy={busy} onConfirm={(id) => { setPanel(""); onClaim(id, null); }} />
        )}
      </div>
    );
  }

  // Nothing from you yet. Saying what you'll bring is the primary move — you
  // should not have to have cooked already to join a potluck.
  return (
    <div style={{ marginTop: 14 }}>
      {canClaim && recipes.length > 0 && (
        <>
          <div style={{ fontFamily: HAND, fontSize: 14.5, color: INK, opacity: 0.8 }}>what are you bringing?</div>
          <PickAndConfirm kind="recipe" items={recipes.map(asRecipeTile)} confirm="I'm bringing this" busy={busy} others={others} onConfirm={(id, co) => onClaim(id, co)} />
        </>
      )}
      {canClaim && recipes.length === 0 && (
        <Link href="/recipes?import=1" className="block active:scale-[0.99] transition-transform" style={{ background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 15, padding: "13px 0", borderRadius: 12, border: `2.5px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`, textAlign: "center", textDecoration: "none" }}>
          Save a recipe to bring →
        </Link>
      )}
      {cooks.length > 0 && (canClaim ? (
        <details style={{ marginTop: 12 }}>
          <summary style={{ fontFamily: HAND, fontSize: 14.5, color: INK_MUTED, cursor: "pointer" }}>already made it?</summary>
          <PickAndConfirm kind="cook" items={cooks.map(asTile)} confirm="Bring this dish" busy={busy} onConfirm={(id, co) => onBring(id, co)} />
        </details>
      ) : (
        // Without the claim columns there is nothing else to offer, so the cook
        // picker is the primary action rather than a disclosure. An unmigrated
        // deployment keeps exactly the screen it had before claims existed,
        // instead of hiding its only affordance behind a summary.
        <>
          <div style={{ fontFamily: HAND, fontSize: 14.5, color: INK, opacity: 0.8 }}>bring one of yours</div>
          <PickAndConfirm kind="cook" items={cooks.map(asTile)} confirm="Bring this dish" busy={busy} others={others} onConfirm={(id, co) => onBring(id, co)} />
        </>
      ))}
      {!canClaim && cooks.length === 0 && <NewCookLink crewId={crewId} label="Cook something and bring it →" />}
    </div>
  );
}

type Tile = { id: string; title: string; photo: string | null };
const asTile = (c: MyCook): Tile => ({ id: c.id, title: c.title || "a dish", photo: c.photo_url });
const asRecipeTile = (r: MyRecipe): Tile => ({ id: r.id, title: r.title, photo: r.image_url });

function SmallButton({ label, onClick, primary = false }: { label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick} className="active:scale-[0.97] transition-transform" style={{ background: primary ? TOMATO : PAPER, color: primary ? PAPER : INK, fontFamily: DISP, fontWeight: 700, fontSize: 13, padding: "0 14px", minHeight: 40, borderRadius: 99, border: `2px solid ${INK}`, boxShadow: `2px 2px 0 ${INK}` }}>
      {label}
    </button>
  );
}

function NewCookLink({ crewId, label }: { crewId: string; label: string }) {
  return (
    <Link href={`/i-cooked?table=${crewId}`} className="block active:scale-[0.99] transition-transform" style={{ marginTop: 10, background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 15, padding: "13px 0", borderRadius: 12, border: `2.5px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`, textAlign: "center", textDecoration: "none" }}>
      {label}
    </Link>
  );
}

/* Choosing is a tap, committing is a second one. There is no un-bring — the
   submission is unique per person and nothing deletes it — so the thing you
   picked presses in and waits for you to confirm it. */
function PickAndConfirm({ kind, items, confirm, busy, others = [], onConfirm }: {
  kind: "cook" | "recipe"; items: Tile[]; confirm: string; busy: boolean; others?: Member[];
  onConfirm: (id: string, coUserId: string | null) => void;
}) {
  const [picked, setPicked] = useState("");
  const [withWhom, setWithWhom] = useState("");

  return (
    <div style={{ marginTop: 8 }}>
      <div className="flex gap-2 overflow-x-auto" style={{ paddingBottom: 4, scrollbarWidth: "none" }}>
        {items.map((t) => {
          const on = picked === t.id;
          return (
            <button key={t.id} onClick={() => setPicked(on ? "" : t.id)} aria-pressed={on} className="flex-shrink-0 transition-transform" style={{ width: 86, background: on ? LIME : PAPER, border: `2px solid ${INK}`, borderRadius: 10, padding: 5, textAlign: "left", transform: on ? "translate(1px,1px)" : "none", boxShadow: on ? `1px 1px 0 ${INK}` : `2px 2px 0 ${INK}` }}>
              {t.photo
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={t.photo} alt="" style={{ width: "100%", height: 54, objectFit: "cover", display: "block", borderRadius: 6 }} />
                : <div className="flex items-center justify-center" style={{ width: "100%", height: 54, background: CREAM_WARM, borderRadius: 6, fontSize: 22 }} aria-hidden>{kind === "recipe" ? "📖" : "🍳"}</div>}
              <div className="truncate" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 11.5, color: INK, marginTop: 5 }}>{t.title}</div>
            </button>
          );
        })}
      </div>

      {picked && others.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontFamily: HAND, fontSize: 14.5, color: INK, opacity: 0.8 }}>cooking it with someone?</div>
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
