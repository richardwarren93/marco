"use client";

/* One potluck, full screen: the table is the page.
 *
 * The list at /potluck stays a list. This is the room — a compact header, a
 * progress line, the table taking the middle 55–65% of the screen, three
 * actions, and a sheet that rises when you tap something in the scene.
 *
 * The scene owns no state. Everything here goes through the same API actions
 * the list uses, and the canvas is handed a plain model built by lib/model.
 * If Pixi cannot start, `fallback` flips and the same data renders as an
 * ordinary list — a table that will not draw must not take the potluck down
 * with it.
 */

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import type { Crew } from "@/lib/social";
import { useRecipes } from "@/lib/hooks/use-data";
import RecipeSheet, { type SheetMode, type TakenBy } from "@/components/potluck/RecipeSheet";
import PotluckStage from "@/components/potluck/scene/PotluckStage";
import { buildModel, type SceneModel } from "@/components/potluck/scene/model";
import { sharePotluckCard } from "@/components/potluck/shareCard";
import { deadlineLabel, isServed, localISO } from "@/lib/potluck";
import { BUTTER, CREAM_WARM, DISPLAY, HAND, INK, INK_MUTED, INK_SOFT, LIME, PAPER, SURFACE, TOMATO } from "@/lib/theme";

const DISP = DISPLAY;

type Dish = { id: string; user_id: string; cook: { id: string; title: string | null; photo_url: string | null; author_name: string | null; source_recipe_id: string | null } | null };
type Potluck = { id: string; crew_id: string; theme: string; emoji: string | null; deadline: string | null; status: string; submissions: Dish[] };
type MyCook = { id: string; title: string | null; photo_url: string | null; crew_id: string | null };
type Member = { id: string; name: string; isYou: boolean };
type Extra = { co_user_id: string | null; recipe_id: string | null; claimed_title: string | null; claimed_image: string | null };
const NO_EXTRA: Extra = { co_user_id: null, recipe_id: null, claimed_title: null, claimed_image: null };

const fetcher = async (url: string) => { const r = await fetch(url); const d = await r.json(); if (!r.ok) throw new Error(d.error || "Could not load this potluck."); return d; };

