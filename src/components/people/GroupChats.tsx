"use client";

// Bring Marco into your group chats. Household = ONE shared kitchen (recipe
// links anyone drops in land for everyone). Family / Friends = a TABLE, where
// people share what they cooked — recipe links there aren't saved for everyone.
// The seed message comes from the server (POST /api/people/start) and carries a
// signed invite link; the checkmark only lands once Marco actually receives it
// in a GROUP chat. Until then this device remembers "waiting for Marco"
// (localStorage per account, 3 days — the link's lifetime).
// Two ways in: a NEW group (native contact picker → Messages opens with Marco +
// everyone addressed at once; without the picker, copy-and-paste steps) or a
// group you ALREADY have (add Marco, paste the message). Never a 1:1 sms: link —
// iOS would drop the seed into your existing thread with Marco.
// Used by the onboarding guide (full), Home (compact) and /crew (TableChatButton).

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Capacitor } from "@capacitor/core";
import { SPRING_SHEET, SPRING_STICKER, PRESS } from "@/lib/motion";
import { pickContactNumber } from "@/lib/native/pickContact";

const INK = "#171410";
const PAPER = "#FBF7EE";
const LIME = "#C4EE45";
const BUTTER = "#FFD84D";
const LAV = "#C9B8FF";
const COBALT = "#2540E8";
const TOMATO = "#E5462E";
const DISP = '"Marker Felt", Georgia, serif';
const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
const SANS = "system-ui, -apple-system, sans-serif";
const MONO = "ui-monospace, monospace";

export type GroupKey = "household" | "family" | "friends";
export type Groups = Record<GroupKey, boolean>;

// What a sheet starts: one of the three people rows, or any table from /crew.
type Target = { id: string; group: GroupKey | "table"; crewId?: string; label: string; emoji: string; tile: string; title: string; chat: string };
const GROUPS: (Target & { key: GroupKey; sub: string })[] = [
  { id: "household", key: "household", group: "household", label: "Household", sub: "one shared kitchen — recipes anyone drops in land for everyone", emoji: "🏠", tile: LIME, title: "Your household kitchen chat", chat: "household" },
  { id: "family", key: "family", group: "family", label: "Family", sub: "a table — share what you cook, see what they cook", emoji: "👪", tile: BUTTER, title: "Your family table chat", chat: "family" },
  { id: "friends", key: "friends", group: "friends", label: "Friends", sub: "a table for the friends you cook with", emoji: "🍻", tile: LAV, title: "Your friends' table chat", chat: "friends" },
];

