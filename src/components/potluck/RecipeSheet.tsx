"use client";

/* Picking a recipe out of a real library.
 *
 * The first version of this was a horizontal strip of tiles — fine with four
 * saved recipes, useless with four hundred. You cannot scan sideways through a
 * library, and there was no way to look for anything.
 *
 * So: a sheet with a search field, rows you can read, and multi-select —
 * because people bring two things to a potluck, and asking for one dish four
 * times is four round trips through the same screen.
 *
 * Search is client-side over the whole library. `useRecipes` already holds it,
 * SWR-shared with /recipes, so the sheet opens on data that is usually already
 * there rather than waiting on a request.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { Recipe } from "@/types";
import { CREAM_WARM, DISPLAY, HAND, INK, INK_MUTED, INK_SOFT, LIME, PAPER, TOMATO } from "@/lib/theme";

const DISP = DISPLAY;

export type SheetMode = { kind: "add" } | { kind: "swap"; submissionId: string; current: string | null };

/** Who has already said they are bringing a given recipe, by recipe id.
 *  The value is the person's name, or "you" — the row phrases it. */
export type TakenBy = Record<string, string>;

function matches(r: Recipe, q: string): boolean {
  if (!q) return true;
  const hay = `${r.title} ${(r.tags ?? []).join(" ")} ${r.meal_type ?? ""}`.toLowerCase();
  return q.split(/\s+/).every((word) => hay.includes(word));
}

