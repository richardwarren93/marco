"use client";

// The core loop — the new Marco in one screen:
//   check in (10s) → Marco decides the ONE thing → you cook → you're rewarded.
// Powered by the decision engine via /api/cook/suggest + /api/cook/action.

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TomatoMascot from "@/components/gamification/TomatoMascot";
import type { TomatoHealthState } from "@/lib/gamification";
import MobileHeader from "@/components/layout/MobileHeader";
import KitchenScene from "@/components/kitchen/KitchenScene";
import { type RoomPanel } from "@/components/kitchen/RoomView";
import RoomPan from "@/components/kitchen/RoomPan";
import KitchenOnboarding from "@/components/kitchen/KitchenOnboarding";

const CREAM = "#F5EEE2";
const INK = "#1C1A17";
const INK_SOFT = "#4A4742";
const TOMATO = "#E5462E";
// Warm fallback ground behind the full-bleed kitchen (image covers it; this only
// shows for the split second before the art paints, or if it fails to load).
const SHADOW = "#A9683A";
// Hidden for now (fully immersive kitchen). Flip to true to bring back the
// greeting + notifications/profile header on the home.
const SHOW_HOME_HEADER = false;

type TimeBudget = "quick" | "medium" | "long";
type Energy = "low" | "medium" | "high";
type IngredientMode = "have" | "shop" | "either";

interface Dish {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  total_time_minutes?: number | null;
  difficulty?: number | null;
  cuisine?: string | null;
  servings?: number | null;
  ingredients?: { name: string; amount?: string; unit?: string }[] | null;
  steps?: string[] | null;
}

type Step = "home" | "checkin" | "loading" | "suggestion" | "cooking" | "done" | "empty";

// What /api/cook/complete returns — drives the celebration screen.
type ProgressionEvent =
  | { type: "skill"; skill: string; label: string; level: string; experiences: number; leveledUp: boolean }
  | { type: "goal"; cookedThisWeek: number; weeklyTarget: number; hitGoal: boolean; justHit: boolean }
  | { type: "herb"; from: number; to: number; firstEver: boolean };
interface CompletionResult {
  ok: boolean;
  events: ProgressionEvent[];
  herbChanged: boolean;
  herbLevel: number;
  goalProgress: { cookedThisWeek: number; weeklyGoal: number; hasGoal: boolean };
}