const post = (u: string, body: unknown) => fetch(u, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const isNative = () => { try { return Capacitor.isNativePlatform(); } catch { return false; } };
// The picker needs the native plugin in THIS build — an older binary loading a
// newer web deploy may not have it.
const canPickContacts = () => { try { return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("Contacts"); } catch { return false; } };
// Contact-picker numbers come formatted ("(555) 123-4567"); an iMessage
// address can also be an email — leave those alone.
const address = (n: string) => (n.includes("@") ? n : n.replace(/[^\d+]/g, ""));

// Marco's iMessage number, fetched once per session (only when someone actually
// opens a chat — never on page load).
let marcoNumberCache: string | null = null;
export async function getMarcoNumber(): Promise<string | null> {
  if (marcoNumberCache) return marcoNumberCache;
  const v = await fetch("/api/imessage/link", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  marcoNumberCache = (v?.marcoNumber as string | undefined) || null;
  return marcoNumberCache;
}

// ── "waiting for Marco" ──────────────────────────────────────────────────────
// Sent from THIS device but not confirmed yet. Server truth (groups[key]) always
// wins; this only fills the gap between sending and Marco hearing it. Scoped to
// the account so a shared phone never shows someone else's state.
const PENDING_TTL = 3 * 24 * 60 * 60 * 1000; // the invite link's lifetime
const POLL_WINDOW = 10 * 60 * 1000;          // poll for Marco's reply this long after sending
type Pending = Partial<Record<GroupKey, number>>;
const pendingKey = (uid?: string) => `marco_people_pending:${uid ?? "anon"}`;
export function readPending(uid?: string): Pending {
  if (typeof window === "undefined") return {};
  try {
    const raw = JSON.parse(localStorage.getItem(pendingKey(uid)) || "{}") as Record<string, unknown>;
    const now = Date.now();
    const out: Pending = {};
    for (const g of GROUPS) {
      const t = raw?.[g.key];
      if (typeof t === "number" && now - t < PENDING_TTL) out[g.key] = t;
    }
    return out;
  } catch { return {}; }
}
function writePending(p: Pending, uid?: string) {
  try {
    if (Object.keys(p).length) localStorage.setItem(pendingKey(uid), JSON.stringify(p));
    else localStorage.removeItem(pendingKey(uid));
  } catch { /* ignore */ }
}
// Groups sent from here that Marco hasn't confirmed yet.
export function pendingGroups(groups: Groups, uid?: string): GroupKey[] {
  const p = readPending(uid);
  return GROUPS.filter((g) => p[g.key] && !groups[g.key]).map((g) => g.key);
}
// SWR refreshInterval for /api/quests: poll briefly after a send so the
// checkmark lands while you're still looking.
export function peoplePollInterval(data: { groups?: Groups; uid?: string } | undefined): number {
  if (!data?.groups) return 0;
  const p = readPending(data.uid);
  const now = Date.now();
  return GROUPS.some((g) => p[g.key] && !data.groups![g.key] && now - p[g.key]! < POLL_WINDOW) ? 4000 : 0;
}

export default function GroupChats({ groups, onChange, variant, uid }: { groups: Groups; onChange: () => void; variant: "full" | "compact"; uid?: string }) {
  const [open, setOpen] = useState<GroupKey | null>(null);
  const [pending, setPending] = useState<Pending>(() => readPending(uid));
  const opener = useRef<{ key: GroupKey; el: HTMLElement } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Once Marco's in, forget the local "waiting".
  const { household, family, friends } = groups;
  useEffect(() => {
    const p = readPending(uid);
    const done: Groups = { household, family, friends };
    const keep: Pending = {};
    for (const g of GROUPS) if (p[g.key] && !done[g.key]) keep[g.key] = p[g.key];
    if (Object.keys(keep).length !== Object.keys(p).length) writePending(keep, uid);
  }, [household, family, friends, uid]);

  const status = (k: GroupKey): "done" | "pending" | "none" => (groups[k] ? "done" : pending[k] ? "pending" : "none");
  function openSheet(key: GroupKey, el: HTMLElement) { opener.current = { key, el }; setOpen(key); }
  // Synchronous on purpose — it can run inside the tap that opens Messages.
  function started(key: GroupKey) {
    const next = { ...readPending(uid), [key]: Date.now() };
    writePending(next, uid);
    setPending(next);
    setOpen(null);
    onChange();
  }
  // Focus goes back where it came from; if that control was swapped (Start →
  // redo), to whatever now opens the same row.
  function restoreFocus() {
    const o = opener.current;
    if (!o) return;
    const el = o.el.isConnected ? o.el : listRef.current?.querySelector<HTMLElement>(`[data-people-open="${o.key}"]`);
    el?.focus({ preventScroll: true });
  }

  const target = open ? GROUPS.find((g) => g.key === open)! : null;
  const sheet = (
    <AnimatePresence onExitComplete={restoreFocus}>
      {target && <StartSheet key={target.id} target={target} onClose={() => setOpen(null)} onStarted={() => started(target.key)} />}
    </AnimatePresence>
  );

  return (
    <>
      {variant === "full" ? (
        <div ref={listRef} className="space-y-2.5" style={{ marginTop: 14 }}>
          {GROUPS.map((g) => {
            const st = status(g.key);
            return (
              <div key={g.key} className="flex items-center gap-3" style={{ background: "#fff", border: `2px solid ${INK}`, borderRadius: 14, padding: "10px 12px" }}>
                <span aria-hidden className="flex flex-shrink-0 items-center justify-center" style={{ width: 42, height: 42, borderRadius: 12, background: g.tile, border: `2px solid ${INK}`, fontSize: 20 }}>{g.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 16, color: INK, lineHeight: 1.1 }}>{g.label}</span>
                  <span className="block" style={{ fontFamily: SANS, fontSize: 12.5, color: INK, opacity: 0.65, marginTop: 2, lineHeight: 1.3 }}>{g.sub}</span>
                  {st === "pending" && <span className="block" style={{ fontFamily: HAND, fontSize: 14, color: COBALT, marginTop: 3 }}>waiting for Marco to reply in the chat</span>}
                </span>
                {st === "done" ? (
                  <motion.span initial={{ scale: 1.5, rotate: 18, opacity: 0 }} animate={{ scale: 1, rotate: -6, opacity: 1 }} transition={SPRING_STICKER} className="flex-shrink-0" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 13, color: INK, background: LIME, border: `2px solid ${INK}`, padding: "4px 10px", boxShadow: `2px 2px 0 ${INK}`, whiteSpace: "nowrap" }}>Marco&apos;s in ✓</motion.span>
                ) : st === "pending" ? (
                  <button data-people-open={g.key} onClick={(e) => openSheet(g.key, e.currentTarget)} aria-label={`Redo your ${g.label.toLowerCase()} chat with Marco`} className="flex-shrink-0 active:scale-95 transition-transform" style={{ fontFamily: HAND, fontSize: 15, color: INK, background: PAPER, border: `2px dashed ${INK}`, borderRadius: 11, padding: "0 12px", minHeight: 44, minWidth: 44 }}>redo</button>
                ) : (
                  <motion.button data-people-open={g.key} whileTap={PRESS} transition={SPRING_STICKER} onClick={(e) => openSheet(g.key, e.currentTarget)} aria-label={`Start a ${g.label.toLowerCase()} chat with Marco`} className="flex-shrink-0" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: PAPER, background: COBALT, border: `2px solid ${INK}`, borderRadius: 11, padding: "9px 14px", minHeight: 44, boxShadow: `2px 3px 0 ${INK}` }}>Start</motion.button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div ref={listRef} style={{ background: BUTTER, border: `2.5px solid ${INK}`, borderRadius: 16, padding: "12px 14px", boxShadow: `3px 4px 0 ${INK}` }}>
          <div className="flex items-center gap-2">
            <span aria-hidden style={{ fontSize: 18 }}>💬</span>
            <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 16, color: INK, lineHeight: 1.1 }}>Cook with your people</span>
          </div>
          <div style={{ fontFamily: SANS, fontSize: 13, color: INK, opacity: 0.75, marginTop: 3, lineHeight: 1.3 }}>Your household shares one kitchen. Family and friends get a table — share what you cooked.</div>
          <div className="flex flex-wrap gap-2" style={{ marginTop: 10 }}>
            {GROUPS.map((g) => {
              const st = status(g.key);
              const label = st === "done" ? `${g.label} chat — Marco's in. Open to start another` : st === "pending" ? `${g.label} chat — waiting for Marco. Open to redo` : `Start a ${g.label.toLowerCase()} chat with Marco`;
              return (
                <motion.button key={g.key} data-people-open={g.key} whileTap={PRESS} transition={SPRING_STICKER} onClick={(e) => openSheet(g.key, e.currentTarget)} aria-label={label} style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: INK, background: st === "done" ? LIME : PAPER, border: `2px ${st === "pending" ? "dashed" : "solid"} ${INK}`, borderRadius: 99, padding: "0 14px", minHeight: 44, boxShadow: st === "done" ? `2px 2px 0 ${INK}` : "none" }}>
                  {st === "done" ? "✓ " : st === "pending" ? "⏳ " : `${g.emoji} `}{g.label}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Portaled to <body> so a transformed or scrolling parent (the guide's
          sheet) can't trap or clip this fixed overlay. */}
      {typeof document !== "undefined" ? createPortal(sheet, document.body) : null}
    </>
  );
}

// "Start it as a group chat with Marco" for any table on /crew.
export function TableChatButton({ crewId, name, emoji }: { crewId: string; name: string; emoji: string | null }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const target: Target = { id: `table:${crewId}`, group: "table", crewId, label: name, emoji: emoji || "🍽️", tile: LIME, title: `${name} — group chat`, chat: name };
  return (
    <>
      <button ref={btn} onClick={() => setOpen(true)} className="w-full active:scale-[0.98] transition-transform" style={{ marginTop: 12, background: LIME, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 15, padding: "12px 0", minHeight: 44, borderRadius: 12, border: `2.5px solid ${INK}` }}>💬 start it as a group chat with Marco</button>
      {sent && <div role="status" style={{ fontFamily: HAND, fontSize: 14, color: COBALT, marginTop: 6 }}>waiting for Marco to reply in the chat</div>}
      {typeof document !== "undefined" ? createPortal(
        <AnimatePresence onExitComplete={() => btn.current?.focus({ preventScroll: true })}>
          {open && <StartSheet key={target.id} target={target} onClose={() => setOpen(false)} onStarted={() => { setSent(true); setOpen(false); }} />}
        </AnimatePresence>, document.body) : null}
    </>
  );
}

type Ready = { number: string; seed: string };

// This chat's seed message — a signed invite link Marco recognises when it
// arrives in a group. Minted fresh each time the sheet opens.
async function fetchSeed(t: Target): Promise<{ seed: string } | { error: string }> {
  try {
    const r = await post("/api/people/start", t.group === "table" ? { group: "table", crewId: t.crewId } : { group: t.group });
    const v = await r.json().catch(() => null);
    if (r.ok && typeof v?.seed === "string" && v.seed) return { seed: v.seed };
    return { error: (typeof v?.error === "string" && v.error) || "Your chat couldn't be set up. Try again." };
  } catch {
    return { error: "Your chat couldn't be set up. Check your connection and try again." };
  }
}

function StartSheet({ target, onClose, onStarted }: { target: Target; onClose: () => void; onStarted: () => void }) {
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [people, setPeople] = useState<{ name: string | null; number: string }[]>([]);
  const [pickHint, setPickHint] = useState("");
  const [ready, setReady] = useState<Ready | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [copied, setCopied] = useState<"" | "number" | "message">("");
  const [copyHint, setCopyHint] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const seedRef = useRef<HTMLDivElement>(null);
  const canPick = canPickContacts();
  const native = isNative();
  const titleId = `people-sheet-title-${target.id.replace(/[^a-z0-9-]/gi, "")}`;

  // Marco's number + this chat's seed, together — nothing to send until both are here.
  useEffect(() => {
    let live = true;
    void Promise.all([getMarcoNumber(), fetchSeed(target)]).then(([n, s]) => {
      if (!live) return;
      if ("error" in s) { setLoadErr(s.error); return; }
      if (!n) { setLoadErr("Marco's number isn't available right now. Try again in a moment."); return; }
      setReady({ number: n, seed: s.seed });
    });
    return () => { live = false; };
    // target is rebuilt each render; its id names the chat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.id, attempt]);
  function retry() { setLoadErr(""); setAttempt((a) => a + 1); }

  // Focus the heading on open; Escape closes.
  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function addPerson() {
    setPickHint("");
    const c = await pickContactNumber();
    if (!c) return; // cancelled
    if (!c.number) { setPickHint(`${c.name || "That contact"} has no phone number.`); return; }
    setPeople((p) => (p.some((x) => x.number === c.number) ? p : [...p, { name: c.name, number: c.number! }]));
  }
  // No awaits in here: mobile Safari only follows an sms: link set inside the
  // tap itself, so the number and seed were fetched when the sheet opened.
  // Always Marco + at least one person — a lone address would open your
  // existing 1:1 thread with Marco instead of a new group.
  function openNewChat() {
    if (!ready || !people.length) return;
    const url = `sms:/open?addresses=${[ready.number, ...people.map((p) => address(p.number))].join(",")}&body=${encodeURIComponent(ready.seed)}`;
    onStarted();
    window.location.href = url;
  }
  async function copy(what: "number" | "message") {
    if (!ready) return;
    setCopyHint("");
    try {
      await navigator.clipboard.writeText(what === "number" ? ready.number : ready.seed);
      setCopied(what);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      // Clipboard blocked — select the text so the system Copy is one tap away.
      if (what === "message" && seedRef.current) {
        const r = document.createRange();
        r.selectNodeContents(seedRef.current);
        const s = window.getSelection();
        s?.removeAllRanges(); s?.addRange(r);
        setCopyHint("Couldn't copy — it's selected above, copy it from there.");
      } else setCopyHint("Couldn't copy — the number is shown above.");
    }
  }

  const primary = { color: PAPER, background: COBALT, fontFamily: DISP, fontWeight: 700, fontSize: 16, padding: "13px 0", borderRadius: 14, border: `2.5px solid ${INK}`, boxShadow: `3px 4px 0 ${INK}`, minHeight: 48 } as const;
  const seg = (on: boolean) => ({ flex: 1, fontFamily: DISP, fontWeight: 700, fontSize: 14, color: on ? PAPER : INK, background: on ? INK : "transparent", border: "none", borderRadius: 10, padding: "0 6px", minHeight: 44 }) as const;
  const small = { fontFamily: DISP, fontWeight: 700, fontSize: 14, color: INK, background: "#fff", border: `2px solid ${INK}`, borderRadius: 11, padding: "0 14px", minHeight: 44 } as const;
  const copyText = { fontFamily: SANS, fontSize: 14, color: "#4A4742", lineHeight: 1.45 } as const;
  const stepLabel = { fontFamily: DISP, fontWeight: 700, fontSize: 15, color: INK, lineHeight: 1.2 } as const;
  const isHousehold = target.group === "household";

  // Copy-and-paste steps: a new message you start yourself (no picker), or a
  // group you already have.
  const steps = (first: React.ReactNode) => (
    <ol style={{ marginTop: 14, listStyle: "none", padding: 0 }} className="space-y-4">
      <li>
        {first}
        {ready && <div style={{ fontFamily: MONO, fontSize: 13, color: INK, marginTop: 6, userSelect: "text", WebkitUserSelect: "text" }}>Marco: {ready.number}</div>}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1" style={{ marginTop: 8 }}>
          <button onClick={() => copy("number")} disabled={!ready} className="active:scale-95 transition-transform disabled:opacity-60" style={small}>{copied === "number" ? "copied!" : "Copy Marco's number"}</button>
          {!native && <a href="/api/marco/contact" className="inline-flex items-center" style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: INK, textDecoration: "underline", minHeight: 44 }}>Save Marco to your contacts</a>}
        </div>
      </li>
      <li>
        <div style={stepLabel}>2. Paste this message in the chat and send it:</div>
        {ready && (
          <div ref={seedRef} aria-label="The message to send" style={{ marginTop: 8, background: "#fff", border: `2px solid ${INK}`, borderRadius: 12, padding: "10px 12px", fontFamily: SANS, fontSize: 13.5, color: INK, lineHeight: 1.4, whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 132, overflowY: "auto", userSelect: "text", WebkitUserSelect: "text" }}>{ready.seed}</div>
        )}
        <button onClick={() => copy("message")} disabled={!ready} className="mt-2 active:scale-95 transition-transform disabled:opacity-60" style={small}>{copied === "message" ? "copied!" : "Copy message"}</button>
      </li>
      <li>
        <button onClick={() => onStarted()} disabled={!ready} className="w-full disabled:opacity-60" style={primary}>I sent it</button>
      </li>
    </ol>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} className="fixed inset-0 z-[95] flex items-end justify-center" style={{ background: "rgba(23,20,16,0.45)", padding: "14px 12px calc(env(safe-area-inset-bottom,0px) + 14px)" }}>
      <motion.div role="dialog" aria-modal="true" aria-labelledby={titleId} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0, transition: { duration: 0.15 } }} transition={SPRING_SHEET} className="relative w-full" style={{ maxWidth: 440, background: PAPER, border: `2.5px solid ${INK}`, borderRadius: 22, padding: "18px 16px 16px", boxShadow: `5px 6px 0 ${INK}`, maxHeight: "86dvh", overflowY: "auto" }}>
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="flex flex-shrink-0 items-center justify-center" style={{ width: 40, height: 40, borderRadius: 12, background: target.tile, border: `2px solid ${INK}`, fontSize: 20 }}>{target.emoji}</span>
          <h2 id={titleId} ref={headingRef} tabIndex={-1} className="min-w-0 flex-1" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 19, color: INK, lineHeight: 1.1, outline: "none", overflowWrap: "anywhere" }}>{target.title}</h2>
        </div>
        <p style={{ ...copyText, marginTop: 8 }}>
          {isHousehold
            ? "Everyone at home in one chat with Marco. Recipe links anyone drops in land in your shared kitchen."
            : "Your people in one chat with Marco. Tell him what you cooked and it goes on the table."}
        </p>
        <div role="group" aria-label="How to start it" className="flex" style={{ marginTop: 12, background: "rgba(23,20,16,0.07)", borderRadius: 12, padding: 3, gap: 3 }}>
          <button aria-pressed={mode === "new"} onClick={() => setMode("new")} style={seg(mode === "new")}>New group</button>
          <button aria-pressed={mode === "existing"} onClick={() => setMode("existing")} style={seg(mode === "existing")}>One I already have</button>
        </div>

        {/* loading / failure, announced */}
        <div role="status" aria-live="polite" style={{ fontFamily: HAND, fontSize: 16, color: INK, opacity: 0.7, marginTop: !ready && !loadErr ? 12 : 0 }}>{!ready && !loadErr ? "getting your chat ready…" : ""}</div>
        {loadErr && (
          <div style={{ marginTop: 12 }}>
            <p role="alert" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: TOMATO }}>{loadErr}</p>
            <button onClick={retry} className="mt-2 active:scale-95 transition-transform" style={small}>Try again</button>
          </div>
        )}

        {mode === "new" ? (
          canPick ? (
            <div style={{ marginTop: 14 }}>
              <p style={copyText}>{isHousehold ? "Pick who lives with you. Messages opens a new group with Marco and all of them — send the first message and it's your shared kitchen." : "Pick your people. Messages opens a new group with Marco and all of them — send the first message and Marco sets your table."}</p>
              <div className="flex flex-wrap gap-2" style={{ marginTop: 10 }}>
                {people.map((p) => (
                  <span key={p.number} className="flex items-center" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 13, color: INK, background: LIME, border: `2px solid ${INK}`, borderRadius: 99, paddingLeft: 12 }}>
                    {p.name || p.number}
                    <button aria-label={`Remove ${p.name || p.number}`} onClick={() => setPeople((x) => x.filter((y) => y.number !== p.number))} style={{ background: "none", border: "none", fontSize: 16, color: INK, minWidth: 44, minHeight: 44 }}>×</button>
                  </span>
                ))}
                <button onClick={addPerson} className="active:scale-95 transition-transform" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: INK, background: PAPER, border: `2px dashed ${INK}`, borderRadius: 99, padding: "0 14px", minHeight: 44 }}>＋ Add a person</button>
              </div>
              {pickHint && <p role="alert" style={{ fontFamily: HAND, fontSize: 14, color: TOMATO, marginTop: 8 }}>{pickHint}</p>}
              <button onClick={openNewChat} disabled={!ready || !people.length} className="mt-4 w-full disabled:opacity-60" style={primary}>{people.length ? `Open group chat (${people.length + 1})` : "Add at least one person"}</button>
            </div>
          ) : steps(
            <>
              <div style={stepLabel}>1. In Messages, start a new message to Marco and your people</div>
              <p style={{ ...copyText, marginTop: 4 }}>Put Marco&apos;s number and everyone you want in the To: line.</p>
            </>,
          )
        ) : steps(
          <>
            <div style={stepLabel}>1. Add Marco to your {target.chat} group chat</div>
            <p style={{ ...copyText, marginTop: 4 }}>In the chat, tap the names at the top, then add Marco&apos;s number. This only works in a group — if it&apos;s just the two of you, use New group.</p>
          </>,
        )}

        {copyHint && <p role="alert" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: TOMATO, marginTop: 10 }}>{copyHint}</p>}
        <button onClick={onClose} className="mx-auto mt-2 block" style={{ fontFamily: HAND, fontSize: 15, color: INK, opacity: 0.7, background: "none", border: "none", minHeight: 44, padding: "0 16px" }}>back</button>
      </motion.div>
    </motion.div>
  );
}