export default function PotluckRoom() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? "";

  const { data, error, mutate } = useSWR<{ userId: string; potlucks: Potluck[]; cooks: MyCook[]; extras: Record<string, Extra>; extrasReady: boolean }>(
    id ? `/api/potlucks?id=${encodeURIComponent(id)}` : null, fetcher,
  );
  const { data: tables } = useSWR<{ tables: { crew: Crew; members: Member[] }[] }>("/api/table", fetcher);
  const { data: library, isLoading: libraryLoading } = useRecipes();

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sheet, setSheet] = useState<SheetMode | null>(null);
  const [picked, setPicked] = useState<{ kind: "seat" | "dish"; id: string } | null>(null);
  const [fallback, setFallback] = useState(false);

  const p = data?.potlucks?.[0];
  const myId = data?.userId ?? "";
  const extras = data?.extras ?? {};
  const extraOf = (sid: string) => extras[sid] ?? NO_EXTRA;
  const canClaim = data?.extrasReady !== false;
  const today = localISO();
  const served = p ? isServed(p, today) : false;
  const crew = tables?.tables.find((t) => t.crew.id === p?.crew_id);
  const members = useMemo(() => crew?.members ?? [], [crew]);

  const model: SceneModel = useMemo(() => buildModel({
    members: members.map((m) => ({ id: m.id, name: m.name, isYou: m.isYou })),
    submissions: (p?.submissions ?? []).map((s) => ({
      id: s.id, user_id: s.user_id,
      cookedTitle: s.cook?.title ?? null,
      claimedTitle: extraOf(s.id).claimed_title,
      cooked: !!s.cook,
    })),
    coCooks: Object.fromEntries(Object.entries(extras).filter(([, e]) => e.co_user_id).map(([k, e]) => [k, e.co_user_id as string])),
    myId, open: !served,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [members, p?.submissions, extras, myId, served]);

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

  useEffect(() => { if (!message) return; const t = setTimeout(() => setMessage(""), 3200); return () => clearTimeout(t); }, [message]);

  const takenBy: TakenBy = {};
  for (const s of p?.submissions ?? []) {
    const e = extraOf(s.id);
    if (e.recipe_id) takenBy[e.recipe_id] = s.user_id === myId ? "you" : members.find((m) => m.id === s.user_id)?.name ?? "a friend";
  }

  if (error) {
    return (
      <Room>
        <div role="alert" style={{ margin: "20px 16px", background: PAPER, border: `2.5px solid ${INK}`, borderRadius: 14, padding: 16, boxShadow: `3px 3px 0 ${INK}` }}>
          <p style={{ fontFamily: DISP, fontWeight: 700, fontSize: 15 }}>{error.message}</p>
          <Link href="/potluck" style={{ fontFamily: HAND, fontSize: 15, color: TOMATO }}>back to potlucks</Link>
        </div>
      </Room>
    );
  }

  if (!p) {
    return <Room><p role="status" style={{ margin: "24px 16px", fontFamily: HAND, fontSize: 16, color: INK, opacity: 0.6 }}>laying the table…</p></Room>;
  }

  const mine = p.submissions.filter((s) => s.user_id === myId);
  const pickedDish = picked?.kind === "dish" ? p.submissions.find((s) => s.id === picked.id) : undefined;
  const pickedSeat = picked?.kind === "seat" ? members.find((m) => m.id === picked.id) : undefined;

  return (
    <Room>
      {/* 1 — compact header */}
      <header className="flex items-center gap-2" style={{ padding: "calc(env(safe-area-inset-top,0px) + 10px) 14px 0" }}>
        <button onClick={() => router.push("/potluck")} aria-label="Back to potlucks" className="flex-shrink-0" style={{ width: 38, height: 38, borderRadius: 99, background: "none", border: "none", color: INK }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 20, lineHeight: 1.1, color: INK, margin: 0 }}>
            {p.emoji ? `${p.emoji} ` : ""}{p.theme}
          </h1>
          <div className="truncate" style={{ fontFamily: HAND, fontSize: 14, color: TOMATO, marginTop: 1 }}>
            {crew?.crew.name ?? "your table"} · {deadlineLabel(p, today)}
          </div>
        </div>
        <span className="flex-shrink-0" style={{ background: served ? CREAM_WARM : LIME, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 11.5, padding: "4px 10px", borderRadius: 99, border: `2px solid ${INK}`, transform: "rotate(3deg)" }}>
          {model.cookedCount}/{model.dishCount || 0}
        </span>
      </header>

      {/* 2 — attendance and cooking progress */}
      <div style={{ padding: "8px 16px 0", fontFamily: HAND, fontSize: 14, color: INK_SOFT }}>
        {model.seats.filter((s) => s.state !== "empty").length} at the table ·{" "}
        {model.dishCount === 0 ? "nobody has said yet" : `${model.dishCount} coming, ${model.cookedCount} cooked`}
      </div>

      {/* 3 — the table */}
      {/* Fills the space between the header and the actions, and the camera
          centres the table in it. Capping this at 62dvh was worse: the camera
          is bound by WIDTH on a phone, so the table does not grow into extra
          height — the space just moved below the buttons instead. */}
      <div style={{ flex: "1 1 auto", minHeight: 0, position: "relative" }}>
        {fallback
          ? <FallbackList model={model} onSeatTap={(sid) => setPicked({ kind: "seat", id: sid })} onDishTap={(did) => setPicked({ kind: "dish", id: did })} />
          : <PotluckStage
              model={model}
              onSeatTap={(sid) => setPicked({ kind: "seat", id: sid })}
              onDishTap={(did) => setPicked({ kind: "dish", id: did })}
              onEmptyTap={() => router.push("/crew")}
              onUnavailable={() => setFallback(true)}
            />}
      </div>

      {message && <p role="status" style={{ textAlign: "center", fontFamily: HAND, fontSize: 14.5, color: TOMATO, padding: "0 16px" }}>{message}</p>}

      {/* 4 — three actions */}
      {/* marginTop:auto, because the column can end up shorter than the
          screen — without this the buttons float mid-page. */}
      <div className="flex gap-2" style={{ marginTop: "auto", padding: "8px 14px calc(env(safe-area-inset-bottom,0px) + 12px)" }}>
        <Action label="Invite" onClick={() => router.push("/crew")} />
        <Action label="Bring food" primary disabled={served || !canClaim} onClick={() => setSheet({ kind: "add" })} />
        <Action label="Postcard" onClick={async () => {
          const r = await sharePotluckCard({
            theme: p.theme, tableName: crew?.crew.name ?? "your table",
            plates: model.dishes.map((d) => ({ id: d.id, label: d.title, who: d.who, cooked: d.cooked })),
            status: `${model.dishCount} coming · ${model.cookedCount} cooked`, open: !served,
          });
          if (r === "downloaded") setMessage("Postcard saved to your downloads.");
          if (r === "failed") setMessage("Could not make the postcard.");
        }} />
      </div>

      {/* 5 — the contextual sheet */}
      {picked && (
        <ContextSheet
          onClose={() => setPicked(null)}
          title={pickedDish ? (pickedDish.cook?.title || extraOf(pickedDish.id).claimed_title || "a dish") : pickedSeat ? (pickedSeat.isYou ? "you" : pickedSeat.name) : "at the table"}
        >
          {pickedDish && (
            <DishDetail
              dish={pickedDish} extra={extraOf(pickedDish.id)} isMine={pickedDish.user_id === myId} served={served} busy={busy}
              cooks={data!.cooks.filter((c) => c.crew_id === p.crew_id)} canClaim={canClaim}
              onSwap={() => { setPicked(null); setSheet({ kind: "swap", submissionId: pickedDish.id, current: extraOf(pickedDish.id).recipe_id }); }}
              onRemove={() => { setPicked(null); void act({ action: "remove", potluck_id: p.id, submission_id: pickedDish.id }, "Taken off the table."); }}
              onCooked={(cookId) => { setPicked(null); void act({ action: "cooked", potluck_id: p.id, submission_id: pickedDish.id, cook_id: cookId }, "On the table."); }}
            />
          )}
          {pickedSeat && (
            <SeatDetail
              seat={pickedSeat} model={model}
              onDish={(did) => setPicked({ kind: "dish", id: did })}
              onBring={pickedSeat.isYou && !served && canClaim ? () => { setPicked(null); setSheet({ kind: "add" }); } : undefined}
            />
          )}
        </ContextSheet>
      )}

      {sheet && (
        <RecipeSheet
          mode={sheet}
          recipes={library ?? []}
          loading={libraryLoading}
          takenBy={takenBy}
          members={sheet.kind === "add" ? members.filter((m) => !m.isYou).map((m) => ({ id: m.id, name: m.name })) : []}
          busy={busy}
          onClose={() => setSheet(null)}
          onConfirm={(ids, coUserId) => {
            const s = sheet; setSheet(null);
            if (!s || ids.length === 0) return;
            if (s.kind === "swap") void act({ action: "swap", potluck_id: p.id, submission_id: s.submissionId, recipe_id: ids[0] }, "Swapped.");
            else void act({ action: "claim", potluck_id: p.id, recipe_ids: ids, co_user_id: coUserId }, ids.length > 1 ? `${ids.length} dishes added.` : "You're on the list.");
          }}
        />
      )}

      {mine.length === 0 && !served && canClaim && model.dishCount === 0 && (
        <div aria-hidden style={{ position: "absolute", left: 0, right: 0, bottom: 86, textAlign: "center", fontFamily: HAND, fontSize: 15, color: TOMATO, pointerEvents: "none" }}>
          tap a chair, or say what you&rsquo;re bringing ↓
        </div>
      )}
    </Room>
  );
}