// Energy is derived from the time budget (matches the mockup's 2-question flow).
const ENERGY_FOR: Record<TimeBudget, Energy> = { quick: "low", medium: "medium", long: "high" };

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function TonightPage() {
  const [step, setStep] = useState<Step>("home");
  const [time, setTime] = useState<TimeBudget | null>(null);
  const [ing, setIng] = useState<IngredientMode | null>(null);
  const [primary, setPrimary] = useState<Dish | null>(null);
  const [backup, setBackup] = useState<Dish | null>(null);
  const [reasoning, setReasoning] = useState("");
  const [ctx, setCtx] = useState<Record<string, unknown>>({});
  const [name, setName] = useState("");
  const [cookedWeek, setCookedWeek] = useState(0);
  const [weeklyGoal, setWeeklyGoal] = useState(3);
  const [hasGoal, setHasGoal] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState(0);
  const [roomPanel, setRoomPanel] = useState<RoomPanel>("center"); // which kitchen view is in focus
  const [homeReady, setHomeReady] = useState(false);
  const [planned, setPlanned] = useState(false);
  const [recipeSource, setRecipeSource] = useState<"catalog" | "user">("catalog");
  // First-run walkthrough. For now triggered by ?onboarding=1 (preview); real
  // first-run detection (user_profiles.onboarding_completed) lands once the
  // beats are built out.
  const [onboarding, setOnboarding] = useState(false);

  // Load everything the Home screen needs: greeting name, weekly progress + goal,
  // and a passive preview of tonight's suggestion (not logged until check-in).
  const loadHome = async () => {
    try {
      const res = await fetch("/api/cook/home");
      if (!res.ok) return;
      const data = await res.json();
      setName(data.name ?? "");
      setCookedWeek(data.cookedThisWeek ?? 0);
      setWeeklyGoal(data.weeklyGoal ?? 3);
      setHasGoal(!!data.hasGoal);
      setSavedRecipes(data.savedRecipes ?? 0);
      if (data.primary) {
        setPrimary(data.primary);
        setReasoning(data.reasoning ?? "");
        setPlanned(!!data.planned);
        setRecipeSource(data.recipeSource === "user" ? "user" : "catalog");
        setCtx({ timeBudget: "medium", energy: "medium", ingredientMode: "either", mealType: "dinner" });
      }
    } catch {
      /* offline / unauthenticated — Home still renders its warm empty state */
    } finally {
      setHomeReady(true);
    }
  };

  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get("onboarding") === "1") setOnboarding(true);
    } catch { /* ignore */ }
    loadHome();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchSuggestion(overrides?: { timeBudget?: TimeBudget; energy?: Energy }) {
    setStep("loading");
    const tb = overrides?.timeBudget ?? time ?? "medium";
    const res = await fetch("/api/cook/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timeBudget: tb,
        energy: overrides?.energy ?? ENERGY_FOR[tb],
        ingredientMode: ing ?? "either",
        mealType: "dinner",
      }),
    });
    if (!res.ok) return setStep("empty");
    const data = await res.json();
    setCtx(data.context ?? {});
    setReasoning(data.reasoning ?? "");
    setPrimary(data.primary ?? null);
    setBackup(data.backup ?? null);
    // A check-in suggestion always comes from the catalog, never a plan.
    setPlanned(false);
    setRecipeSource("catalog");
    setStep(data.primary ? "suggestion" : "empty");
  }

  // The one true completion: fired at "I made it!" (never on cook-mode entry).
  // Logs the cook, runs the progression engine, and returns what changed so the
  // celebration can narrate it.
  const [completion, setCompletion] = useState<CompletionResult | null>(null);
  const [completing, setCompleting] = useState(false);
  async function completeCook() {
    if (!primary) return;
    setCompleting(true);
    try {
      const res = await fetch("/api/cook/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId: primary.id, recipeSource, context: ctx }),
      });
      setCompletion(res.ok ? await res.json() : null);
    } catch {
      setCompletion(null);
    } finally {
      setCompleting(false);
      setStep("done");
    }
  }

  function act(action: "cooked" | "skipped" | "swapped", reason?: string) {
    if (!primary) return;
    fetch("/api/cook/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, recipeId: primary.id, recipeSource, context: ctx, reason }),
    }).catch(() => {});
  }

  const canFind = !!time && !!ing;

  // Kitchen (Phase 1): the herb/window zone previews weekly consistency until the
  // progression engine persists it (Phase 2). Marco's mood tracks whether you've
  // cooked this week (full cadence repoint comes with /api/cook/complete).
  const router = useRouter();
  const progress = weeklyGoal > 0 ? cookedWeek / weeklyGoal : 0;
  const herbLevel: 0 | 1 | 2 | 3 = progress >= 1 ? 3 : progress >= 0.66 ? 2 : progress >= 0.33 ? 1 : 0;
  const marcoState: TomatoHealthState = cookedWeek > 0 ? "thriving" : "content";
  const kitchenLine = planned && primary
    ? "It's on your plan — ready when you are 🍅"
    : "";
  function startCook() {
    // Entering cook mode is NOT cooking — the 'cooked' event fires at "I made
    // it!" (completeCook). Here we just open the recipe.
    if (planned && primary) {
      setStep("cooking");
    } else {
      setStep("checkin");
    }
  }

  // First-run: the whole screen IS the walkthrough (kitchen backdrop + beats).
  if (onboarding) {
    return (
      <KitchenOnboarding
        onComplete={() => {
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete("onboarding");
            window.history.replaceState({}, "", url.toString());
          } catch { /* ignore */ }
          setOnboarding(false);
          setStep("home");
          loadHome(); // pick up the goal they just set, etc.
        }}
      />
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: CREAM }}>
      <div
        className="mx-auto w-full max-w-md flex-1 flex flex-col px-5"
        style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 1.25rem)", paddingBottom: "1.5rem" }}
      >
        {/* ── Home = Marco's Kitchen (the game's Home surface) ── */}
        {step === "home" && (
          <div
            className="relative isolate flex-1 flex flex-col -mx-5"
            style={{ marginTop: "calc(-1 * (env(safe-area-inset-top,0px) + 1.25rem))", background: SHADOW }}
          >
            {/* Full-bleed kitchen fills the screen — the tall art keeps the fridge
                + window intact; content rests on the floor at the bottom. */}
            <div className="absolute inset-0">
              <RoomPan
                image="/kitchen/room-wide.png"
                aspect={1536 / 1024}
                focals={[0.13, 0.5, 0.82]}
                hideDots
                onExpand={() => router.push("/my-kitchen")}
                onFocalChange={(i) => setRoomPanel(i === 0 ? "left" : i === 2 ? "right" : "center")}
              />
            </div>

            {/* greeting + notifications, overlaid on the scene (hidden for now) */}
            {SHOW_HOME_HEADER && (
              <div className="relative">
                <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: 160, background: "linear-gradient(to bottom, rgba(250,244,232,0.9), rgba(250,244,232,0))" }} />
                <MobileHeader hideBalance>
                  <div style={{ paddingLeft: 20 }}>
                    <h1 style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: 24, lineHeight: 1.05, letterSpacing: "-0.02em", color: INK }}>
                      {greeting()}{name ? `, ${name}` : ""}
                    </h1>
                  </div>
                </MobileHeader>
              </div>
            )}

            <div className="flex-1 pointer-events-none" />

            {/* content rests on the floor — shown only when facing Center (the
                cooking view); it pans away when you look around the room. The
                wrapper is click-through so swipes reach the room beneath. */}
            <div className="relative pointer-events-none">
              {roomPanel === "center" && (
              <div className="pointer-events-auto">

            {/* Tonight — a committed plan gets the card; otherwise a clean CTA into
                the check-in (a contextual pick, not a random passive suggestion). */}
            {planned && primary ? (
              <div className="px-5 pb-2">
                <div
                  className="rounded-3xl p-3 flex items-center gap-3"
                  style={{ background: "#FFFDF9", border: "1px solid rgba(28,26,23,0.06)", boxShadow: "0 8px 22px rgba(28,26,23,0.07)" }}
                >
                  {primary.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={primary.image_url} alt={primary.title} className="rounded-2xl object-cover flex-shrink-0" style={{ width: 54, height: 54 }} />
                  ) : (
                    <div className="rounded-2xl flex-shrink-0 flex items-center justify-center" style={{ width: 54, height: 54, background: "rgba(229,70,46,0.08)" }}>
                      <TomatoMascot state="thriving" size={36} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: planned ? "#5E6E38" : TOMATO }}>
                      {planned ? "Your plan" : "Marco suggests"}
                    </span>
                    <h2 className="truncate" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: 16, color: INK, lineHeight: 1.15 }}>{primary.title}</h2>
                    <div className="flex items-center gap-1.5 text-[12px]" style={{ color: INK_SOFT }}>
                      <span className="inline-flex items-center gap-1"><ClockIcon /> {primary.total_time_minutes ?? 30} min</span>
                      {primary.difficulty != null && <><Dotsep /><span>{primary.difficulty <= 2 ? "Easy" : primary.difficulty >= 4 ? "Involved" : "Medium"}</span></>}
                    </div>
                  </div>
                  <button
                    onClick={startCook}
                    className="flex-shrink-0 px-4 py-2.5 rounded-2xl text-white font-semibold text-sm active:scale-95 transition-transform"
                    style={{ background: TOMATO, boxShadow: "0 6px 18px rgba(229,70,46,0.28)" }}
                  >
                    Cook
                  </button>
                </div>
                <div className="flex justify-center gap-4 mt-2 text-[12px] font-semibold" style={{ color: "#FBF3E6", textShadow: "0 1px 3px rgba(60,34,10,0.5)" }}>
                  <button onClick={() => { act("swapped"); fetchSuggestion(); }}>Swap</button>
                  <span aria-hidden style={{ opacity: 0.5 }}>·</span>
                  <button onClick={() => setStep("checkin")}>Something else</button>
                </div>
              </div>
            ) : (
              <div className="px-5 pb-2 flex flex-col items-center">
                {/* Bubble ABOVE Marco — tail points down to him, so it's clearly
                    him speaking. Bubble + Marco are one tight, connected unit. */}
                <button
                  onClick={() => setStep("checkin")}
                  className="relative active:scale-95 transition-transform text-center"
                  style={{
                    background: "#FFFDF9",
                    border: "1.5px solid rgba(229,70,46,0.55)",
                    borderRadius: 20,
                    padding: "13px 20px",
                    maxWidth: 300,
                    boxShadow: "0 12px 26px rgba(28,26,23,0.22)",
                    fontFamily: "var(--font-display, Georgia, serif)",
                    fontStyle: "italic",
                    fontSize: 16,
                    lineHeight: 1.25,
                    color: INK,
                  }}
                >
                  What are we cooking tonight? <span className="not-italic font-bold" style={{ color: TOMATO }}>→</span>
                  {/* tail pointing down to Marco */}
                  <span
                    aria-hidden
                    className="absolute"
                    style={{
                      bottom: -7,
                      left: "50%",
                      transform: "translateX(-50%) rotate(45deg)",
                      width: 14,
                      height: 14,
                      background: "#FFFDF9",
                      borderBottom: "1.5px solid rgba(229,70,46,0.55)",
                      borderRight: "1.5px solid rgba(229,70,46,0.55)",
                      borderBottomRightRadius: 3,
                    }}
                  />
                </button>
                {/* Marco, tucked right under his bubble */}
                <div style={{ marginTop: 8 }}>
                  <TomatoMascot state={marcoState} size={78} greeting />
                </div>
              </div>
            )}

            {/* This week — a simple goal count, only once a goal is actually set
                (goal-setting happens in onboarding; before that it's meaningless) */}
            {homeReady && hasGoal && (
              <div className="flex items-center justify-center gap-2 pb-2" style={{ textShadow: "0 1px 3px rgba(50,28,8,0.6)" }}>
                <div className="flex gap-1">
                  {Array.from({ length: Math.max(1, weeklyGoal) }).map((_, i) => (
                    <span key={i} className="rounded-full" style={{ width: 6, height: 6, background: i < cookedWeek ? TOMATO : "rgba(255,248,235,0.5)" }} />
                  ))}
                </div>
                <span className="text-[12px] font-semibold" style={{ color: "#FBF3E6" }}>
                  {cookedWeek} of {weeklyGoal} days this week
                </span>
              </div>
            )}
              </div>
              )}
            </div>

            <BottomNav />
          </div>
        )}

        {/* ── Check-in ── */}
        {step === "checkin" && (
          <div className="flex-1 flex flex-col">
            {/* progress dots */}
            <div className="flex justify-center gap-1.5 mb-2">
              <Dot on /><Dot on={!!time} /><Dot on={!!ing} />
            </div>

            {/* mascot + speech bubble */}
            <div className="relative flex justify-center items-end mt-4 mb-1" style={{ height: 128 }}>
              <TomatoMascot state="thriving" size={104} greeting />
              <div
                className="absolute right-2 top-1"
                style={{
                  background: "white",
                  border: "1px solid rgba(28,26,23,0.1)",
                  borderRadius: 16,
                  padding: "8px 12px",
                  fontFamily: "var(--font-display, Georgia, serif)",
                  fontStyle: "italic",
                  fontSize: 13,
                  color: INK_SOFT,
                  boxShadow: "0 4px 14px rgba(28,26,23,0.06)",
                }}
              >
                How are you feeling?
              </div>
            </div>

            <h1
              className="text-center mt-1"
              style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: 27, lineHeight: 1.15, color: INK }}
            >
              What&apos;s tonight looking&nbsp;like?
            </h1>
            <p className="text-center mt-1 text-sm" style={{ color: INK_SOFT }}>No wrong answer.</p>

            <div className="mt-6 space-y-5">
              <IconRow
                label="How much time do you have?"
                opts={[
                  { v: "quick", icon: <BoltIcon />, label: "15 min", sub: "or less" },
                  { v: "medium", icon: <PotIcon />, label: "~30 min", sub: "" },
                  { v: "long", icon: <ChefIcon />, label: "I'm up", sub: "for it" },
                ]}
                value={time}
                onChange={(v) => setTime(v as TimeBudget)}
              />
              <IconRow
                label="What can you use?"
                opts={[
                  { v: "have", icon: <FridgeIcon />, label: "Use what", sub: "I have" },
                  { v: "shop", icon: <CartIcon />, label: "I can", sub: "shop" },
                  { v: "either", icon: <SparkleIcon />, label: "Either", sub: "" },
                ]}
                value={ing}
                onChange={(v) => setIng(v as IngredientMode)}
              />
            </div>

            <div className="flex-1" />
            <button
              onClick={() => canFind && fetchSuggestion()}
              disabled={!canFind}
              className="w-full py-4 rounded-2xl text-white font-semibold transition-opacity mt-6"
              style={{ background: TOMATO, opacity: canFind ? 1 : 0.45, boxShadow: "0 6px 18px rgba(229,70,46,0.28)" }}
            >
              Find my recipe
            </button>
          </div>
        )}

        {step === "loading" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <TomatoMascot state="thriving" size={96} greeting />
            <p style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", color: INK_SOFT }}>
              Finding something perfect…
            </p>
          </div>
        )}

        {/* ── Suggestion ── */}
        {step === "suggestion" && primary && (
          <div className="flex-1 flex flex-col py-2">
            <div className="flex items-center gap-2 mb-3">
              <TomatoMascot state="thriving" size={44} />
              <div
                style={{
                  background: "white", border: "1px solid rgba(28,26,23,0.1)", borderRadius: 14,
                  padding: "7px 12px", fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic",
                  fontSize: 13, color: INK_SOFT,
                }}
              >
                I found something perfect for tonight ✨
              </div>
            </div>

            <div className="rounded-3xl overflow-hidden bg-white" style={{ border: "1px solid rgba(28,26,23,0.08)", boxShadow: "0 8px 24px rgba(28,26,23,0.07)" }}>
              {primary.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={primary.image_url} alt={primary.title} className="w-full h-48 object-cover" />
              )}
              <div className="p-4">
                <h2 style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: 21, color: INK, lineHeight: 1.2 }}>{primary.title}</h2>
                <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: INK_SOFT }}>
                  {primary.total_time_minutes != null && <span>🕐 {primary.total_time_minutes} min</span>}
                  {primary.difficulty != null && <span>{primary.difficulty <= 2 ? "Easy" : primary.difficulty >= 4 ? "Involved" : "Medium"}</span>}
                  {primary.cuisine && <span className="capitalize">{primary.cuisine}</span>}
                </div>
                <p className="mt-2 text-sm" style={{ color: TOMATO }}>{reasoning}</p>
              </div>
            </div>

            <button onClick={() => setStep("cooking")} className="w-full py-4 mt-4 rounded-2xl text-white font-semibold" style={{ background: TOMATO, boxShadow: "0 6px 18px rgba(229,70,46,0.28)" }}>
              Let&apos;s cook
            </button>
            <div className="mt-2 space-y-1.5">
              <SoftBtn onClick={() => fetchSuggestion({ timeBudget: "quick", energy: "low" })}>⚡ Make it easier</SoftBtn>
              <SoftBtn onClick={() => { act("swapped"); fetchSuggestion(); }}>🔄 Swap for something else</SoftBtn>
              <SoftBtn onClick={() => { act("skipped", "not_feeling_it"); fetchSuggestion(); }}>Not feeling it</SoftBtn>
            </div>
            {backup && <p className="text-center text-sm mt-4" style={{ color: INK_SOFT }}>Backup: <span style={{ color: INK }}>{backup.title}</span></p>}
          </div>
        )}

        {/* ── Cook mode ── */}
        {step === "cooking" && primary && (
          <div className="flex-1 flex flex-col py-2">
            <h2 style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: 22, color: INK }}>{primary.title}</h2>
            {!!primary.ingredients?.length && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-widest mb-2" style={{ color: INK_SOFT }}>Ingredients</p>
                <ul className="space-y-1 text-sm" style={{ color: INK }}>
                  {primary.ingredients.map((i, idx) => <li key={idx}>• {[i.amount, i.unit, i.name].filter(Boolean).join(" ")}</li>)}
                </ul>
              </div>
            )}
            {!!primary.steps?.length && (
              <div className="mt-5">
                <p className="text-xs uppercase tracking-widest mb-2" style={{ color: INK_SOFT }}>Steps</p>
                <ol className="space-y-3 text-sm" style={{ color: INK }}>
                  {primary.steps.map((s, idx) => (
                    <li key={idx} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: TOMATO }}>{idx + 1}</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <button onClick={completeCook} disabled={completing} className="w-full py-4 mt-6 rounded-2xl text-white font-semibold transition-opacity" style={{ background: TOMATO, opacity: completing ? 0.6 : 1 }}>
              {completing ? "Saving…" : "I made it!"}
            </button>
          </div>
        )}

        {/* ── Celebration ── */}
        {step === "done" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
            <TomatoMascot state="thriving" size={140} greeting />
            <h1 style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: 30, color: INK }}>You cooked it!</h1>
            <p className="text-sm" style={{ color: INK_SOFT }}>Small, consistent meals lead to big change.</p>
            <button onClick={() => { setTime(null); setIng(null); setStep("home"); }} className="mt-2 py-3 px-8 rounded-2xl font-semibold text-white" style={{ background: INK }}>Done</button>
          </div>
        )}

        {step === "empty" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
            <TomatoMascot state="content" size={100} />
            <p style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: 20, color: INK }}>Nothing fit tonight.</p>
            <p className="text-sm max-w-xs" style={{ color: INK_SOFT }}>Marco&apos;s catalog is still filling up, or nothing matched those filters. Try loosening the check-in.</p>
            <button onClick={() => setStep("checkin")} className="mt-2 py-3 px-6 rounded-2xl font-semibold text-white" style={{ background: TOMATO }}>Try again</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Bits ──
