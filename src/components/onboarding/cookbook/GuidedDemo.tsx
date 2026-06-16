"use client";

// Interactive guided first-run ("B"): the user actually taps through a real-
// feeling slice of the app with the seeded recipe — add it to the meal plan,
// open the auto-built grocery list from the toast, cook it with Sous Chef step
// by step — then views the family feed before moving on to allergies/taste.
// Fully scripted (no live API) so it can never break. Coachmarks guide each tap.

import { useEffect, useState } from "react";
import { SEED_RECIPE, SEED_DETAIL } from "../data/seed-recipe";
import type { SavedRecipe } from "./RecipeImportStep";

type Detail = typeof SEED_DETAIL;

const TOMATO = "#E5462E";
const INK = "#1C1A17";
const INK_SOFT = "#4A4742";
const CREAM = "#F5EEE2";
const CREAM_WARM = "#EFE5D2";
const FRAUNCES = "var(--font-display, 'Fraunces', Georgia, serif)";
const MONO = "var(--font-mono, 'Geist Mono', monospace)";
const CARD_SHADOW = "0 4px 16px rgba(20,12,5,0.10)";
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

const FEED = [
  { src: "/onboarding/recipes/lamb-biryani-83e5c3d.jpg", title: "Lamb Biryani", who: "mom", line: "made this — “sunday special”", meta: "60 MIN · DINNER" },
  { src: "/onboarding/recipes/245361-creamy-pork-stew-Beauty-4x3-a56080e9b5a4462a8dad0a7661f6d1f4.jpg", title: "Creamy Pork Stew", who: "dad", line: "planning this for friday", meta: "45 MIN · DINNER" },
];

type Phase = "recipe-add" | "plan" | "grocery" | "recipe-cook" | "cook" | "feed";

interface Props {
  recipes: SavedRecipe[];
  step: number;
  totalSteps: number;
  onBack?: () => void;
  onComplete: () => void;
}

// Use the user's actual imported recipe (camera/photo or pasted) as the hero;
// fall back to the seed. Build the detail (ingredients/steps/grocery) from real
// data when we have it, else the seed's.
function buildDetail(hero: SavedRecipe | undefined): Detail {
  if (hero?.ingredients?.length) {
    return {
      mealType: "Dinner",
      prep: hero.prep_time_minutes ?? 10,
      cook: hero.cook_time_minutes ?? 20,
      servings: hero.servings ?? 4,
      ingredients: hero.ingredients.map((i) => ({ amt: [i.amount, i.unit].filter(Boolean).join(" ") || "—", name: i.name })),
      steps: hero.steps?.length ? hero.steps : SEED_DETAIL.steps,
      grocery: hero.ingredients.slice(0, 6).map((i) => i.name),
    };
  }
  return SEED_DETAIL;
}

/* eslint-disable @next/next/no-img-element */
function Img({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />;
}

function Coach({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center mb-2.5">
      <span className="animate-bounce-slow inline-flex items-center gap-1.5" style={{ background: INK, color: "#fff", fontFamily: FRAUNCES, fontVariationSettings: '"opsz" 14, "wght" 500', fontSize: 13, padding: "6px 12px", borderRadius: 999, boxShadow: "0 4px 14px rgba(20,12,5,0.25)" }}>
        👆 {children}
      </span>
    </div>
  );
}

export default function GuidedDemo({ recipes, step, totalSteps, onBack, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("recipe-add");
  const [showToast, setShowToast] = useState(false);
  const [cookStep, setCookStep] = useState(0);

  const hero = recipes[0] ?? SEED_RECIPE;
  const detail = buildDetail(recipes[0]);
  const pct = Math.max(0, Math.min(100, (step / totalSteps) * 100));

  // On the plan screen, the grocery toast slides up shortly after arrival.
  useEffect(() => {
    if (phase !== "plan") return;
    const t = setTimeout(() => setShowToast(true), 900);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: CREAM }}>
      <div className="relative w-full max-w-md mx-auto flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* top chrome — matches the guided flow: logo + back + progress bar */}
        <div className="flex flex-col flex-shrink-0" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}>
          <div className="flex justify-center">
            <span className="marco-signature" style={{ fontSize: "1.6rem" }}>salt &amp; spoon</span>
          </div>
          <div className="flex items-center gap-3 px-5 pt-3.5 pb-1">
            {onBack && phase === "recipe-add" ? (
              <button onClick={onBack} aria-label="Back" className="flex items-center justify-center flex-shrink-0 active:opacity-50" style={{ width: 28, height: 28, marginLeft: -4, color: INK }}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M15 19l-7-7 7-7" /></svg>
              </button>
            ) : (
              <div style={{ width: 24 }} aria-hidden />
            )}
            <div className="flex-1 overflow-hidden" style={{ height: 7, borderRadius: 100, background: "rgba(28,26,23,0.1)" }}>
              <div style={{ height: "100%", width: `${pct}%`, borderRadius: 100, background: TOMATO, transition: "width 0.5s cubic-bezier(0.16,1,0.3,1)" }} />
            </div>
          </div>
          <div className="flex justify-end px-5 pb-1.5">
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(28,26,23,0.4)" }}>Try it — it&apos;s yours</span>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {(phase === "recipe-add" || phase === "recipe-cook") && <RecipeScreen hero={hero} detail={detail} cook={phase === "recipe-cook"} onAdd={() => setPhase("plan")} onCook={() => { setCookStep(0); setPhase("cook"); }} />}
          {phase === "plan" && <PlanScreen hero={hero} showToast={showToast} onToast={() => setPhase("grocery")} />}
          {phase === "grocery" && <GroceryScreen detail={detail} onCook={() => setPhase("recipe-cook")} />}
          {phase === "cook" && <CookScreen hero={hero} detail={detail} step={cookStep} onNext={() => { if (cookStep < detail.steps.length - 1) setCookStep((s) => s + 1); else setPhase("feed"); }} />}
          {phase === "feed" && <FeedScreen onContinue={onComplete} />}
        </div>
      </div>
    </div>
  );
}

