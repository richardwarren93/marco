"use client";

/* The ongoing in-app guide. After onboarding (tour + name), Marco walks you
   through setup + the core loop AS YOU ACTUALLY DO IT — one step at a time,
   popping up and nudging you to the right tab, until you're through. Completion
   is data-driven (/api/quests), so it self-advances and stays quiet once done.
   Allergies + taste are captured inline; the rest point you to the real action. */

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import useSWR from "swr";
import TomatoMascot from "@/components/gamification/TomatoMascot";
import { requestNotifications } from "@/lib/native/notifications";
import { guideStore } from "./guideStore";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const LIME = "#C4EE45";
const BUTTER = "#FFD84D";
const DISP = '"Marker Felt", Georgia, serif';
const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
const SANS = "system-ui, -apple-system, sans-serif";
const img = (p: string) => encodeURI(p);

type Done = Record<string, boolean>;
type Step = {
  key: string;
  kind: "allergies" | "taste" | "notifications" | "action";
  title: string;
  body: string;
  phase?: string;       // kicker shown above the card when a new phase begins
  home?: string;        // tab the guide drifts to when this step is active
  cta?: string;
  ctaRoute?: string;    // route to push on CTA…
  ctaChat?: "household" | "table"; // …or open the Marco group chat instead
  secondary?: { label: string; mark?: "household_skip"; route?: string };
  spotlight?: string;   // selector to cut a spotlight around (e.g. the + button)
};

// One coherent journey. Phase 1 is the core loop (+ taste + notifications);
// phase 2 — "let's set up your kitchen" — brings in your people.
const KITCHEN = "let's set up your kitchen";
const STEPS: Step[] = [
  { key: "allergies", kind: "allergies", title: "Anything we should cook around?", body: "Marco keeps these out of every suggestion." },
  { key: "recipe", kind: "action", title: "Save a recipe", body: "Tap the + below, then “Add a recipe” — paste a link or snap a photo.", cta: "Add a recipe →", ctaRoute: "/recipes?import=1", spotlight: "[data-guide='create']" },
  { key: "cook", kind: "action", title: "Cook a recipe", body: "Tap the + and pick “I cooked something” — snap what you made.", cta: "I cooked something →", ctaRoute: "/i-cooked", spotlight: "[data-guide='create']" },
  { key: "taste", kind: "taste", title: "Your taste profile", body: "Tap the dishes you'd actually cook. Marco learns from these." },
  { key: "notifications", kind: "notifications", title: "Stay on track", body: "A nudge before dinner keeps your streak alive — and the right recipe in front of you at the right time." },
  { key: "household", kind: "action", phase: KITCHEN, title: "Cook with your household", body: "Start a group chat with Marco and add whoever you cook with — everything you text in saves to your shared kitchen.", cta: "Start the group chat →", ctaChat: "household", secondary: { label: "it's just me for now", mark: "household_skip" } },
  { key: "table", kind: "action", phase: KITCHEN, title: "Start a table", body: "Your people, in one place. Start a table and bring them in by text.", cta: "Start a table →", ctaRoute: "/crew", spotlight: "[data-guide='tab-table']" },
  { key: "potluck", kind: "action", phase: KITCHEN, title: "Throw a potluck", body: "Tap the + and pick “Start a Potluck” — a theme + a deadline.", cta: "Start a potluck →", ctaRoute: "/potluck", spotlight: "[data-guide='create']" },
];

const ALLERGY_OPTIONS = ["Peanuts", "Tree nuts", "Dairy", "Gluten", "Shellfish", "Eggs", "Soy", "Fish"];
const DISHES = [
  { t: "Mapo Tofu", img: "/onboarding/recipes/mapo-tofu.jpg" },
  { t: "Shrimp Scampi", img: "/onboarding/recipes/shrimp scampi.jpg" },
  { t: "Chicken Shawarma", img: "/onboarding/recipes/Chicken-Shawarma-8.jpg" },
  { t: "Buffalo Wings", img: "/onboarding/recipes/buffalowings.jpg" },
  { t: "Lamb Biryani", img: "/onboarding/recipes/lamb-biryani-83e5c3d.jpg" },
  { t: "Salmon Teriyaki", img: "/onboarding/recipes/salmon terriyaki.jpg" },
  { t: "Smoked Brisket", img: "/onboarding/recipes/smoked-brisket.jpg" },
  { t: "Creamy Pork Stew", img: "/onboarding/recipes/245361-creamy-pork-stew-Beauty-4x3-a56080e9b5a4462a8dad0a7661f6d1f4.jpg" },
  { t: "Fettuccine Alfredo", img: "/onboarding/recipes/fettuccine-alfredo.jpg" },
];