/* The room: one screen, no nested scrollers, honest about dynamic viewport. */
function Room({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col" style={{ height: "100dvh", overflow: "hidden", background: SURFACE, color: INK, position: "relative" }}>
      {children}
    </div>
  );
}

function Action({ label, onClick, primary = false, disabled = false }: { label: string; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="flex-1 active:scale-[0.97] transition-transform"
      style={{ background: primary ? TOMATO : PAPER, color: primary ? PAPER : INK, fontFamily: DISP, fontWeight: 700, fontSize: 14, minHeight: 46, borderRadius: 12, border: `2.5px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`, opacity: disabled ? 0.45 : 1 }}>
      {label}
    </button>
  );
}

function ContextSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 flex flex-col justify-end" style={{ zIndex: 60 }}>
      <button aria-label="Close" onClick={onClose} className="absolute inset-0" style={{ background: "rgba(23,20,16,0.42)", border: "none" }} />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative"
        style={{ background: PAPER, borderTop: `2.5px solid ${INK}`, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: "72dvh", overflowY: "auto", padding: "14px 16px calc(env(safe-area-inset-bottom,0px) + 16px)", animation: "sheetUp .24s cubic-bezier(.22,1,.36,1)" }}>
        <div className="flex items-center gap-2">
          <h2 className="min-w-0 flex-1 truncate" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 19, color: INK, margin: 0 }}>{title}</h2>
          <button onClick={onClose} aria-label="Close" style={{ width: 34, height: 34, borderRadius: 99, background: "none", border: "none", fontSize: 21, color: INK, lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
      <style>{`@keyframes sheetUp{from{transform:translateY(14px);opacity:.6}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}

function DishDetail({ dish, extra, isMine, served, busy, cooks, canClaim, onSwap, onRemove, onCooked }: {
  dish: Dish; extra: Extra; isMine: boolean; served: boolean; busy: boolean; cooks: MyCook[]; canClaim: boolean;
  onSwap: () => void; onRemove: () => void; onCooked: (cookId: string) => void;
}) {
  const [choose, setChoose] = useState(false);
  const photo = dish.cook?.photo_url || extra.claimed_image || "";
  return (
    <div style={{ marginTop: 10 }}>
      {photo
        // The world uses drawn plates; the sheet is where the real photograph belongs.
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={photo} alt="" style={{ width: "100%", height: 190, objectFit: "cover", borderRadius: 12, border: `2.5px solid ${INK}`, display: "block" }} />
        : <div className="flex items-center justify-center" style={{ height: 150, borderRadius: 12, border: `2.5px solid ${INK}`, background: CREAM_WARM, fontSize: 40 }} aria-hidden>🍳</div>}
      <div style={{ fontFamily: HAND, fontSize: 15, color: TOMATO, marginTop: 8 }}>
        {dish.cook ? "cooked" : "still coming"}{dish.cook?.author_name ? ` · ${dish.cook.author_name}` : ""}
      </div>
      {dish.cook?.source_recipe_id && (
        <Link href={`/recipes/${dish.cook.source_recipe_id}`} className="block" style={{ marginTop: 10, textAlign: "center", background: PAPER, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 14, padding: "11px 0", borderRadius: 11, border: `2px solid ${INK}`, boxShadow: `2px 2px 0 ${INK}`, textDecoration: "none" }}>
          Open the recipe →
        </Link>
      )}
      {isMine && !served && !dish.cook && (
        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {!choose && (
            <div className="flex gap-2">
              <button onClick={() => setChoose(true)} className="flex-1" style={{ background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 14, minHeight: 44, borderRadius: 11, border: `2.5px solid ${INK}`, boxShadow: `2px 2px 0 ${INK}` }}>I cooked it</button>
              {canClaim && <button onClick={onSwap} style={{ background: PAPER, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 14, minHeight: 44, padding: "0 16px", borderRadius: 11, border: `2px solid ${INK}` }}>Swap</button>}
              {canClaim && <button onClick={onRemove} aria-label="Take this off the table" style={{ background: PAPER, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 14, minHeight: 44, padding: "0 14px", borderRadius: 11, border: `2px solid ${INK}` }}>✕</button>}
            </div>
          )}
          {choose && (cooks.length === 0
            ? <Link href="/i-cooked" style={{ textAlign: "center", background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 14, padding: "12px 0", borderRadius: 11, border: `2.5px solid ${INK}`, textDecoration: "none" }}>Post what you cooked →</Link>
            : <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {cooks.map((c) => (
                  <button key={c.id} onClick={() => onCooked(c.id)} disabled={busy} className="flex-shrink-0" style={{ width: 92, background: PAPER, border: `2px solid ${INK}`, borderRadius: 10, padding: 5, textAlign: "left", boxShadow: `2px 2px 0 ${INK}` }}>
                    {c.photo_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={c.photo_url} alt="" style={{ width: "100%", height: 56, objectFit: "cover", borderRadius: 6, display: "block" }} />
                      : <div className="flex items-center justify-center" style={{ height: 56, borderRadius: 6, background: CREAM_WARM, fontSize: 22 }} aria-hidden>🍳</div>}
                    <div className="truncate" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 11.5, marginTop: 5 }}>{c.title || "a dish"}</div>
                  </button>
                ))}
              </div>)}
        </div>
      )}
    </div>
  );
}

function SeatDetail({ seat, model, onDish, onBring }: { seat: Member; model: SceneModel; onDish: (id: string) => void; onBring?: () => void }) {
  const theirs = model.dishes.filter((d) => model.seats.find((s) => s.id === seat.id)?.dishIds.includes(d.id));
  return (
    <div style={{ marginTop: 10 }}>
      {theirs.length === 0
        ? <div style={{ fontFamily: HAND, fontSize: 15, color: INK_SOFT }}>{seat.isYou ? "you haven't said what you're bringing" : "hasn't said what they're bringing yet"}</div>
        : theirs.map((d) => (
            <button key={d.id} onClick={() => onDish(d.id)} className="w-full text-left" style={{ marginTop: 8, background: PAPER, border: `2px solid ${INK}`, borderRadius: 11, padding: "11px 12px", boxShadow: `2px 2px 0 ${INK}`, fontFamily: DISP, fontWeight: 700, fontSize: 14.5, color: INK }}>
              {d.cooked ? "✓ " : ""}{d.title}
              <span style={{ fontFamily: HAND, fontWeight: 400, fontSize: 13.5, color: INK_SOFT }}>  {d.cooked ? "cooked" : "still coming"}</span>
            </button>
          ))}
      {onBring && (
        <button onClick={onBring} className="w-full" style={{ marginTop: 12, background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 15, minHeight: 46, borderRadius: 12, border: `2.5px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}` }}>
          Say what you&rsquo;re bringing →
        </button>
      )}
    </div>
  );
}

/* What you get if the canvas cannot start. Same data, same taps, no scene. */
function FallbackList({ model, onSeatTap, onDishTap }: { model: SceneModel; onSeatTap: (id: string) => void; onDishTap: (id: string) => void }) {
  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "10px 16px" }}>
      <div style={{ fontFamily: HAND, fontSize: 14, color: INK_MUTED, marginBottom: 8 }}>the table couldn&rsquo;t be drawn here — everything still works</div>
      {model.dishes.map((d) => (
        <button key={d.id} onClick={() => onDishTap(d.id)} className="w-full text-left truncate" style={{ marginTop: 8, background: PAPER, border: `2px solid ${INK}`, borderRadius: 11, padding: "11px 12px", boxShadow: `2px 2px 0 ${INK}`, fontFamily: DISP, fontWeight: 700, fontSize: 14, color: INK }}>
          {d.cooked ? "✓ " : ""}{d.title} — {d.who}
        </button>
      ))}
      {model.seats.filter((s) => s.state !== "empty").map((s) => (
        <button key={s.id} onClick={() => onSeatTap(s.id)} className="w-full text-left truncate" style={{ marginTop: 8, background: BUTTER, border: `2px solid ${INK}`, borderRadius: 11, padding: "10px 12px", fontFamily: DISP, fontWeight: 700, fontSize: 13.5, color: INK }}>
          {s.name}
        </button>
      ))}
    </div>
  );
}