function Dot({ on }: { on?: boolean }) {
  return <span className="rounded-full transition-colors" style={{ width: 7, height: 7, background: on ? TOMATO : "rgba(28,26,23,0.15)" }} />;
}

function IconRow({ label, opts, value, onChange }: {
  label: string;
  opts: { v: string; icon: React.ReactNode; label: string; sub: string }[];
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium mb-2.5" style={{ color: INK }}>{label}</p>
      <div className="grid grid-cols-3 gap-2.5">
        {opts.map((o) => {
          const active = o.v === value;
          return (
            <button
              key={o.v}
              onClick={() => onChange(o.v)}
              className="flex flex-col items-center gap-1.5 py-3.5 px-1 rounded-2xl transition-all active:scale-95"
              style={{
                background: active ? "rgba(229,70,46,0.08)" : "white",
                border: `1.5px solid ${active ? TOMATO : "rgba(28,26,23,0.1)"}`,
                boxShadow: active ? "none" : "0 2px 8px rgba(28,26,23,0.04)",
              }}
            >
              <span style={{ color: active ? TOMATO : INK }}>{o.icon}</span>
              <span className="text-center leading-tight">
                <span className="block text-[13px] font-semibold" style={{ color: INK }}>{o.label}</span>
                {o.sub && <span className="block text-[11px]" style={{ color: INK_SOFT }}>{o.sub}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SoftBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="w-full py-3 rounded-2xl text-sm font-medium active:scale-[0.99] transition-transform" style={{ background: "rgba(255,253,247,0.75)", color: INK, border: "1px solid rgba(28,26,23,0.1)" }}>
      {children}
    </button>
  );
}

// ── Bottom nav (app shell) ──
// Order: Home · Recipes · [tomato = add recipe] · Plan · Groceries.
// The center tomato opens the import menu (paste link / photo / text), same flow
// as the rest of the app — it replaces the old "+".
function BottomNav() {
  const router = useRouter();
  const [fabOpen, setFabOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function importLink() { setFabOpen(false); router.push("/recipes/new?mode=url"); }
  function importText() { setFabOpen(false); router.push("/recipes/new?mode=text"); }
  function importPhoto() { setFabOpen(false); setTimeout(() => fileRef.current?.click(), 120); }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/recipes/extract-image", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      try { sessionStorage.setItem("importedRecipe", JSON.stringify(data.recipe)); } catch {}
      router.push("/recipes/new?mode=extracted");
    } catch {
      router.push("/recipes/new");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      {fabOpen && (
        <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.15)" }} onClick={() => setFabOpen(false)} />
      )}
      {fabOpen && (
        <div className="fixed z-50 left-1/2" style={{ transform: "translateX(-50%)", bottom: "calc(4.5rem + env(safe-area-inset-bottom,0px) + 14px)" }}>
          <div style={{ width: 224, borderRadius: 18, overflow: "hidden", background: "white", boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)" }}>
            <ImportRow label="Paste link" onClick={importLink} icon={<LinkGlyph />} />
            <div className="mx-4" style={{ height: 1, background: "#f0f0ee" }} />
            <ImportRow label="Photo" onClick={importPhoto} icon={<PhotoGlyph />} />
            <div className="mx-4" style={{ height: 1, background: "#f0f0ee" }} />
            <ImportRow label="Text" onClick={importText} icon={<TextGlyph />} />
          </div>
        </div>
      )}
      {uploading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3" style={{ background: "rgba(245,238,226,0.82)", backdropFilter: "blur(2px)" }}>
          <TomatoMascot state="thriving" size={72} greeting />
          <p style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", color: INK_SOFT }}>Reading your recipe…</p>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />

      <div
        className="-mx-5 flex items-end px-2 pt-2"
        style={{
          marginBottom: "-1.5rem",
          borderTop: "1px solid rgba(120,80,40,0.14)",
          background: "rgba(231,199,155,0.97)",
          backdropFilter: "blur(8px)",
          paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 0.5rem)",
        }}
      >
        <NavItem href="/tonight" label="Home" active icon={<HomeIcon />} />
        <NavItem href="/recipes" label="Recipes" icon={<RecipesNavIcon />} />
        <div className="flex-1 flex justify-center">
          <button
            onClick={() => setFabOpen(true)}
            aria-label="Add a recipe"
            className="flex items-center justify-center rounded-full active:scale-95 transition-transform"
            style={{
              width: 56, height: 56, marginTop: -22, background: "#FFF9EF",
              border: `2px solid ${TOMATO}`, boxShadow: "0 8px 20px rgba(229,70,46,0.28)",
            }}
          >
            <TomatoMascot state="thriving" size={38} />
          </button>
        </div>
        <NavItem href="/meal-plan" label="Plan" icon={<PlanIcon />} />
        <NavItem href="/grocery" label="Groceries" icon={<NavCartIcon />} />
      </div>
    </>
  );
}

function ImportRow({ label, onClick, icon }: { label: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left w-full">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#f3f3f1" }}>{icon}</div>
      <p className="text-sm font-semibold" style={{ color: "#1C1A17" }}>{label}</p>
    </button>
  );
}

const GP = { className: "w-3.5 h-3.5", style: { color: "#6b6862" }, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const LinkGlyph = () => (<svg {...GP}><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>);
const PhotoGlyph = () => (<svg {...GP}><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
const TextGlyph = () => (<svg {...GP}><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>);

function NavItem({ href, label, icon, active }: { href: string; label: string; icon: React.ReactNode; active?: boolean }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1 py-1 flex-1" style={{ color: active ? TOMATO : INK_SOFT }}>
      <span>{icon}</span>
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}

function Dotsep() {
  return <span aria-hidden style={{ opacity: 0.4 }}>·</span>;
}
const ClockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);

const NIP = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const HomeIcon = () => (<svg {...NIP}><path d="M3 10.5 12 3l9 7.5M5 9.5V20h5v-6h4v6h5V9.5" /></svg>);
const RecipesNavIcon = () => (<svg {...NIP}><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H18a2 2 0 0 1 2 2v13.5M4 5.5V18a2 2 0 0 0 2 2h14M4 5.5A1.5 1.5 0 0 0 5.5 7H18M8 11h8M8 14.5h5" /></svg>);
const PlanIcon = () => (<svg {...NIP}><rect x="3.5" y="4.5" width="17" height="16" rx="2.5" /><path d="M3.5 9h17M8 3v3M16 3v3" /></svg>);
const NavCartIcon = () => (<svg {...NIP}><path d="M3 4h2l2.2 11.2a1.5 1.5 0 0 0 1.5 1.3h8a1.5 1.5 0 0 0 1.5-1.2L21 7H6" /><circle cx="9.5" cy="20" r="1.2" /><circle cx="17" cy="20" r="1.2" /></svg>);

// ── Icons (stroke, warm line style) ──
const IP = { width: 26, height: 26, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const BoltIcon = () => (<svg {...IP}><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" /></svg>);
const PotIcon = () => (<svg {...IP}><path d="M4 9h16M5 9v7a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V9M8 9V7M16 9V7M3 12h1M20 12h1" /></svg>);
const ChefIcon = () => (<svg {...IP}><path d="M6 20h12M7 20v-5M17 20v-5M6 15a4 4 0 0 1-1-7.9A4 4 0 0 1 12 5a4 4 0 0 1 6.9 2.1A4 4 0 0 1 18 15Z" /></svg>);
const FridgeIcon = () => (<svg {...IP}><rect x="6" y="2.5" width="12" height="19" rx="2.5" /><path d="M6 10h12M9 6v1.5M9 13v2" /></svg>);
const CartIcon = () => (<svg {...IP}><path d="M3 4h2l2.2 11.2a1.5 1.5 0 0 0 1.5 1.3h8a1.5 1.5 0 0 0 1.5-1.2L21 7H6" /><circle cx="9.5" cy="20" r="1.2" /><circle cx="17" cy="20" r="1.2" /></svg>);
const SparkleIcon = () => (<svg {...IP}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" /></svg>);