const HIDE_ON = ["/auth", "/onboarding", "/login", "/i-cooked", "/create", "/connect", "/crew", "/potluck", "/recipes"];
const fetcher = async (u: string) => { const r = await fetch(u); if (!r.ok) throw new Error("x"); return r.json(); };

export default function MarcoGuide() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [skipped, setSkipped] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [picks, setPicks] = useState<string[]>([]);
  const [marcoNumber, setMarcoNumber] = useState("");
  const navedFor = useRef<string | null>(null);
  const seededRef = useRef(false);

  // You can skip the current step to move on — there's no way to dismiss the
  // guide itself. Skipped steps are remembered so it advances, never loops.
  useEffect(() => { try { const raw = localStorage.getItem("marco_guide_skipped"); if (raw) setSkipped(JSON.parse(raw)); } catch { /* ignore */ } }, []);
  // Marco's number — so the household/table steps can open a group chat with him.
  useEffect(() => { void fetch("/api/imessage/link", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).then((v) => { if (v?.marcoNumber) setMarcoNumber(v.marcoNumber); }).catch(() => {}); }, []);

  const hidden = HIDE_ON.some((p) => pathname.startsWith(p));
  const { data, mutate } = useSWR<{ done: Done }>(hidden ? null : "/api/quests", fetcher, { revalidateOnFocus: true, revalidateOnMount: true });
  const done = data?.done;
  const active = done ? STEPS.find((s) => !done[s.key] && !skipped.includes(s.key)) ?? null : null;

  // Re-check progress whenever the route changes (you just did the thing).
  useEffect(() => { if (!hidden) void mutate(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Gently drift to the step's home tab when a NEW step becomes active.
  useEffect(() => {
    if (!active || hidden) return;
    if (active.home && navedFor.current !== active.key && pathname !== active.home && (pathname === "/kitchen" || pathname === "/friends-stack")) {
      navedFor.current = active.key;
      router.push(active.home);
    }
    setPicks([]);
  }, [active?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reaching "cook a recipe" with an empty kitchen? Drop in a starter so there's
  // something real to cook. (seedRecipe is hoisted + idempotent server-side.)
  useEffect(() => {
    if (hidden || !active) return;
    if (active.key === "cook" && done && done.recipe === false) void seedRecipe();
  }, [active?.key, done?.recipe, hidden]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Spotlight rect (for action steps that highlight a target) ──────────────
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    const sel = active?.spotlight;
    if (!sel || hidden) { setRect(null); return; }
    let raf = 0;
    const measure = () => { const el = document.querySelector(sel); setRect(el ? el.getBoundingClientRect() : null); };
    measure();
    const onMove = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
    window.addEventListener("resize", onMove); window.addEventListener("scroll", onMove, true);
    const id = setInterval(measure, 600);
    return () => { window.removeEventListener("resize", onMove); window.removeEventListener("scroll", onMove, true); clearInterval(id); cancelAnimationFrame(raf); };
  }, [active?.key, active?.spotlight, hidden]);

  // Tell the rest of the app the guide is driving, so surfaces hide their own
  // redundant nudges and the spotlight stays the one clear thing.
  useEffect(() => { guideStore.set(!hidden && !!active); }, [hidden, active]);
  useEffect(() => () => guideStore.set(false), []);

  if (hidden || !active) return null;

  // Drop a curated starter recipe into an empty kitchen so "save a recipe" /
  // "cook a recipe" always have real content. Idempotent server-side (no-op
  // once any recipe exists), so firing it more than once is harmless.
  async function seedRecipe() {
    if (seededRef.current) return;
    seededRef.current = true;
    try { await fetch("/api/recipes/seed", { method: "POST" }); } catch { /* best-effort */ }
    await mutate();
  }

  // Skip the current step → it's remembered and the next step becomes active.
  // There is no way to dismiss the guide as a whole.
  function skipStep() {
    if (!active) return;
    const key = active.key;
    if (key === "recipe") void seedRecipe(); // skipping "save a recipe" still leaves you one
    setSkipped((prev) => { const next = prev.includes(key) ? prev : [...prev, key]; try { localStorage.setItem("marco_guide_skipped", JSON.stringify(next)); } catch { /* ignore */ } return next; });
    setPicks([]);
  }

  async function saveAllergies(list: string[]) {
    setBusy(true);
    try {
      await fetch("/api/user/allergies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ allergies: list }) });
      await fetch("/api/quests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mark: "allergies" }) });
    } catch { /* best-effort */ }
    setBusy(false); setPicks([]); await mutate();
  }
  async function saveTaste(list: string[]) {
    setBusy(true);
    try { await fetch("/api/user/taste", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ liked: list }) }); } catch { /* best-effort */ }
    setBusy(false); setPicks([]); await mutate();
  }
  async function enableNotifications() {
    setBusy(true);
    try { await requestNotifications(); } catch { /* ignore */ }
    try { await fetch("/api/quests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mark: "notifications" }) }); } catch { /* ignore */ }
    setBusy(false); await mutate();
  }
  // Open Messages pre-addressed to Marco with a seed — the user adds whoever
  // they cook with to make it a group chat. Falls back to the link page when
  // Marco's number isn't configured.
  function startGroupChat(which: "household" | "table") {
    const seed = which === "household"
      ? "hey Marco — this is our kitchen 🍅 (add whoever you cook with, then text me recipes!)"
      : "hey Marco — starting our table 🍅 (add your people!)";
    if (marcoNumber) { try { window.location.href = `sms:${marcoNumber}&body=${encodeURIComponent(seed)}`; return; } catch { /* ignore */ } }
    router.push("/connect/imessage");
  }
  async function skipSecondary() {
    const sec = active?.secondary;
    if (sec?.mark) { setBusy(true); try { await fetch("/api/quests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mark: sec.mark }) }); } catch { /* ignore */ } setBusy(false); await mutate(); }
    else if (sec?.route) router.push(sec.route);
  }
  const toggle = (v: string) => setPicks((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]);

  const idx = STEPS.findIndex((s) => s.key === active.key);
  const Header = (
    <>
      {active.phase && <div style={{ fontFamily: HAND, fontSize: 14, color: TOMATO, textAlign: "center", marginBottom: 7, transform: "rotate(-1deg)" }}>{active.phase} ↓</div>}
      <div className="flex items-center justify-center gap-1.5" style={{ marginBottom: 12 }}>
        {STEPS.map((_, i) => <span key={i} aria-hidden style={{ width: i === idx ? 18 : 6, height: 6, borderRadius: 99, background: i <= idx ? TOMATO : "rgba(23,20,16,0.2)", transition: "all .3s" }} />)}
      </div>
      <div className="flex items-center gap-2.5">
        <span className="flex flex-shrink-0 items-center justify-center overflow-hidden" style={{ width: 34, height: 34, borderRadius: 99, background: LIME, border: `2px solid ${INK}` }}><TomatoMascot state="thriving" size={27} /></span>
        <div className="min-w-0 flex-1">
          <div style={{ fontFamily: HAND, fontSize: 13, color: TOMATO, lineHeight: 1, marginBottom: 1 }}>Marco</div>
          <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 17, color: INK, lineHeight: 1.08 }}>{active.title}</div>
        </div>
        <button onClick={skipStep} aria-label="Skip this step" style={{ fontFamily: HAND, fontSize: 13, color: INK, opacity: 0.5, background: "none", border: "none", flexShrink: 0, whiteSpace: "nowrap" }}>skip →</button>
      </div>
    </>
  );

  // ── Inline captures (allergies / taste / notifications) — centered card ────
  if (active.kind !== "action") {
    return (
      <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" style={{ background: "rgba(23,20,16,0.5)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", padding: 14, animation: "mg-fade .3s ease both" }}>
        <div key={active.key} className="w-full" style={{ maxWidth: 420, background: "#E9E2D3", backgroundImage: "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)", backgroundSize: "13px 13px", border: `2.5px solid ${INK}`, borderRadius: 20, padding: 18, boxShadow: "0 26px 60px rgba(23,20,16,0.4)", animation: "mg-pop .4s cubic-bezier(0.34,1.56,0.64,1) both" }}>
          {Header}
          <p style={{ fontFamily: SANS, fontSize: 13.5, color: "#4A4742", marginTop: 8, lineHeight: 1.4 }}>{active.body}</p>

          {active.kind === "allergies" ? (
            <>
              <div className="flex flex-wrap gap-2" style={{ marginTop: 14 }}>
                {ALLERGY_OPTIONS.map((a) => { const on = picks.includes(a); return (
                  <button key={a} onClick={() => toggle(a)} className="transition-transform active:scale-95" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: on ? PAPER : INK, background: on ? TOMATO : PAPER, border: `2px solid ${INK}`, borderRadius: 99, padding: "7px 14px" }}>{a}</button>
                ); })}
              </div>
              <button onClick={() => saveAllergies(picks)} disabled={busy} className="mt-4 w-full transition-transform active:scale-[0.98] disabled:opacity-60" style={{ color: PAPER, background: TOMATO, fontFamily: DISP, fontWeight: 700, fontSize: 16, padding: "13px 0", borderRadius: 13, border: `2.5px solid ${INK}` }}>{busy ? "Saving…" : picks.length ? "Save & continue →" : "None — continue →"}</button>
            </>
          ) : active.kind === "taste" ? (
            <>
              <div className="grid grid-cols-3" style={{ gap: 8, marginTop: 14 }}>
                {DISHES.map((d) => { const on = picks.includes(d.t); return (
                  <button key={d.t} onClick={() => toggle(d.t)} className="relative overflow-hidden transition-transform active:scale-95" style={{ borderRadius: 11, border: `2.5px solid ${on ? TOMATO : INK}`, aspectRatio: "1/1", padding: 0, boxShadow: on ? "0 6px 14px rgba(229,70,46,0.3)" : "none" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img(d.img)} alt={d.t} referrerPolicy="no-referrer" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                    <span className="absolute inset-x-0 bottom-0 truncate" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 9, color: PAPER, padding: "8px 4px 3px", textAlign: "left", background: "linear-gradient(to top, rgba(23,20,16,0.82), transparent)" }}>{d.t}</span>
                    {on && <span className="absolute flex items-center justify-center" style={{ top: 4, right: 4, width: 20, height: 20, borderRadius: 99, background: TOMATO, border: `2px solid ${PAPER}` }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg></span>}
                  </button>
                ); })}
              </div>
              <button onClick={() => saveTaste(picks)} disabled={busy || picks.length < 3} className="mt-4 w-full transition-transform active:scale-[0.98] disabled:opacity-50" style={{ color: PAPER, background: TOMATO, fontFamily: DISP, fontWeight: 700, fontSize: 16, padding: "13px 0", borderRadius: 13, border: `2.5px solid ${INK}` }}>{busy ? "Saving…" : picks.length >= 3 ? "Save my taste →" : `Pick ${3 - picks.length} more`}</button>
            </>
          ) : (
            <>
              <button onClick={enableNotifications} disabled={busy} className="mt-4 w-full transition-transform active:scale-[0.98] disabled:opacity-60" style={{ color: PAPER, background: TOMATO, fontFamily: DISP, fontWeight: 700, fontSize: 16, padding: "13px 0", borderRadius: 13, border: `2.5px solid ${INK}` }}>{busy ? "…" : "Turn on notifications →"}</button>
              <p style={{ fontFamily: HAND, fontSize: 13, color: INK, opacity: 0.6, textAlign: "center", marginTop: 9 }}>turn them off anytime</p>
              <button onClick={skipStep} className="mx-auto mt-1.5 block" style={{ fontFamily: HAND, fontSize: 14, color: INK, opacity: 0.6, background: "none", border: "none" }}>maybe later</button>
            </>
          )}
        </div>
        <style>{`@keyframes mg-fade{from{opacity:0}to{opacity:1}}@keyframes mg-pop{0%{opacity:0;transform:scale(0.95) translateY(12px)}100%{opacity:1;transform:scale(1) translateY(0)}}`}</style>
      </div>
    );
  }

  // ── Action steps — spotlight the target (if any) + a bottom coach card ─────
  const pad = 10;
  return (
    <div className="fixed inset-0 z-[70]" style={{ pointerEvents: "none" }}>
      {/* spotlight cutout, or a soft full dim if there's no target */}
      {rect ? (
        <div style={{ position: "fixed", top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, borderRadius: 999, boxShadow: "0 0 0 9999px rgba(23,20,16,0.55), 0 0 0 3px rgba(196,238,69,0.9)", transition: "all .25s ease" }} />
      ) : (
        <div style={{ position: "fixed", inset: 0, background: "rgba(23,20,16,0.4)" }} />
      )}

      <div key={active.key} className="absolute inset-x-0" style={{ bottom: "calc(env(safe-area-inset-bottom,0px) + 96px)", padding: "0 16px", pointerEvents: "auto", animation: "mg-up .4s cubic-bezier(0.34,1.56,0.64,1) both" }}>
        <div className="mx-auto" style={{ maxWidth: 440, background: PAPER, border: `2.5px solid ${INK}`, borderRadius: 18, padding: 15, boxShadow: "0 20px 46px rgba(23,20,16,0.4)", transform: "rotate(-0.4deg)" }}>
          {Header}
          <p style={{ fontFamily: SANS, fontSize: 13.5, color: "#4A4742", marginTop: 8, lineHeight: 1.4 }}>{active.body}</p>
          <button onClick={() => active.ctaChat ? startGroupChat(active.ctaChat) : active.ctaRoute && router.push(active.ctaRoute)} className="mt-3 w-full transition-transform active:scale-[0.98]" style={{ color: PAPER, background: TOMATO, fontFamily: DISP, fontWeight: 700, fontSize: 16, padding: "13px 0", borderRadius: 13, border: `2.5px solid ${INK}`, boxShadow: "0 7px 16px rgba(229,70,46,0.28)" }}>{active.cta}</button>
          {active.secondary && <button onClick={skipSecondary} disabled={busy} className="mx-auto mt-2.5 block" style={{ fontFamily: HAND, fontSize: 14, color: INK, opacity: 0.6, background: "none", border: "none" }}>{active.secondary.label}</button>}
        </div>
      </div>
      <style>{`@keyframes mg-up{0%{opacity:0;transform:translateY(16px)}100%{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
