"use client";

/* The first-run guide, in two chapters.
   Chapter 1 — "your kitchen": cook around (diets + allergies) → this or that
   (taste) → save a recipe (or Surprise me) → when are you cooking it? (plans it,
   fills groceries, asks for notifications in context) → graduation.
   Chapter 2 — "your people": one step — start a chat with Marco and add your
   household or your table. If you don't, Home keeps a persistent button for it.
   Completion is data-driven (/api/quests). It can't be dismissed, only skipped
   step by step, and it only appears on Kitchen and Table so it never blocks
   Grocery, Plan or Profile. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import TomatoMascot from "@/components/gamification/TomatoMascot";
import { requestNotifications } from "@/lib/native/notifications";
import { DIET_OPTIONS, ALLERGY_OPTIONS, tagsSafe, type FoodTag } from "@/lib/cook/cookAround";
import { guideStore } from "./guideStore";
import { AnimatePresence, motion } from "motion/react";
import { SPRING_SHEET, SPRING_STICKER } from "@/lib/motion";
import GroupChats, { pendingGroups, peoplePollInterval, type Groups } from "@/components/people/GroupChats";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const LIME = "#C4EE45";
const BUTTER = "#FFD84D";
const COBALT = "#2540E8";
const DISP = '"Marker Felt", Georgia, serif';
const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
const SANS = "system-ui, -apple-system, sans-serif";
const img = (p: string) => encodeURI(p);
const SHEET_SHADOW = `5px 6px 0 ${INK}`;

type Done = Record<string, boolean>;
type Kind = "around" | "duel" | "action" | "plan" | "graduate" | "people";
type Step = {
  key: string;
  kind: Kind;
  chapter: 1 | 2;
  title: string;
  body: string;
  cta?: string;
  ctaRoute?: string;
  spotlight?: string;
  surprise?: boolean;
};

const STEPS: Step[] = [
  { key: "allergies", kind: "around", chapter: 1, title: "Anything I should cook around?", body: "I'll keep these out of everything I suggest." },
  { key: "taste", kind: "duel", chapter: 1, title: "This or that?", body: "Tap the one you'd rather cook." },
  { key: "recipe", kind: "action", chapter: 1, title: "Save your first recipe", body: "Tap + below, then Add a recipe — paste a link or snap a photo. Or let me pick one.", cta: "Add a recipe", ctaRoute: "/recipes?import=1", spotlight: "[data-guide='create']", surprise: true },
  { key: "plan", kind: "plan", chapter: 1, title: "When are you cooking it?", body: "I'll put it on your plan and build your grocery list." },
  { key: "graduate", kind: "graduate", chapter: 1, title: "Your kitchen is open", body: "" },
  { key: "people", kind: "people", chapter: 2, title: "Cook with your people", body: "Bring me into your chats. Your household shares one kitchen — recipes anyone drops in land for everyone. Family and friends get a table, where you share what you cooked. Do one now, the rest whenever." },
];
const CHAPTER1 = STEPS.filter((s) => s.chapter === 1 && s.kind !== "graduate");

// The this-or-that duel. Explicit allergen/diet tags (shared with the server's
// starter checks) so we never show a dish someone can't eat.
const DUEL: { t: string; img: string; tags: FoodTag[] }[] = [
  { t: "Mapo Tofu", img: "/onboarding/recipes/mapo-tofu.jpg", tags: ["meat", "pork", "soy", "gluten"] },
  { t: "Shrimp Scampi", img: "/onboarding/recipes/shrimp scampi.jpg", tags: ["shellfish", "dairy", "gluten"] },
  { t: "Chicken Shawarma", img: "/onboarding/recipes/Chicken-Shawarma-8.jpg", tags: ["meat", "dairy", "gluten"] },
  { t: "Tabbouleh", img: "/onboarding/recipes/tabbouleh.jpg", tags: ["gluten"] },
  { t: "Salmon Teriyaki", img: "/onboarding/recipes/salmon terriyaki.jpg", tags: ["fish", "soy", "gluten", "sesame"] },
  { t: "Buffalo Wings", img: "/onboarding/recipes/buffalowings.jpg", tags: ["meat", "dairy"] },
  { t: "Ceviche", img: "/onboarding/recipes/ceviche.jpg", tags: ["fish"] },
  { t: "Lamb Biryani", img: "/onboarding/recipes/lamb-biryani-83e5c3d.jpg", tags: ["meat", "dairy", "treenuts"] },
  { t: "Fettuccine Alfredo", img: "/onboarding/recipes/fettuccine-alfredo.jpg", tags: ["dairy", "gluten", "eggs"] },
  { t: "Smoked Brisket", img: "/onboarding/recipes/smoked-brisket.jpg", tags: ["meat"] },
];

// The Surprise reel — slugs match the server's curated starters (/api/recipes/seed).
const SURPRISES = [
  { slug: "mapo-tofu", title: "Mapo Tofu", img: "/onboarding/recipes/mapo-tofu.jpg" },
  { slug: "shrimp-scampi", title: "Shrimp Scampi", img: "/onboarding/recipes/shrimp scampi.jpg" },
  { slug: "chicken-shawarma", title: "Chicken Shawarma", img: "/onboarding/recipes/Chicken-Shawarma-8.jpg" },
  { slug: "fettuccine-alfredo", title: "Fettuccine Alfredo", img: "/onboarding/recipes/fettuccine-alfredo.jpg" },
  { slug: "salmon-teriyaki", title: "Salmon Teriyaki", img: "/onboarding/recipes/salmon terriyaki.jpg" },
  { slug: "creamy-pork-stew", title: "Creamy Pork Stew", img: "/onboarding/recipes/245361-creamy-pork-stew-Beauty-4x3-a56080e9b5a4462a8dad0a7661f6d1f4.jpg" },
];
type Reel = typeof SURPRISES;

// The guide only lives on the two homes — it never blocks Grocery, Plan or Profile.
const SHOW_ON = ["/kitchen", "/friends-stack"];
const fetcher = async (u: string) => { const r = await fetch(u); if (!r.ok) throw new Error("x"); return r.json(); };
const post = (u: string, body: unknown) => fetch(u, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Local (not UTC) calendar dates, so "tonight" is tonight wherever you are.
const localISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const daysFromNow = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
function weekendDate(): Date { const day = new Date().getDay(); return day === 6 || day === 0 ? new Date() : daysFromNow(6 - day); }

export default function MarcoGuide() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { mutate: globalMutate } = useSWRConfig();
  const [skipped, setSkipped] = useState<string[]>([]);
  const [skipsLoaded, setSkipsLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [diets, setDiets] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [aroundLoaded, setAroundLoaded] = useState(false);
  const [aroundErr, setAroundErr] = useState("");
  const touched = useRef(false);
  const [round, setRound] = useState(0);
  const [winners, setWinners] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  // The reel snapshots its dishes at spin start, so it never empties mid-reveal.
  const [spin, setSpin] = useState<{ idx: number; landed: boolean; failed?: boolean; items: Reel } | null>(null);
  const [reveal, setReveal] = useState<{ selector: string; note: string } | null>(null);
  const [revealRect, setRevealRect] = useState<DOMRect | null>(null);
  const [planned, setPlanned] = useState<{ label: string; title: string; image_url: string | null; ingredientCount: number } | null>(null);
  const [planErr, setPlanErr] = useState("");
  const [pickDay, setPickDay] = useState(false);
  const spinning = useRef(false);

  const shown = SHOW_ON.includes(pathname);
  // A fresh refreshInterval identity after each chat send re-arms SWR's poll.
  const [sentTick, setSentTick] = useState(0);
  const pollInterval = useMemo(() => (d: { groups?: Groups; uid?: string } | undefined) => peoplePollInterval(d), [sentTick]); // eslint-disable-line react-hooks/exhaustive-deps
  const { data, mutate } = useSWR<{ done: Done; uid?: string; groups?: Groups; epoch?: string | null }>(shown ? "/api/quests" : null, fetcher, { revalidateOnFocus: true, revalidateOnMount: true, refreshInterval: pollInterval });
  const done = data?.done;
  const uid = data?.uid;
  const groups: Groups = data?.groups ?? { household: false, family: false, friends: false };

  // Skips are remembered per ACCOUNT (not per device), once we know who you are.
  // Scoped to the guide's restart point too: after an onboarding reset, steps
  // skipped on this device before it come back.
  const epoch = data?.epoch ?? null;
  const skipKey = uid ? `marco_guide_skipped:${uid}${epoch ? `:${epoch}` : ""}` : null;
  useEffect(() => {
    if (!skipKey) return;
    try { const raw = localStorage.getItem(skipKey); setSkipped(raw ? JSON.parse(raw) : []); } catch { setSkipped([]); }
    setSkipsLoaded(true);
  }, [skipKey]);
  function addSkip(key: string, persist = true) {
    setSkipped((prev) => {
      if (prev.includes(key)) return prev;
      const next = [...prev, key];
      if (persist && skipKey) { try { localStorage.setItem(skipKey, JSON.stringify(next)); } catch { /* ignore */ } }
      return next;
    });
  }

  // Plan only makes sense once there's a recipe to plan.
  const applicable = (s: Step) => !(s.key === "plan" && !done?.recipe);
  const active = done && skipsLoaded ? STEPS.find((s) => applicable(s) && !done[s.key] && !skipped.includes(s.key)) ?? null : null;
  const holding = !!(planned || reveal || spin); // finish the current beat before advancing

  useEffect(() => { if (shown) void mutate(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Diets + allergies (saved earlier, or from this session) — the duel and the
  // reel respect them. A late load never overwrites chips you already tapped.
  useEffect(() => {
    if (!shown) return;
    void Promise.all([fetch("/api/user/dietary").then((r) => (r.ok ? r.json() : null)), fetch("/api/user/allergies").then((r) => (r.ok ? r.json() : null))])
      .then(([d, a]) => { if (touched.current) return; if (Array.isArray(d?.filters)) setDiets(d.filters); if (Array.isArray(a?.allergies)) setAllergies(a.allergies); })
      .catch(() => {})
      .finally(() => setAroundLoaded(true));
  }, [shown]);
  const { data: elig } = useSWR<{ slugs: string[] }>(shown && active?.key === "recipe" ? "/api/recipes/seed" : null, fetcher);
  const reel = useMemo(() => SURPRISES.filter((s) => elig?.slugs?.includes(s.slug)), [elig]);
  const { data: planRecipe } = useSWR<{ recipe: { id: string; title: string; image_url: string | null } | null }>(shown && (active?.key === "plan" || active?.key === "graduate") ? "/api/guide/plan" : null, fetcher);

  const duel = useMemo(() => DUEL.filter((d) => tagsSafe(d.tags, diets, allergies)), [diets, allergies]);
  const rounds = Math.min(3, Math.floor(duel.length / 2));

  // Spotlight rect for action steps (+ button) and for reveals.
  const [rect, setRect] = useState<DOMRect | null>(null);
  const target = reveal?.selector ?? (active?.kind === "action" ? active.spotlight : undefined);
  useEffect(() => {
    if (!target || !shown) { setRect(null); setRevealRect(null); return; }
    let first = true;
    const measure = () => {
      const el = document.querySelector(target);
      // Bring a reveal target into view INSTANTLY before measuring, so its coach
      // card is placed once, on the right side, instead of hopping after a scroll.
      if (el && first && reveal) { first = false; el.scrollIntoView({ block: "center", behavior: "auto" }); }
      const r = el ? el.getBoundingClientRect() : null;
      if (reveal) setRevealRect(r); else setRect(r);
    };
    const t = setTimeout(measure, reveal ? 350 : 0);
    const id = setInterval(measure, 500);
    window.addEventListener("resize", measure);
    return () => { clearTimeout(t); clearInterval(id); window.removeEventListener("resize", measure); };
  }, [target, shown, reveal]);

  useEffect(() => { guideStore.set(shown && (!!active || holding)); }, [shown, active, holding]);
  useEffect(() => () => guideStore.set(false), []);
  useEffect(() => { setRound(0); setWinners([]); setChosen(null); setPickDay(false); setPlanErr(""); setAroundErr(""); }, [active?.key]);
  // Graduation: move focus to the headline without scrolling past it.
  useEffect(() => {
    if (active?.key !== "graduate") return;
    const t = setTimeout(() => document.getElementById("mg-grad-title")?.focus({ preventScroll: true }), 60);
    return () => clearTimeout(t);
  }, [active?.key]);

  // A diet can leave fewer than two dishes to duel (e.g. vegan). Never stall:
  // save what fits, or step past it (this session only).
  useEffect(() => {
    if (!shown || !aroundLoaded || active?.key !== "taste" || rounds >= 1) return;
    if (duel.length === 1) {
      void post("/api/user/taste", { liked: [duel[0].t] }).then((r) => (r.ok ? mutate() : Promise.reject())).catch(() => addSkip("taste", false));
      return;
    }
    addSkip("taste", false);
  }, [shown, aroundLoaded, active?.key, rounds, duel]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!shown || (!active && !holding)) return null;

  // Put a coach card on whichever side of its target has more room, so it
  // never covers the thing it points at.
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const cardPos = (r: DOMRect | null): React.CSSProperties => {
    if (!r) return { bottom: "calc(env(safe-area-inset-bottom,0px) + 14px)" };
    return r.top > vh - r.bottom ? { bottom: vh - r.top + 22 } : { top: r.bottom + 22 };
  };

  const mark = (m: string) => post("/api/quests", { mark: m });
  function skipStep() { if (active) addSkip(active.key); }

  // ── beat handlers ───────────────────────────────────────────────────────────
  async function saveAround() {
    if (busy) return;
    setBusy(true); setAroundErr("");
    try {
      const [d, a] = await Promise.all([post("/api/user/dietary", { filters: diets }), post("/api/user/allergies", { allergies })]);
      if (!d.ok || !a.ok) throw new Error();
      const m = await mark("allergies");
      if (!m.ok) throw new Error();
    } catch {
      // Never mark this done unless the list really saved — the reel depends on it.
      setAroundErr("That didn't save. Try again.");
      setBusy(false);
      return;
    }
    setBusy(false); await mutate();
  }
  function pickDuel(t: string) {
    if (chosen || busy) return;
    setChosen(t);
    const next = [...winners, t];
    setTimeout(async () => {
      if (next.length >= rounds) {
        setBusy(true);
        const r = await post("/api/user/taste", { liked: next }).catch(() => null);
        setBusy(false); setChosen(null); setWinners([]);
        if (r?.ok) await mutate(); else addSkip("taste", false);
      } else { setChosen(null); setWinners(next); setRound((x) => x + 1); }
    }, 420);
  }
  function surpriseMe() {
    if (spinning.current || !reel.length) return;
    spinning.current = true;
    const items = reel.slice();
    const targetIdx = Math.floor(Math.random() * items.length);
    if (reducedMotion()) { setSpin({ idx: targetIdx, landed: false, items }); void landOn(targetIdx, items); return; }
    setSpin({ idx: 0, landed: false, items });
    let tick = 0;
    const total = 12 + items.length;
    const step = () => {
      tick++;
      setSpin((s) => (s && !s.landed ? { ...s, idx: (s.idx + 1) % items.length } : s));
      if (tick >= total) { void landOn(targetIdx, items); return; }
      setTimeout(step, 110 + Math.pow(tick / total, 3) * 300); // steady → decelerating, never strobing
    };
    setTimeout(step, 110);
  }
  async function landOn(idx: number, items: Reel) {
    let ok = false;
    try { const r = await post("/api/recipes/seed", { slug: items[idx].slug }); ok = r.ok; } catch { ok = false; }
    // Never show a check mark for a save that didn't happen.
    setSpin({ idx, landed: ok, failed: !ok, items });
    if (!ok) { spinning.current = false; void globalMutate("/api/recipes/seed"); return; }
    await mutate();
    try { await globalMutate((k) => typeof k === "string" && k.startsWith("/api/")); } catch { /* ignore */ }
    setTimeout(() => {
      setSpin(null); spinning.current = false;
      if (pathname !== "/kitchen") router.push("/kitchen");
      setReveal({ selector: "[data-guide='saved-recipe']", note: "Saved. Your recipes live right here." });
    }, 1300);
  }
  async function planFor(date: Date, label: string) {
    if (busy) return;
    setBusy(true); setPlanErr("");
    try {
      const r = await post("/api/guide/plan", { date: localISO(date), recipeId: planRecipe?.recipe?.id });
      const v = await r.json();
      if (!r.ok) throw new Error(v.error || "That didn't make it onto your plan. Try again.");
      setPlanned({ label, title: v.title, image_url: v.image_url, ingredientCount: v.ingredientCount });
      try { sessionStorage.setItem("marco_plan_label", label); } catch { /* ignore */ }
    } catch (e) { setPlanErr(e instanceof Error ? e.message : "That didn't make it onto your plan. Try again."); }
    setBusy(false);
  }
  async function finishPlan(wantsNotifications: boolean) {
    if (busy) return;
    setBusy(true);
    if (wantsNotifications) {
      let granted = false;
      try { granted = await requestNotifications(); } catch { granted = false; }
      if (granted) await mark("notifications").catch(() => {});
    }
    await mutate();
    if (pathname !== "/kitchen") router.push("/kitchen");
    // Set the next beat BEFORE clearing this one, so the plan sheet never flashes back.
    setReveal({ selector: "[data-guide='tab-groceries']", note: "Your grocery list builds itself from your plan. It's right here." });
    setPlanned(null);
    setBusy(false);
  }
  async function graduate() {
    if (busy) return;
    setBusy(true);
    await mark("graduated").catch(() => {});
    addSkip("graduate"); // never trapped on this screen, even if the mark failed
    setBusy(false); await mutate();
  }
  async function donePeople() {
    if (busy) return;
    setBusy(true);
    const r = await mark("people_done").catch(() => null);
    if (!r?.ok) addSkip("people"); // never stuck here, even if the save failed
    setBusy(false); await mutate();
  }
  // Solo still means a chat: a 1:1 thread with Marco, where you text him recipes.
  // Messages opens FIRST, inside the tap (mobile Safari drops an sms: link set
  // after an await) — the number and body were prefetched when the step
  // mounted. Then we record it in the background.
  function justMe(n: string, body: string) {
    window.location.href = `sms:${n}&body=${encodeURIComponent(body)}`;
    void mark("people_solo").catch(() => {}).finally(() => { void mutate(); });
    addSkip("people");
  }
  const toggle = (list: string[], set: (v: string[]) => void, v: string) => { touched.current = true; set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]); };

  // ── shared pieces ──────────────────────────────────────────────────────────
  const idx = active ? CHAPTER1.findIndex((s) => s.key === active.key) : -1;
  const header = (title: string, chapter2?: boolean) => (
    <>
      {chapter2 ? (
        <div style={{ fontFamily: HAND, fontSize: 15, color: COBALT, marginBottom: 8, transform: "rotate(-1deg)" }}>now, your people</div>
      ) : idx >= 0 ? (
        <div role="img" className="flex items-center gap-1.5" style={{ marginBottom: 12 }} aria-label={`Step ${idx + 1} of ${CHAPTER1.length}`}>
          {CHAPTER1.map((_, i) => <span key={i} aria-hidden style={{ width: i === idx ? 20 : 7, height: 7, borderRadius: 99, background: i <= idx ? TOMATO : "rgba(23,20,16,0.18)", border: i === idx ? `1.5px solid ${INK}` : "none", transition: "all .3s" }} />)}
        </div>
      ) : null}
      <div className="flex items-start gap-2.5">
        <span aria-hidden className="flex flex-shrink-0 items-center justify-center overflow-hidden" style={{ width: 36, height: 36, borderRadius: 99, background: chapter2 ? BUTTER : LIME, border: `2px solid ${INK}` }}><TomatoMascot state="thriving" size={29} greeting /></span>
        <div className="min-w-0 flex-1">
          <div style={{ fontFamily: HAND, fontSize: 13, color: TOMATO, lineHeight: 1, marginBottom: 2 }}>Marco</div>
          <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 19, color: INK, lineHeight: 1.08 }}>{title}</div>
        </div>
        <button onClick={skipStep} aria-label="Skip this step" style={{ fontFamily: HAND, fontSize: 14, color: INK, opacity: 0.6, background: "none", border: "none", flexShrink: 0, padding: "6px 6px", minHeight: 44, minWidth: 44 }}>skip</button>
      </div>
    </>
  );
  const primary = { color: PAPER, background: TOMATO, fontFamily: DISP, fontWeight: 700, fontSize: 17, padding: "14px 0", borderRadius: 14, border: `2.5px solid ${INK}`, boxShadow: `3px 4px 0 ${INK}`, minHeight: 48 } as const;
  const chip = (on: boolean, onColor: string) => ({ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: INK, background: on ? onColor : PAPER, border: `2px solid ${INK}`, borderRadius: 99, padding: "8px 14px", minHeight: 44, boxShadow: on ? `2px 2px 0 ${INK}` : "none", transform: on ? "translate(-1px,-1px)" : "none", transition: "all .12s" }) as const;

  // ── reveal: spotlight a real control, one sentence, then move on ───────────
  if (reveal) {
    const r = revealRect;
    const pad = 8;
    return (
      <div className="fixed inset-0 z-[70]" style={{ pointerEvents: "none" }}>
        {r ? (
          <div style={{ position: "fixed", top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2, borderRadius: 16, boxShadow: `0 0 0 3px ${LIME}, 0 0 0 5.5px ${INK}, 0 0 0 9999px rgba(23,20,16,0.5)`, transition: "all .25s ease" }} />
        ) : <div style={{ position: "fixed", inset: 0, background: "rgba(23,20,16,0.45)" }} />}
        <motion.div role="dialog" aria-label={reveal.note} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={SPRING_SHEET} className="absolute inset-x-0" style={{ ...cardPos(r), padding: "0 14px", pointerEvents: "auto" }}>
          <div className="mx-auto" style={{ maxWidth: 440, background: PAPER, border: `2.5px solid ${INK}`, borderRadius: 18, padding: 15, boxShadow: SHEET_SHADOW }}>
            <div className="flex items-center gap-2.5">
              <span aria-hidden className="flex flex-shrink-0 items-center justify-center overflow-hidden" style={{ width: 36, height: 36, borderRadius: 99, background: LIME, border: `2px solid ${INK}` }}><TomatoMascot state="thriving" size={29} greeting /></span>
              <div aria-live="polite" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 17, color: INK, lineHeight: 1.15 }}>{reveal.note}</div>
            </div>
            <button autoFocus onClick={() => setReveal(null)} className="mt-3 w-full transition-transform active:scale-[0.98]" style={primary}>Got it</button>
          </div>
        </motion.div>
        <Keyframes />
      </div>
    );
  }

  // ── Surprise me — single-frame slot reel ───────────────────────────────────
  if (spin) {
    const cur = spin.items[spin.idx] ?? spin.items[0];
    const status = spin.failed ? "the reel jammed" : spin.landed ? "tonight's pick!" : "spinning…";
    return (
      <div role="dialog" aria-modal="true" aria-label="Surprise me" className="fixed inset-0 z-[80] flex items-center justify-center" style={{ background: "rgba(23,20,16,0.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", padding: 20, animation: "mg-fade .2s ease both" }}>
        <div className="w-full text-center" style={{ maxWidth: 330, background: PAPER, border: `2.5px solid ${INK}`, borderRadius: 22, padding: 20, boxShadow: SHEET_SHADOW, animation: "mg-up .35s cubic-bezier(0.34,1.4,0.64,1) both" }}>
          <div style={{ fontFamily: HAND, fontSize: 18, color: TOMATO, transform: "rotate(-2deg)" }}>{status}</div>
          {cur && (
            <div aria-hidden={!spin.landed} className="relative mx-auto overflow-hidden" style={{ marginTop: 12, width: 226, height: 226, border: `3px solid ${INK}`, borderRadius: 16, background: "#fff", boxShadow: spin.landed ? `0 0 0 4px ${LIME}` : "none" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img key={spin.idx} src={img(cur.img)} alt={cur.title} style={{ width: "100%", height: "100%", objectFit: "cover", filter: spin.landed ? "none" : "blur(1.5px)", animation: spin.landed ? "mg-pop .35s cubic-bezier(0.34,1.56,0.64,1) both" : "none" }} />
              <div className="absolute inset-x-0 bottom-0 truncate" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 18, color: PAPER, padding: "22px 10px 9px", background: "linear-gradient(to top, rgba(23,20,16,0.85), transparent)" }}>{cur.title}</div>
            </div>
          )}
          <div role="status" aria-live="polite">
            {spin.failed ? (
              <>
                <Body text="That one didn't save. Spin again?" />
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setSpin(null)} className="flex-1" style={{ ...primary, background: PAPER, color: INK, fontSize: 15 }}>Close</button>
                  <button onClick={() => { setSpin(null); setTimeout(surpriseMe, 50); }} className="flex-1" style={{ ...primary, fontSize: 15 }}>Spin again</button>
                </div>
              </>
            ) : spin.landed ? (
              <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 16, color: INK, marginTop: 14 }}>{cur?.title} added to your kitchen ✓</div>
            ) : <div style={{ height: 22, marginTop: 14 }} />}
          </div>
        </div>
        <Keyframes />
      </div>
    );
  }

  // ── When are you cooking it? — the stamped result + an in-context ask ──────
  if (planned) {
    return (
      <Sheet sheetKey="planned" label="On the menu">
        <div className="flex items-center gap-3">
          <div style={{ width: 84, flexShrink: 0, background: "#fff", border: `2px solid ${INK}`, padding: 5, paddingBottom: 4, transform: "rotate(-4deg)", boxShadow: `3px 4px 0 ${INK}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {planned.image_url ? <img src={img(planned.image_url)} alt="" style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block" }} /> : <div style={{ aspectRatio: "1/1", background: BUTTER }} />}
          </div>
          <div className="min-w-0">
            <div style={{ display: "inline-block", fontFamily: DISP, fontWeight: 700, fontSize: 13, color: PAPER, background: TOMATO, border: `2px solid ${INK}`, padding: "3px 9px", transform: "rotate(-3deg)", whiteSpace: "nowrap" }}>On the menu: {planned.label.toLowerCase()}</div>
            <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 19, color: INK, marginTop: 7, lineHeight: 1.1 }}>{planned.title}</div>
            {planned.ingredientCount > 0 && <div style={{ fontFamily: HAND, fontSize: 15, color: INK, opacity: 0.75, marginTop: 3 }}>its {planned.ingredientCount} ingredients are on your grocery list for that week</div>}
          </div>
        </div>
        <div style={{ height: 2, background: "rgba(23,20,16,0.1)", margin: "18px 0 14px" }} />
        <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 18, color: INK }}>Can I ping you?</div>
        <Body text="Turn on notifications so I can reach you about your kitchen. You can turn them off anytime." />
        <div className="mt-3 flex gap-2">
          <button onClick={() => finishPlan(false)} disabled={busy} className="flex-1 disabled:opacity-60" style={{ ...primary, background: PAPER, color: INK, fontSize: 15 }}>Not now</button>
          <button onClick={() => finishPlan(true)} disabled={busy} className="flex-[1.4] disabled:opacity-60" style={{ ...primary, fontSize: 15 }}>Turn on</button>
        </div>
      </Sheet>
    );
  }

  if (!active) return null;

  // ── Cook around — diets + allergies, one sheet ─────────────────────────────
  if (active.kind === "around") {
    return (
      <Sheet sheetKey={active.key} label={active.title}>
        {header(active.title)}
        <Body text={active.body} />
        <div style={{ fontFamily: HAND, fontSize: 15, color: INK, opacity: 0.75, marginTop: 14 }}>I eat…</div>
        <div className="flex flex-wrap gap-2" style={{ marginTop: 6 }}>
          {DIET_OPTIONS.map((d) => <button key={d.id} aria-pressed={diets.includes(d.id)} onClick={() => toggle(diets, setDiets, d.id)} className="active:scale-95" style={chip(diets.includes(d.id), LIME)}>{d.label}</button>)}
        </div>
        <div style={{ fontFamily: HAND, fontSize: 15, color: INK, opacity: 0.75, marginTop: 14 }}>I&apos;m allergic to…</div>
        <div className="flex flex-wrap gap-2" style={{ marginTop: 6 }}>
          {ALLERGY_OPTIONS.map((a) => <button key={a} aria-pressed={allergies.includes(a)} onClick={() => toggle(allergies, setAllergies, a)} className="active:scale-95" style={chip(allergies.includes(a), BUTTER)}>{a}</button>)}
        </div>
        <button onClick={saveAround} disabled={busy} className="mt-5 w-full transition-transform active:scale-[0.98] disabled:opacity-60" style={primary}>{busy ? "Saving…" : diets.length || allergies.length ? "Save" : "I eat everything"}</button>
        {aroundErr && <p role="alert" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: TOMATO, marginTop: 10 }}>{aroundErr}</p>}
      </Sheet>
    );
  }

  // ── This or that — a few quick head-to-heads ───────────────────────────────
  if (active.kind === "duel") {
    if (!aroundLoaded || rounds < 1) return null;
    const pair = duel.slice(round * 2, round * 2 + 2);
    return (
      <Sheet sheetKey={`${active.key}-${round}`} label={active.title}>
        {header(active.title)}
        <Body text={`${active.body} ${rounds > 1 ? `Round ${round + 1} of ${rounds}.` : ""}`} />
        <div className="relative flex items-start justify-center gap-3" style={{ marginTop: 18, paddingBottom: 6 }}>
          {pair.map((d, i) => {
            const picked = chosen === d.t;
            const faded = !!chosen && !picked;
            return (
              <button key={d.t} onClick={() => pickDuel(d.t)} disabled={!!chosen || busy} aria-label={`I'd rather cook ${d.t}`} className="relative flex-1" style={{ background: "#fff", border: `2.5px solid ${INK}`, padding: 6, paddingBottom: 4, borderRadius: 4, transform: `rotate(${i ? 3 : -3}deg) ${picked ? "scale(1.06)" : ""}`, boxShadow: picked ? `0 0 0 4px ${LIME}, 4px 5px 0 ${INK}` : `3px 4px 0 ${INK}`, opacity: faded ? 0.35 : 1, transition: "all .2s" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img(d.img)} alt="" style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block" }} />
                <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: INK, padding: "6px 2px 2px", lineHeight: 1.1 }}>{d.t}</div>
                {picked && <motion.span aria-hidden initial={{ scale: 1.6, opacity: 0, rotate: 24 }} animate={{ scale: 1, opacity: 1, rotate: 10 }} transition={SPRING_STICKER} className="absolute" style={{ top: 10, right: -8, fontFamily: DISP, fontWeight: 700, fontSize: 14, color: INK, background: LIME, border: `2px solid ${INK}`, padding: "3px 9px", boxShadow: `2px 2px 0 ${INK}` }}>this one!</motion.span>}
              </button>
            );
          })}
          <span aria-hidden className="absolute flex items-center justify-center" style={{ top: "38%", left: "50%", marginLeft: -21, width: 42, height: 42, borderRadius: 99, background: INK, color: BUTTER, fontFamily: HAND, fontWeight: 700, fontSize: 17, border: `2.5px solid ${PAPER}`, transform: "rotate(-8deg)" }}>or</span>
        </div>
      </Sheet>
    );
  }

  // ── When are you cooking it? ───────────────────────────────────────────────
  if (active.kind === "plan") {
    const rec = planRecipe?.recipe;
    const options: [string, Date][] = [["Tonight", new Date()], ["Tomorrow", daysFromNow(1)], ["This weekend", weekendDate()]];
    return (
      <Sheet sheetKey={active.key} label={active.title}>
        {header(active.title)}
        {rec && (
          <div className="flex items-center gap-3" style={{ marginTop: 12 }}>
            <div style={{ width: 58, flexShrink: 0, background: "#fff", border: `2px solid ${INK}`, padding: 4, transform: "rotate(-4deg)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {rec.image_url ? <img src={img(rec.image_url)} alt="" style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block" }} /> : <div style={{ aspectRatio: "1/1", background: BUTTER }} />}
            </div>
            <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 18, color: INK, lineHeight: 1.1 }}>{rec.title}</div>
          </div>
        )}
        <Body text={active.body} />
        <div className="grid grid-cols-2 gap-2" style={{ marginTop: 12 }}>
          {options.map(([label, date], i) => (
            <button key={label} onClick={() => planFor(date, label)} disabled={busy} className="active:scale-95 disabled:opacity-60" style={{ ...chip(false, LIME), borderRadius: 14, padding: "13px 0", fontSize: 16, gridColumn: i === 0 ? "span 2" : undefined, background: i === 0 ? LIME : PAPER, boxShadow: `2px 3px 0 ${INK}` }}>{label}</button>
          ))}
          <button onClick={() => setPickDay(true)} disabled={busy} className="active:scale-95" style={{ ...chip(false, LIME), borderRadius: 14, padding: "13px 0", fontSize: 16, gridColumn: "span 2", boxShadow: `2px 3px 0 ${INK}` }}>Pick a day</button>
        </div>
        {pickDay && (
          <input type="date" min={localISO(new Date())} aria-label="Pick a day to cook it" onChange={(e) => { if (!e.target.value) return; const [y, m, d] = e.target.value.split("-").map(Number); const dt = new Date(y, m - 1, d); void planFor(dt, dt.toLocaleDateString(undefined, { weekday: "long" })); }} className="mt-3 w-full" style={{ background: "#fff", border: `2.5px solid ${INK}`, borderRadius: 12, padding: "12px 14px", fontFamily: SANS, fontSize: 16, color: INK }} />
        )}
        {planErr && <p role="alert" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: TOMATO, marginTop: 10 }}>{planErr}</p>}
      </Sheet>
    );
  }

  // ── Graduation — the one bold moment: your real things, taped in ───────────
  if (active.kind === "graduate") {
    const rec = planRecipe?.recipe;
    let planLabel: string | null = null;
    try { planLabel = sessionStorage.getItem("marco_plan_label"); } catch { /* ignore */ }
    const around = [...diets.map((d) => DIET_OPTIONS.find((o) => o.id === d)?.label).filter(Boolean), ...allergies.map((a) => `no ${a.toLowerCase()}`)].slice(0, 4).join(", ");
    return (
      <div role="dialog" aria-modal="true" aria-labelledby="mg-grad-title" className="fixed inset-0 z-[85] flex flex-col overflow-y-auto overflow-x-hidden" style={{ background: "#E9E2D3", backgroundImage: "radial-gradient(rgba(23,20,16,0.06) 1px, transparent 1px)", backgroundSize: "13px 13px", padding: "calc(env(safe-area-inset-top,0px) + 20px) 22px calc(env(safe-area-inset-bottom,0px) + 22px)", animation: "mg-fade .3s ease both" }}>
        <span aria-hidden style={{ position: "absolute", top: 38, left: -36, width: 170, height: 26, background: BUTTER, opacity: 0.85, transform: "rotate(-12deg)" }} />
        <span aria-hidden style={{ position: "absolute", bottom: 66, right: -40, width: 170, height: 26, background: "#FF4D9D", opacity: 0.55, transform: "rotate(-9deg)" }} />
        <div className="flex w-full flex-col items-center" style={{ margin: "auto 0", flexShrink: 0 }}>
          <div aria-hidden style={{ animation: "mg-pop .5s cubic-bezier(0.34,1.56,0.64,1) both", flexShrink: 0 }}><TomatoMascot state="thriving" size={104} greeting /></div>
          <h2 id="mg-grad-title" tabIndex={-1} style={{ outline: "none", fontFamily: DISP, fontWeight: 700, fontSize: 40, lineHeight: 1.02, color: INK, textAlign: "center", marginTop: 6 }}>Your kitchen is open.</h2>
          <div className="relative" style={{ marginTop: 26, width: 260, height: 262, flexShrink: 0 }}>
            {rec && (
              <div style={{ position: "absolute", left: 22, top: 0, width: 168, background: "#fff", border: `2.5px solid ${INK}`, padding: 8, paddingBottom: 6, transform: "rotate(-5deg)", boxShadow: `5px 6px 0 ${INK}`, animation: "mg-drop .55s .15s cubic-bezier(0.34,1.4,0.64,1) both" }}>
                <span aria-hidden style={{ position: "absolute", top: -10, left: 50, width: 64, height: 18, background: LIME, opacity: 0.9, transform: "rotate(4deg)" }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {rec.image_url ? <img src={img(rec.image_url)} alt="" style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block" }} /> : <div style={{ aspectRatio: "1/1", background: BUTTER }} />}
                <div style={{ fontFamily: HAND, fontSize: 15, color: INK, textAlign: "center", marginTop: 4 }}>{rec.title}</div>
              </div>
            )}
            {done?.plan && <div style={{ position: "absolute", right: 0, top: 118, fontFamily: DISP, fontWeight: 700, fontSize: 14, color: PAPER, background: TOMATO, border: `2.5px solid ${INK}`, padding: "6px 11px", transform: "rotate(7deg)", boxShadow: `3px 3px 0 ${INK}`, whiteSpace: "nowrap", animation: "mg-drop .5s .45s cubic-bezier(0.34,1.4,0.64,1) both" }}>on the menu: {(planLabel || "soon").toLowerCase()}</div>}
            {around && <div style={{ position: "absolute", left: 0, bottom: 0, maxWidth: 240, fontFamily: HAND, fontWeight: 700, fontSize: 14, color: INK, background: LIME, border: `2px solid ${INK}`, padding: "5px 10px", transform: "rotate(-3deg)", animation: "mg-drop .5s .7s cubic-bezier(0.34,1.4,0.64,1) both" }}>cooking around: {around}</div>}
          </div>
          <button onClick={graduate} disabled={busy} className="w-full transition-transform active:scale-[0.98] disabled:opacity-60" style={{ ...primary, maxWidth: 360, marginTop: 30, fontSize: 19, padding: "16px 0", boxShadow: `5px 6px 0 ${INK}`, flexShrink: 0 }}>Let&apos;s eat</button>
        </div>
        <Keyframes />
      </div>
    );
  }

  // ── Your people — bring Marco into Household / Family / Friends chats ──────
  if (active.kind === "people") {
    return (
      <Sheet sheetKey={active.key} label={active.title}>
        {header(active.title, true)}
        <Body text={active.body} />
        <PeopleStep groups={groups} uid={uid} busy={busy} primary={primary} onChange={() => { setSentTick((t) => t + 1); void mutate(); }} onDone={donePeople} onSolo={justMe} />
      </Sheet>
    );
  }

  // ── Action steps — spotlight the real control + a coach sheet ──────────────
  const pad = 10;
  return (
    <div className="fixed inset-0 z-[70]" style={{ pointerEvents: "none" }}>
      {rect ? (
        <div style={{ position: "fixed", top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, borderRadius: 999, boxShadow: `0 0 0 3px ${LIME}, 0 0 0 5.5px ${INK}, 0 0 0 9999px rgba(23,20,16,0.5)`, transition: "all .25s ease" }} />
      ) : <div style={{ position: "fixed", inset: 0, background: "rgba(233,226,211,0.55)", backdropFilter: "blur(7px)", WebkitBackdropFilter: "blur(7px)" }} />}
      <motion.div key={active.key} role="dialog" aria-label={active.title} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={SPRING_SHEET} className="absolute inset-x-0" style={{ ...cardPos(rect), padding: "0 12px", pointerEvents: "auto" }}>
        <div className="relative mx-auto" style={{ maxWidth: 440, background: PAPER, border: `2.5px solid ${INK}`, borderRadius: 20, padding: "18px 16px 16px", boxShadow: SHEET_SHADOW }}>
          {header(active.title)}
          <Body text={active.body} />
          <button onClick={() => active.ctaRoute && router.push(active.ctaRoute)} disabled={busy} className="mt-4 w-full transition-transform active:scale-[0.98] disabled:opacity-60" style={primary}>{active.cta}</button>
          {active.surprise && reel.length > 0 && <button onClick={surpriseMe} className="mt-2.5 w-full transition-transform active:scale-[0.98]" style={{ ...primary, background: BUTTER, color: INK, fontSize: 16, padding: "12px 0" }}>🎰 Surprise me</button>}
        </div>
      </motion.div>
      <Keyframes />
    </div>
  );
}

// Chapter 2's one beat. Its own component so it can prefetch what "Just me"
// needs the moment the step mounts (it has to open Messages synchronously), and
// re-read this device's "waiting for Marco" marks after a sheet closes.
// If your number isn't linked yet, the 1:1 opens with a one-time "link <code>"
// so your very first text connects Marco to this account.
const SOLO_HELLO = "hey Marco 🍅 it's just me — I'll send you recipes here";
function PeopleStep({ groups, uid, busy, primary, onChange, onDone, onSolo }: { groups: Groups; uid?: string; busy: boolean; primary: React.CSSProperties; onChange: () => void; onDone: () => void; onSolo: (marcoNumber: string, body: string) => void }) {
  const [solo, setSolo] = useState<{ number: string | null; body: string; at: number } | null>(null);
  const [soloErr, setSoloErr] = useState("");
  const [, setSent] = useState(0);
  const load = useCallback(async () => {
    const v = await fetch("/api/imessage/link", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const number = (v?.marcoNumber as string | undefined) || null;
    let body = SOLO_HELLO;
    if (v && v.linked === false) {
      const c = await fetch("/api/imessage/link", { method: "POST" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (typeof c?.code === "string") body = `link ${c.code}`;
    }
    setSolo({ number, body, at: Date.now() });
  }, []);
  // Link codes last 10 minutes — keep a fresh one while the step is up (the
  // iOS web view reports coming back via visibilitychange, not always focus).
  const at = useRef(0);
  useEffect(() => { at.current = solo?.at ?? 0; }, [solo]);
  useEffect(() => {
    const t = setTimeout(() => { void load(); }, 0);
    const refresh = () => { if (document.visibilityState === "visible" && Date.now() - at.current > 8 * 60_000) void load(); };
    const every = setInterval(() => { void load(); }, 8 * 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearTimeout(t); clearInterval(every); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [load]);
  // Done or sent-and-waiting both count — the checkmark itself only lands once
  // Marco hears the first message in the group.
  const anyStarted = groups.household || groups.family || groups.friends || pendingGroups(groups, uid).length > 0;
  function tapSolo() {
    if (!solo?.number) {
      setSoloErr("Marco's number isn't available right now — try again in a moment.");
      void load(); // ready for the next tap
      return;
    }
    // Never send a link code that may have expired (Messages must open inside
    // this tap, so we can't fetch a new one first).
    if (solo.body.startsWith("link ") && Date.now() - solo.at > 9 * 60_000) {
      setSoloErr("One sec — getting a fresh code. Tap again.");
      void load();
      return;
    }
    setSoloErr("");
    onSolo(solo.number, solo.body);
  }
  return (
    <>
      <GroupChats groups={groups} uid={uid} onChange={() => { setSent((x) => x + 1); onChange(); }} variant="full" />
      {anyStarted && <button onClick={onDone} disabled={busy} className="mt-4 w-full transition-transform active:scale-[0.98] disabled:opacity-60" style={{ ...primary, background: COBALT }}>Done for now</button>}
      {!anyStarted && (
        <button onClick={tapSolo} disabled={busy} className="mt-3 w-full transition-transform active:scale-[0.98] disabled:opacity-60" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 15, color: INK, background: "#fff", border: `2px solid ${INK}`, borderRadius: 14, padding: "11px 0", minHeight: 48 }}>
          Just me — text Marco 1:1
        </button>
      )}
      {soloErr && !anyStarted && <p role="alert" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: TOMATO, marginTop: 10 }}>{soloErr}</p>}
    </>
  );
}

// A calm paper sheet. Chaos (tape, tilt) is reserved for the artifacts inside it.
// Module-level so React keeps it mounted across re-renders (no replayed entrance,
// no lost focus in inputs). It moves focus to itself when its content changes.
function Sheet({ children, sheetKey, label }: { children: React.ReactNode; sheetKey: string; label: string }) {
  // Focus each new card as IT mounts — with mode="wait" an effect on sheetKey
  // would fire while the outgoing card is still on screen. Stable callback, so
  // it runs once per card, not on every render.
  const ref = useCallback((el: HTMLDivElement | null) => { el?.focus({ preventScroll: true }); }, []);
  return (
    <div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-[70] flex items-end justify-center" style={{ background: "rgba(233,226,211,0.55)", backdropFilter: "blur(7px)", WebkitBackdropFilter: "blur(7px)", padding: "14px 12px calc(env(safe-area-inset-bottom,0px) + 14px)", animation: "mg-fade .25s ease both" }}>
      <AnimatePresence mode="wait">
      <motion.div ref={ref} tabIndex={-1} key={sheetKey} initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12, transition: { duration: 0.14 } }} transition={SPRING_SHEET} className="relative w-full" style={{ maxWidth: 440, background: PAPER, border: `2.5px solid ${INK}`, borderRadius: 22, padding: "20px 18px 18px", boxShadow: SHEET_SHADOW, maxHeight: "86dvh", overflowY: "auto", outline: "none" }}>
        <span aria-hidden style={{ position: "absolute", top: -11, left: "50%", width: 78, height: 20, marginLeft: -39, background: BUTTER, opacity: 0.85, transform: "rotate(-3deg)", border: "1px solid rgba(23,20,16,0.15)" }} />
        {children}
      </motion.div>
      </AnimatePresence>
      <Keyframes />
    </div>
  );
}
function Body({ text }: { text: string }) {
  return <p style={{ fontFamily: SANS, fontSize: 14, color: "#4A4742", marginTop: 8, lineHeight: 1.45 }}>{text}</p>;
}

function Keyframes() {
  return <style>{`@keyframes mg-fade{from{opacity:0}to{opacity:1}}@keyframes mg-up{0%{opacity:0;transform:translateY(18px)}100%{opacity:1;transform:translateY(0)}}@keyframes mg-pop{0%{opacity:0;transform:scale(0.9)}100%{opacity:1;transform:scale(1)}}@keyframes mg-drop{0%{opacity:0;transform:translateY(-18px) scale(1.08)}100%{opacity:1}}@media (prefers-reduced-motion: reduce){*{animation-duration:.01ms!important}}`}</style>;
}