function timeOf(r: Recipe): string | null {
  const mins = (r.prep_time_minutes ?? 0) + (r.cook_time_minutes ?? 0);
  if (!mins) return null;
  return mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ""}` : `${mins}m`;
}

/* Mounted only while it is open — the parent renders it conditionally. That is
   not a detail: it means a fresh search box and no selection every time,
   without an effect reaching in to reset three pieces of state. */
export default function RecipeSheet({ mode, recipes, loading, takenBy, members, busy, onClose, onConfirm }: {
  mode: SheetMode;
  recipes: Recipe[];
  loading: boolean;
  takenBy: TakenBy;
  /** People at the table who could have cooked it with you. Empty hides the row. */
  members: { id: string; name: string }[];
  busy: boolean;
  onClose: () => void;
  onConfirm: (recipeIds: string[], coUserId: string | null) => void;
}) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [withWhom, setWithWhom] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const multi = mode.kind === "add";

  useEffect(() => {
    const t = setTimeout(() => searchRef.current?.focus(), 120);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    return recipes.filter((r) => matches(r, query));
  }, [recipes, q]);

  const toggle = (id: string) => setPicked((v) => (multi ? (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]) : v[0] === id ? [] : [id]));

  const cta = mode.kind === "swap"
    ? "Bring this instead"
    : picked.length <= 1 ? "Add this dish" : `Add ${picked.length} dishes`;

  return (
    <div className="fixed inset-0 flex flex-col justify-end" style={{ zIndex: 60 }}>
      <button aria-label="Close" onClick={onClose} className="absolute inset-0" style={{ background: "rgba(23,20,16,0.45)", border: "none" }} />

      <div role="dialog" aria-modal="true" aria-label={mode.kind === "swap" ? "Swap this dish" : "Add dishes"} className="relative flex flex-col"
        style={{ background: PAPER, borderTop: `2.5px solid ${INK}`, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: "88dvh", animation: "sheetUp .26s cubic-bezier(.22,1,.36,1)" }}>

        <div style={{ padding: "14px 16px 0" }}>
          <div className="flex items-center gap-2">
            <h2 className="min-w-0 flex-1" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 20, color: INK, margin: 0 }}>
              {mode.kind === "swap" ? "Bring something else" : "What are you bringing?"}
            </h2>
            <button onClick={onClose} aria-label="Close" style={{ width: 36, height: 36, borderRadius: 99, background: "none", border: "none", fontSize: 22, color: INK, lineHeight: 1 }}>✕</button>
          </div>

          <div className="flex items-center gap-2" style={{ marginTop: 10, background: PAPER, border: `2px solid ${INK}`, borderRadius: 99, padding: "0 14px", boxShadow: `2px 2px 0 ${INK}` }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={INK_MUTED} strokeWidth={2.4} strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input
              ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="search your recipes…" aria-label="Search your recipes"
              className="min-w-0 flex-1 placeholder:text-[var(--ink-muted)]"
              style={{ background: "none", border: "none", outline: "none", padding: "12px 0", fontFamily: DISP, fontWeight: 700, fontSize: 15, color: INK }}
            />
            {q && <button onClick={() => { setQ(""); searchRef.current?.focus(); }} aria-label="Clear search" style={{ background: "none", border: "none", color: INK_MUTED, fontSize: 18, lineHeight: 1 }}>✕</button>}
          </div>

          <div style={{ fontFamily: HAND, fontSize: 14, color: INK_SOFT, marginTop: 8, paddingLeft: 4 }}>
            {loading ? "finding your recipes…" : q.trim() ? `${shown.length} ${shown.length === 1 ? "match" : "matches"}` : `${recipes.length} saved`}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ padding: "6px 16px 10px", WebkitOverflowScrolling: "touch" }}>
          {!loading && shown.length === 0 && (
            <div style={{ textAlign: "center", padding: "26px 0" }}>
              <div style={{ fontFamily: HAND, fontSize: 16, color: TOMATO, transform: "rotate(-1.5deg)" }}>
                {recipes.length === 0 ? "nothing saved yet" : `nothing matches “${q.trim()}”`}
              </div>
              {recipes.length === 0 && <div style={{ fontFamily: HAND, fontSize: 14.5, color: INK, opacity: 0.7, marginTop: 6 }}>save a recipe and it shows up here</div>}
            </div>
          )}

          {shown.map((r) => {
            const on = picked.includes(r.id);
            const taken = takenBy[r.id];
            const time = timeOf(r);
            return (
              <button key={r.id} onClick={() => toggle(r.id)} aria-pressed={on}
                className="w-full flex items-center gap-3 text-left transition-transform"
                style={{ marginTop: 8, background: on ? LIME : PAPER, border: `2px solid ${INK}`, borderRadius: 12, padding: 7, transform: on ? "translate(1px,1px)" : "none", boxShadow: on ? `1px 1px 0 ${INK}` : `2px 2px 0 ${INK}` }}>
                {r.image_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={r.image_url} alt="" style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 8, flexShrink: 0, border: `1.5px solid ${INK}` }} />
                  : <div className="flex items-center justify-center" style={{ width: 52, height: 52, borderRadius: 8, flexShrink: 0, background: CREAM_WARM, border: `1.5px solid ${INK}`, fontSize: 21 }} aria-hidden>🍽️</div>}
                <span className="min-w-0 flex-1">
                  <span className="block truncate" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 15, color: INK }}>{r.title}</span>
                  <span className="block truncate" style={{ fontFamily: HAND, fontSize: 13.5, color: taken ? TOMATO : INK_SOFT, marginTop: 1 }}>
                    {taken ? (taken === "you" ? "you're bringing this" : `${taken} is bringing this`) : [r.meal_type, time].filter(Boolean).join(" · ") || "no times saved"}
                  </span>
                </span>
                <span aria-hidden className="flex items-center justify-center" style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 99, border: `2px solid ${INK}`, background: on ? INK : "transparent", color: PAPER, fontSize: 13, fontWeight: 700, marginRight: 4 }}>
                  {on ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ padding: "10px 16px calc(env(safe-area-inset-bottom,0px) + 14px)", borderTop: `2px solid ${INK}`, background: PAPER }}>
          {picked.length > 0 && members.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: HAND, fontSize: 14, color: INK, opacity: 0.8 }}>cooking {picked.length > 1 ? "them" : "it"} with someone?</div>
              <div className="flex gap-2 overflow-x-auto" style={{ marginTop: 6, paddingBottom: 2, scrollbarWidth: "none" }}>
                {members.map((m) => {
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
          <button disabled={busy || picked.length === 0} onClick={() => onConfirm(picked, withWhom || null)}
            className="w-full active:scale-[0.98] transition-transform"
            style={{ background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 16, padding: "14px 0", borderRadius: 13, border: `2.5px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`, opacity: busy || picked.length === 0 ? 0.45 : 1 }}>
            {cta}
          </button>
        </div>
      </div>

      <style>{`@keyframes sheetUp{from{transform:translateY(14px);opacity:.6}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}