/* ── Recipe detail ─────────────────────────────────────────────────────── */
function RecipeScreen({ hero, detail, cook, onAdd, onCook }: { hero: SavedRecipe; detail: Detail; cook: boolean; onAdd: () => void; onCook: () => void }) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto px-4">
        <div className="relative overflow-hidden rounded-2xl" style={{ height: 180 }}>
          <Img src={hero.image_url || ""} alt={hero.title} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(20,12,5,0.7) 100%)" }} />
          <div className="absolute bottom-0 left-0 right-0 px-3.5 pb-3">
            <h1 className="text-white" style={{ fontFamily: FRAUNCES, fontVariationSettings: '"opsz" 144, "wght" 600', fontSize: 24, lineHeight: 1.1, textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>{hero.title}</h1>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.13em", textTransform: "uppercase", color: "rgba(255,255,255,0.85)", marginTop: 4 }}>{detail.mealType} · {detail.prep}M PREP + {detail.cook}M COOK · {detail.servings} SERVINGS</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl overflow-hidden mt-3" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
          <div className="flex" style={{ borderBottom: "1px solid rgba(28,26,23,0.08)" }}>
            {["Ingredients", "Steps", "Macros"].map((t, i) => (
              <div key={t} className="flex-1 py-2.5 text-center relative" style={{ fontSize: 12, fontWeight: i === 0 ? 600 : 500, color: i === 0 ? TOMATO : INK_SOFT }}>
                {t}{i === 0 && <div className="absolute bottom-0 left-4 right-4 rounded-full" style={{ height: 2, background: TOMATO }} />}
              </div>
            ))}
          </div>
          <div className="p-3.5 space-y-2.5">
            {detail.ingredients.map((ing) => (
              <div key={ing.name} className="flex items-baseline justify-between" style={{ borderBottom: "1px solid rgba(28,26,23,0.05)", paddingBottom: 7 }}>
                <span style={{ fontSize: 13.5, color: INK }}>{ing.name}</span>
                <span className="tabular-nums" style={{ fontFamily: MONO, fontSize: 11.5, color: INK_SOFT }}>{ing.amt}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="h-3" />
      </div>
      {/* sticky actions */}
      <div className="flex-shrink-0 px-4 pt-2 pb-5">
        {cook ? (
          <>
            <Coach>Tap to cook it with Sous Chef</Coach>
            <button onClick={onCook} className="w-full flex items-center justify-center gap-1.5 rounded-2xl py-3.5" style={{ border: `1.5px solid ${TOMATO}`, background: "white" }}>
              <span className="font-semibold" style={{ fontSize: 15, color: INK }}>Cook with Sous Chef</span>
              <span style={{ background: CREAM_WARM, color: TOMATO, fontFamily: MONO, fontSize: 8, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", padding: "2px 6px", borderRadius: 999 }}>voice</span>
            </button>
          </>
        ) : (
          <>
            <Coach>Add it to your week</Coach>
            <button onClick={onAdd} className="w-full rounded-2xl py-3.5 font-semibold text-white active:scale-[0.98] transition-transform" style={{ background: TOMATO, fontSize: 15 }}>
              Add to Meal Plan
            </button>
            <div className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-2xl py-3" style={{ border: "1px solid rgba(28,26,23,0.12)", background: "white", opacity: 0.5 }}>
              <span className="font-semibold" style={{ fontSize: 14, color: INK }}>Cook with Sous Chef</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Meal plan + grocery toast ─────────────────────────────────────────── */
function PlanScreen({ hero, showToast, onToast }: { hero: SavedRecipe; showToast: boolean; onToast: () => void }) {
  return (
    <div className="h-full flex flex-col relative">
      <div className="flex-1 min-h-0 overflow-y-auto px-4">
        <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(28,26,23,0.5)" }}>This week</p>
        <h1 style={{ fontFamily: FRAUNCES, fontVariationSettings: '"opsz" 144, "wght" 600', fontSize: 22, color: INK, marginTop: 2, marginBottom: 12 }}>Meal plan</h1>
        <div className="flex justify-between mb-4">
          {DAYS.map((d, i) => (
            <div key={i} className="flex items-center justify-center rounded-full" style={{ width: 32, height: 32, fontSize: 12, fontWeight: 600, fontFamily: MONO, background: i === 2 ? TOMATO : CREAM_WARM, color: i === 2 ? "#fff" : "rgba(28,26,23,0.45)" }}>{d}</div>
          ))}
        </div>
        <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.13em", textTransform: "uppercase", color: INK_SOFT, marginBottom: 8 }}>Wednesday · Dinner</p>
        <div className="flex items-center gap-3 p-2.5 bg-white rounded-2xl animate-stagger-in" style={{ boxShadow: `0 0 0 1.5px ${TOMATO}` }}>
          <div className="relative overflow-hidden rounded-xl flex-shrink-0" style={{ width: 54, height: 54 }}><Img src={hero.image_url || ""} alt={hero.title} /></div>
          <div className="flex-1 min-w-0">
            <p className="truncate" style={{ fontFamily: FRAUNCES, fontVariationSettings: '"opsz" 60, "wght" 600', fontSize: 15, color: INK }}>{hero.title}</p>
            <p style={{ fontSize: 12, color: INK_SOFT }}>Added just now</p>
          </div>
          <span style={{ color: TOMATO, fontSize: 20 }}>✓</span>
        </div>
      </div>

      {/* grocery toast */}
      {showToast && (
        <div className="absolute left-3 right-3 animate-slide-up" style={{ bottom: 20 }}>
          <Coach>Tap to see your groceries</Coach>
          <button onClick={onToast} className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl active:scale-[0.98] transition-transform text-left" style={{ background: INK, boxShadow: "0 8px 24px rgba(20,12,5,0.3)" }}>
            <span style={{ fontSize: 22 }}>🛒</span>
            <div className="flex-1 min-w-0">
              <p className="text-white" style={{ fontFamily: FRAUNCES, fontVariationSettings: '"opsz" 14, "wght" 600', fontSize: 14 }}>6 ingredients added to your list</p>
              <p style={{ fontSize: 11.5, color: "#7bdca0" }}>+ earn $4.20 cash back</p>
            </div>
            <span className="text-white" style={{ fontSize: 18, opacity: 0.7 }}>›</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Grocery list ──────────────────────────────────────────────────────── */
function GroceryScreen({ detail, onCook }: { detail: Detail; onCook: () => void }) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto px-4">
        <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(28,26,23,0.5)" }}>Auto-built for your plan</p>
        <h1 style={{ fontFamily: FRAUNCES, fontVariationSettings: '"opsz" 144, "wght" 600', fontSize: 22, color: INK, marginTop: 2, marginBottom: 12 }}>Grocery list</h1>
        <div className="rounded-2xl bg-white p-3.5 mb-3" style={{ boxShadow: CARD_SHADOW, border: "1.5px solid #bbf7d0" }}>
          <div className="flex items-baseline justify-between mb-2">
            <p style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9b938a" }}>This week&apos;s groceries</p>
            <p className="font-bold tabular-nums" style={{ fontSize: 15, color: INK }}>$72&ndash;$84</p>
          </div>
          <div className="flex items-baseline justify-between mb-1.5">
            <p className="font-semibold tabular-nums" style={{ fontSize: 12.5, color: "#22c55e" }}>+$1.56 this run</p>
            <p className="font-extrabold" style={{ fontSize: 19, color: "#16a34a", lineHeight: 1 }}>$210<span style={{ fontSize: 11, fontWeight: 600, color: "#22c55e" }}>/year</span></p>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: "#dcfce7" }}><div style={{ width: "35%", height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#22c55e,#16a34a)" }} /></div>
        </div>
        <div className="space-y-1.5">
          {detail.grocery.map((it) => (
            <div key={it} className="flex items-center gap-3 px-2.5 py-2.5 bg-white rounded-xl" style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.04)" }}>
              <span className="flex items-center justify-center rounded-md flex-shrink-0" style={{ width: 20, height: 20, border: "2px solid rgba(28,26,23,0.18)" }} />
              <span style={{ fontSize: 14, color: INK }}>{it}</span>
            </div>
          ))}
        </div>
        <div className="h-3" />
      </div>
      <div className="flex-shrink-0 px-4 pt-2 pb-5">
        <Coach>Now let&apos;s cook it</Coach>
        <button onClick={onCook} className="w-full rounded-2xl py-3.5 font-semibold text-white active:scale-[0.98] transition-transform" style={{ background: TOMATO, fontSize: 15 }}>Cook it now →</button>
      </div>
    </div>
  );
}

/* ── Cook mode ─────────────────────────────────────────────────────────── */
function CookScreen({ hero, detail, step, onNext }: { hero: SavedRecipe; detail: Detail; step: number; onNext: () => void }) {
  const total = detail.steps.length;
  const last = step === total - 1;
  return (
    <div className="h-full flex flex-col px-5">
      <div className="flex items-start justify-between flex-shrink-0 pt-1">
        <div>
          <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: INK_SOFT, opacity: 0.7 }}>{hero.title}</p>
          <p style={{ fontFamily: FRAUNCES, fontStyle: "italic", fontVariationSettings: '"opsz" 60, "wght" 400', fontSize: 19, color: INK, marginTop: 3 }}>Step {step + 1} of {total}</p>
        </div>
        <span className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 30, height: 30, background: TOMATO, color: "#fff" }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="9" y="3" width="6" height="11" rx="3" /><path strokeLinecap="round" d="M5 11a7 7 0 0014 0M12 18v3" /></svg>
        </span>
      </div>
      <div className="mt-2 px-3 py-1.5 rounded-xl flex-shrink-0 self-start" style={{ background: CREAM_WARM }}>
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.18em", color: TOMATO }}>● Listening</span>
      </div>
      <div className="flex-1 flex items-center justify-center text-center">
        <p key={step} className="animate-stagger-in" style={{ fontFamily: FRAUNCES, fontVariationSettings: '"opsz" 60, "wght" 500', fontSize: 22, color: INK, lineHeight: 1.3 }}>
          {detail.steps[step]}
        </p>
      </div>
      <div className="flex-shrink-0 pb-6">
        <Coach>{last ? "Tap to finish" : "Tap when this step's done"}</Coach>
        <button onClick={onNext} className="w-full rounded-2xl py-3.5 font-semibold text-white active:scale-[0.98] transition-transform" style={{ background: INK, fontSize: 15 }}>
          {last ? "Finish cooking 🎉" : "Next step →"}
        </button>
      </div>
    </div>
  );
}

/* ── Family feed (final view) ──────────────────────────────────────────── */
function FeedScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto px-4">
        <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(28,26,23,0.5)" }}>What&apos;s cooking</p>
        <h1 style={{ fontFamily: FRAUNCES, fontVariationSettings: '"opsz" 144, "wght" 600', fontSize: 22, color: INK, marginTop: 2, marginBottom: 12 }}>Extended family feed</h1>
        <div className="space-y-3">
          {FEED.map((c, i) => (
            <article key={i} className="rounded-2xl bg-white overflow-hidden animate-stagger-in" style={{ boxShadow: "0 2px 12px rgba(20,12,5,0.06)", border: "1px solid rgba(28,26,23,0.12)", animationDelay: `${i * 0.12}s` }}>
              <div className="relative w-full" style={{ aspectRatio: "16/9", background: CREAM_WARM }}><Img src={c.src} alt={c.title} /></div>
              <div className="px-3.5 pt-2.5 pb-3">
                <h3 style={{ fontFamily: FRAUNCES, fontVariationSettings: '"opsz" 60, "wght" 600', fontSize: 15, color: INK }}>{c.title}</h3>
                <div className="mt-0.5"><span className="marco-signature" style={{ fontSize: "1.05rem", color: INK }}>~{c.who}</span></div>
                <p style={{ fontFamily: FRAUNCES, fontStyle: "italic", fontSize: 12.5, color: INK_SOFT, marginTop: 1 }}>{c.line}</p>
                <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(28,26,23,0.12)", fontFamily: MONO, fontSize: 9, letterSpacing: "0.13em", textTransform: "uppercase", color: INK_SOFT }}>{c.meta}</div>
              </div>
            </article>
          ))}
        </div>
        <div className="h-3" />
      </div>
      <div className="flex-shrink-0 px-4 pt-2 pb-5">
        <button onClick={onContinue} className="w-full rounded-2xl py-3.5 font-semibold text-white active:scale-[0.98] transition-transform" style={{ background: INK, fontSize: 15 }}>Continue</button>
      </div>
    </div>
  );
}
