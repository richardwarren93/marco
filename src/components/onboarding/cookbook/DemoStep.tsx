"use client";

// "See it in action" — auto-playing walkthrough using the recipes the user just
// added. Each screen mirrors the real app components 1:1 (SharedRecipeCard,
// MealPlanListView, recipe detail, CookMode, GroceryList savings bar,
// SignedRecipeCard feed) at demo scale, on the app's cream surface.

import { useEffect, useMemo, useState, type ReactNode } from "react";
import CookbookPage from "./CookbookPage";
import { CookbookButton } from "./CookbookControls";
import type { SavedRecipe } from "./RecipeImportStep";
import { RecipesIcon, MealPlanIcon, GroceryIcon, SearchIcon } from "@/components/icons/HandDrawnIcons";

const FALLBACK: SavedRecipe[] = [
  { id: "f1", title: "Lamb Biryani", image_url: "/onboarding/recipes/lamb-biryani-83e5c3d.jpg" },
  { id: "f2", title: "Creamy Pork Stew", image_url: "/onboarding/recipes/245361-creamy-pork-stew-Beauty-4x3-a56080e9b5a4462a8dad0a7661f6d1f4.jpg" },
  { id: "f3", title: "Roujiamo", image_url: "/onboarding/recipes/chinese hamburger.jpeg" },
  { id: "f4", title: "Teriyaki Salmon", image_url: "/onboarding/recipes/salmon terriyaki.jpg" },
  { id: "f5", title: "Fettuccine Alfredo", image_url: "/onboarding/recipes/fettuccine-alfredo.jpg" },
  { id: "f6", title: "Chicken Shawarma", image_url: "/onboarding/recipes/Chicken-Shawarma-8.jpg" },
  { id: "f7", title: "Shrimp Scampi", image_url: "/onboarding/recipes/shrimp scampi.jpg" },
];

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const TOMATO = "#E5462E";
const INK = "#1C1A17";
const INK_SOFT = "#4A4742";
const CREAM_WARM = "#EFE5D2";
const FRAUNCES = "var(--font-display, 'Fraunces', Georgia, serif)";
const MONO = "var(--font-mono, 'Geist Mono', monospace)";
const CARD_SHADOW = "0 4px 16px rgba(20,12,5,0.10)";
const FALLBACK_BG = "radial-gradient(circle at 35% 40%, #E8A33D 0%, transparent 45%), radial-gradient(circle at 70% 70%, #E5462E 0%, transparent 40%), #EFE5D2";
const MUSTARD = "#E8A33D";
const BEAT_MS = 4200;
const BEATS = 6;

// Which bottom-nav tab is active per beat (null = full-screen modal, no nav).
const NAV_BY_BEAT: (("recipes" | "meal-plan" | "grocery" | "discover") | null)[] = [
  "recipes", "meal-plan", "recipes", null, "grocery", "discover",
];

function PhoneNav({ active }: { active: "recipes" | "meal-plan" | "grocery" | "discover" | null }) {
  if (!active) return null;
  const Tab = ({ id, Icon }: { id: string; Icon: typeof RecipesIcon }) => {
    const on = active === id;
    return (
      <div className="flex items-center justify-center flex-1" style={{ color: on ? "#fff" : INK_SOFT }}>
        <span className="flex items-center justify-center" style={{ width: 30, height: 30, borderRadius: "50%", background: on ? MUSTARD : "transparent" }}>
          <Icon className="w-[18px] h-[18px]" filled={on} />
        </span>
      </div>
    );
  };
  return (
    <div className="flex-shrink-0 mx-2.5 mb-2 flex items-center" style={{ height: 44, borderRadius: 22, background: "rgba(255,253,247,0.92)", boxShadow: "0 2px 16px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(28,26,23,0.06)" }}>
      <Tab id="recipes" Icon={RecipesIcon} />
      <Tab id="meal-plan" Icon={MealPlanIcon} />
      <div className="flex items-center justify-center flex-1">
        <span className="flex items-center justify-center -translate-y-3" style={{ width: 36, height: 36, borderRadius: "50%", background: TOMATO, boxShadow: "0 2px 8px rgba(229,70,46,0.3)" }}>
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
        </span>
      </div>
      <Tab id="grocery" Icon={GroceryIcon} />
      <div className="flex items-center justify-center flex-1" style={{ color: active === "discover" ? "#fff" : INK_SOFT }}>
        <span className="flex items-center justify-center" style={{ width: 30, height: 30, borderRadius: "50%", background: active === "discover" ? MUSTARD : "transparent" }}>
          <SearchIcon className="w-[18px] h-[18px]" />
        </span>
      </div>
    </div>
  );
}

interface Props {
  recipes: SavedRecipe[];
  pageNumber: number;
  onBack?: () => void;
  onNext: () => void;
}

function RImg({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  if (!src) return <div className="absolute inset-0" style={{ background: FALLBACK_BG }} />;
  // Plain img (no next/image) — matches the app and avoids remote-domain config.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} referrerPolicy="no-referrer" loading="lazy" className={className || "absolute inset-0 w-full h-full object-cover"} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />;
}

export default function DemoStep({ recipes, pageNumber, onBack, onNext }: Props) {
  const list = recipes.length > 0 ? recipes : FALLBACK;
  const hero = list[0];
  const second = list[1] || list[0];
  const [beat, setBeat] = useState(0);

  const captions = useMemo(
    () => [
      "Every recipe you add lands in your cookbook.",
      `Plan your week — drop ${hero.title} onto any day.`,
      "Open a recipe and tap Cook with Sous Chef.",
      "Sous Chef walks you through every step, hands-free.",
      "Auto-build your grocery list — and earn cash back when you shop.",
      "See what your close family and friends are cooking.",
    ],
    [hero.title]
  );

  useEffect(() => {
    const t = setTimeout(() => setBeat((b) => (b + 1) % BEATS), BEAT_MS);
    return () => clearTimeout(t);
  }, [beat]);

  return (
    <CookbookPage
      sectionLabel="Your kitchen"
      questionLabel="In motion"
      dropCap="H"
      title={<>ere&apos;s what happens <em style={{ color: TOMATO, fontStyle: "italic" }}>next.</em></>}
      pageNumber={pageNumber}
      onBack={onBack}
      footer={
        <div className="space-y-3">
          <div className="flex justify-center gap-2">
            {captions.map((_, i) => (
              <button key={i} onClick={() => setBeat(i)} aria-label={`Step ${i + 1}`} className="rounded-full transition-all" style={{ width: i === beat ? 20 : 7, height: 7, background: i === beat ? TOMATO : "rgba(28,26,23,0.2)" }} />
            ))}
          </div>
          <CookbookButton onClick={onNext}>Continue</CookbookButton>
        </div>
      }
    >
      <div className="flex flex-col h-full min-h-0">
        <div
          className="relative mx-auto w-full flex-1 min-h-0 flex flex-col overflow-hidden"
          style={{ maxWidth: 290, borderRadius: 30, background: "#F5EEE2", border: "7px solid #1C1A17", boxShadow: "0 18px 40px rgba(74,50,20,0.3)" }}
        >
          <div className="flex items-center justify-between px-4 pt-2.5 pb-1 flex-shrink-0" style={{ fontSize: 10, color: INK, fontWeight: 600 }}>
            <span>9:41</span>
            <span className="marco-signature" style={{ fontSize: 15 }}>Marco</span>
            <span>●●●</span>
          </div>
          <div key={beat} className="flex-1 min-h-0 overflow-hidden px-3.5 pt-0.5 pb-1.5 animate-stagger-in">
            {beat === 0 && <ScreenCookbook list={list} />}
            {beat === 1 && <ScreenMealPlan hero={hero} second={second} />}
            {beat === 2 && <ScreenRecipeDetail hero={hero} />}
            {beat === 3 && <ScreenCookMode hero={hero} />}
            {beat === 4 && <ScreenGroceries hero={hero} />}
            {beat === 5 && <ScreenFeed list={list} />}
          </div>
          <PhoneNav active={NAV_BY_BEAT[beat]} />
        </div>
        <p key={`cap-${beat}`} className="text-center mt-3 px-2 flex-shrink-0 animate-stagger-in" style={{ fontFamily: FRAUNCES, fontStyle: "italic", fontSize: 15, color: "rgba(28,26,23,0.72)", lineHeight: 1.35 }}>
          {captions[beat]}
        </p>
      </div>
    </CookbookPage>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(28,26,23,0.5)" }}>{children}</p>;
}
function Title({ children, size = 18 }: { children: ReactNode; size?: number }) {
  return <h3 style={{ fontFamily: FRAUNCES, fontVariationSettings: '"opsz" 144, "wght" 600', fontSize: size, letterSpacing: "-0.02em", color: INK, lineHeight: 1.1, marginTop: 2 }}>{children}</h3>;
}

/* Full-bleed editorial recipe card — the real SharedRecipeCard pattern. */
function PortraitCard({ r, plus }: { r: SavedRecipe; plus?: boolean }) {
  return (
    <div className="relative overflow-hidden" style={{ aspectRatio: "4 / 5", borderRadius: 16, boxShadow: CARD_SHADOW }}>
      <RImg src={r.image_url} alt={r.title} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 55%, rgba(20,12,5,0.40) 80%, rgba(20,12,5,0.72) 100%)" }} />
      <div className="absolute flex items-center justify-center rounded-full" style={{ top: 7, right: 7, width: 22, height: 22, background: "rgba(0,0,0,0.25)", backdropFilter: "blur(4px)" }}>
        <span className="text-white" style={{ fontSize: 13, lineHeight: 1 }}>{plus ? "+" : "♥"}</span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2 pt-6">
        <h4 className="text-white line-clamp-2" style={{ fontFamily: FRAUNCES, fontVariationSettings: '"opsz" 60, "wght" 500', fontSize: 12, lineHeight: 1.18, letterSpacing: "-0.015em", textShadow: "0 1px 6px rgba(0,0,0,0.45)" }}>{r.title}</h4>
        <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.13em", textTransform: "uppercase", color: "rgba(255,255,255,0.85)", fontWeight: 500, marginTop: 3 }}>35 MIN · DINNER</div>
      </div>
    </div>
  );
}

/* ── Beat 1: My Recipes ───────────────────────────────────────────────── */
function ScreenCookbook({ list }: { list: SavedRecipe[] }) {
  const cards = [...list, ...FALLBACK].slice(0, 6);
  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 mb-2.5"><Title size={20}>My Recipes</Title></div>
      <div className="grid grid-cols-2 gap-2.5 flex-1 min-h-0 overflow-hidden content-start">
        {cards.map((r, i) => <div key={`${r.id}-${i}`} className="animate-stagger-in" style={{ animationDelay: `${i * 0.06}s` }}><PortraitCard r={r} plus={i % 2 === 1} /></div>)}
      </div>
    </div>
  );
}

/* ── Beat 2: Meal plan ────────────────────────────────────────────────── */
function ScreenMealPlan({ hero, second }: { hero: SavedRecipe; second: SavedRecipe }) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 mb-2.5"><Eyebrow>This week</Eyebrow><Title>Meal plan</Title></div>
      <div className="flex justify-between mb-3 flex-shrink-0">
        {DAYS.map((d, i) => (
          <div key={i} className="flex items-center justify-center rounded-full" style={{ width: 28, height: 28, fontSize: 11, fontWeight: 600, fontFamily: MONO, background: i === 2 ? TOMATO : CREAM_WARM, color: i === 2 ? "white" : "rgba(28,26,23,0.45)" }}>{d}</div>
        ))}
      </div>
      {/* Day hero white card with a meal row */}
      <div className="rounded-2xl overflow-hidden mb-3 animate-stagger-in" style={{ background: "white", boxShadow: CARD_SHADOW, animationDelay: "0.1s" }}>
        <div className="flex items-center gap-3 p-2.5">
          <div className="relative overflow-hidden flex-shrink-0" style={{ width: 50, height: 50, borderRadius: 12 }}><RImg src={hero.image_url} alt={hero.title} /></div>
          <div className="min-w-0 flex-1">
            <p className="truncate" style={{ fontFamily: FRAUNCES, fontVariationSettings: '"opsz" 60, "wght" 600', fontSize: 14, color: INK }}>{hero.title}</p>
            <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.13em", textTransform: "uppercase", color: INK_SOFT, marginTop: 2 }}>Wed · Dinner</p>
          </div>
          <span style={{ color: TOMATO, fontSize: 18 }}>✓</span>
        </div>
        <div className="px-3.5 pb-2.5">
          <div className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl" style={{ background: "#eeecea", color: "#333", fontSize: 12, fontWeight: 500 }}>+ Add meal</div>
        </div>
      </div>
      {/* My Recipes rail */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0"><Eyebrow>My Recipes</Eyebrow><span style={{ color: TOMATO, fontSize: 10, fontWeight: 600 }}>See all ›</span></div>
      <div className="grid grid-cols-2 gap-2.5 flex-shrink-0"><PortraitCard r={second} plus /><PortraitCard r={hero} plus /></div>
    </div>
  );
}

/* ── Beat 3: Recipe detail — title, meta, tabs + ingredients, cook button ─ */
const INGREDIENTS = [
  { amt: "2 tbsp", name: "Olive oil" },
  { amt: "1", name: "Yellow onion, diced" },
  { amt: "3 cloves", name: "Garlic, minced" },
  { amt: "1 tsp", name: "Ground cumin" },
  { amt: "to taste", name: "Salt & pepper" },
];
function ScreenRecipeDetail({ hero }: { hero: SavedRecipe }) {
  return (
    <div className="h-full flex flex-col">
      <div className="relative overflow-hidden flex-shrink-0 mb-2.5" style={{ height: 92, borderRadius: 16 }}>
        <RImg src={hero.image_url} alt={hero.title} />
      </div>
      <h4 className="flex-shrink-0" style={{ fontFamily: FRAUNCES, fontVariationSettings: '"opsz" 144, "wght" 600', fontSize: 19, lineHeight: 1.1, letterSpacing: "-0.02em", color: INK }}>{hero.title}</h4>
      <div className="flex-shrink-0 mt-1" style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 500, letterSpacing: "0.13em", textTransform: "uppercase", color: INK_SOFT }}>🌙 DINNER · 20M PREP + 15M COOK · 4 SERVINGS</div>

      {/* Tabs card — Ingredients | Steps | Macros */}
      <div className="bg-white rounded-2xl overflow-hidden mt-2.5 flex-1 min-h-0 flex flex-col" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <div className="flex flex-shrink-0" style={{ borderBottom: "1px solid rgba(28,26,23,0.08)" }}>
          {["Ingredients", "Steps", "Macros"].map((tab, i) => (
            <div key={tab} className="flex-1 py-2.5 text-center relative" style={{ fontSize: 11, fontWeight: i === 0 ? 600 : 500, color: i === 0 ? TOMATO : INK_SOFT }}>
              {tab}
              {i === 0 && <div className="absolute bottom-0 left-3 right-3 rounded-full" style={{ height: 2, background: TOMATO }} />}
            </div>
          ))}
        </div>
        <div className="p-3 space-y-2 overflow-hidden">
          {INGREDIENTS.map((ing) => (
            <div key={ing.name} className="flex items-baseline justify-between" style={{ borderBottom: "1px solid rgba(28,26,23,0.05)", paddingBottom: 6 }}>
              <span style={{ fontSize: 12.5, color: INK }}>{ing.name}</span>
              <span className="tabular-nums" style={{ fontFamily: MONO, fontSize: 11, color: INK_SOFT }}>{ing.amt}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Real Cook-with button, renamed to Sous Chef */}
      <button className="w-full flex items-center justify-center gap-1.5 rounded-xl mt-2.5 flex-shrink-0" style={{ padding: "10px", border: "1px solid rgba(28,26,23,0.12)", background: "white" }}>
        <span className="font-semibold" style={{ fontSize: 13, color: INK }}>Cook with Sous Chef</span>
        <span style={{ background: CREAM_WARM, color: TOMATO, fontFamily: MONO, fontSize: 8, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", padding: "2px 6px", borderRadius: 999 }}>beta</span>
      </button>
    </div>
  );
}

/* ── Beat 4: Cook mode (the CookMode screen you click into) ────────────── */
function ScreenCookMode({ hero }: { hero: SavedRecipe }) {
  return (
    <div className="h-full flex flex-col" style={{ background: "#F5EEE2" }}>
      <div className="flex items-start justify-between flex-shrink-0">
        <div className="min-w-0 flex-1">
          <p className="truncate" style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: INK_SOFT, opacity: 0.7 }}>{hero.title}</p>
          <p style={{ fontFamily: FRAUNCES, fontStyle: "italic", fontVariationSettings: '"opsz" 60, "wght" 400', fontSize: 18, color: INK, lineHeight: 1.1, marginTop: 3 }}>Step 1 of 6</p>
        </div>
        <span className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 28, height: 28, background: TOMATO, color: "white" }}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="9" y="3" width="6" height="11" rx="3" /><path strokeLinecap="round" d="M5 11a7 7 0 0014 0M12 18v3" /></svg>
        </span>
      </div>
      <div className="mt-2 px-2.5 py-1.5 rounded-xl flex-shrink-0" style={{ background: CREAM_WARM, border: "1px solid rgba(28,26,23,0.10)" }}>
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.18em", color: TOMATO }}>● Listening</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
        <p style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.13em", textTransform: "uppercase", color: INK_SOFT, opacity: 0.55, marginBottom: 8 }}>✓ Prep &amp; season your ingredients</p>
        <p style={{ fontFamily: FRAUNCES, fontVariationSettings: '"opsz" 60, "wght" 500', fontSize: 19, color: INK, lineHeight: 1.25 }}>
          Heat the pan over medium-high and add a splash of oil.
        </p>
        <p className="mt-3" style={{ fontFamily: FRAUNCES, fontStyle: "italic", fontSize: 12.5, color: INK_SOFT }}>Up next — add the aromatics and bloom the spices</p>
      </div>
      <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl flex-shrink-0" style={{ background: INK }}>
        <span className="text-white" style={{ fontFamily: FRAUNCES, fontVariationSettings: '"opsz" 14, "wght" 600', fontSize: 13 }}>Tap to complete step</span>
      </div>
    </div>
  );
}

/* ── Beat 5: groceries + savings (real GroceryList bar + GroceryItem) ──── */
function ScreenGroceries({ hero }: { hero: SavedRecipe }) {
  const items = ["Olive oil", "Garlic", "Fresh basil", "Parmesan", "Cherry tomatoes"];
  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 mb-2.5"><Eyebrow>Auto-built for your plan</Eyebrow><Title>Grocery List</Title></div>
      <div className="rounded-2xl bg-white p-3 mb-2.5 flex-shrink-0 animate-stagger-in" style={{ boxShadow: CARD_SHADOW, border: "1.5px solid #bbf7d0" }}>
        <div className="flex items-baseline justify-between mb-2">
          <p style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9b938a" }}>This week&apos;s groceries</p>
          <p className="font-bold tabular-nums" style={{ fontSize: 14, color: INK }}>$72&ndash;$84</p>
        </div>
        <div className="flex items-baseline justify-between mb-1.5">
          <p className="font-semibold tabular-nums" style={{ fontSize: 12, color: "#22c55e" }}>+$1.56 this run</p>
          <p className="font-extrabold" style={{ fontSize: 18, color: "#16a34a", lineHeight: 1 }}>$210<span style={{ fontSize: 11, fontWeight: 600, color: "#22c55e" }}>/year</span></p>
        </div>
        <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: "#dcfce7" }}><div style={{ width: "35%", height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#22c55e,#16a34a)" }} /></div>
        <p style={{ fontFamily: MONO, fontSize: 8.5, color: "#9b938a", marginTop: 6, letterSpacing: "0.04em" }}>💰 CASH BACK ON EVERY GROCERY RUN</p>
      </div>
      <div className="space-y-1.5 flex-1">
        {items.map((it, i) => (
          <div key={it} className="flex items-center gap-3 px-2 py-1.5 bg-white rounded-xl animate-stagger-in" style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.04)", animationDelay: `${0.1 + i * 0.07}s` }}>
            <span className="flex items-center justify-center rounded-md flex-shrink-0" style={{ width: 20, height: 20, background: i < 2 ? TOMATO : "transparent", border: i < 2 ? `2px solid ${TOMATO}` : "2px solid rgba(28,26,23,0.18)", color: "white", fontSize: 11 }}>{i < 2 ? "✓" : ""}</span>
            <span style={{ fontSize: 13, fontWeight: 500, textDecoration: i < 2 ? "line-through" : "none", textDecorationColor: TOMATO, color: i < 2 ? "#9b938a" : INK }}>{it}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Beat 6: extended family feed (real SignedRecipeCard) ─────────────── */
function ScreenFeed({ list }: { list: SavedRecipe[] }) {
  const pool = list.length >= 2 ? list : [...list, ...FALLBACK];
  const cards = [
    { r: pool[1 % pool.length], name: "mom", microline: "made this — “weeknight win!”", meta: "45 MIN · DINNER" },
    { r: pool[2 % pool.length], name: "sarah", microline: "planning this for friday", meta: "30 MIN · DINNER" },
  ];
  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 mb-2"><Eyebrow>What&apos;s cooking</Eyebrow><Title>Extended family feed</Title></div>
      <div className="space-y-2.5 flex-1 overflow-hidden">
        {cards.map((c, i) => (
          <article key={i} className="rounded-2xl bg-white overflow-hidden animate-stagger-in" style={{ boxShadow: "0 2px 12px rgba(20,12,5,0.06)", border: "1px solid rgba(28,26,23,0.12)", animationDelay: `${i * 0.12}s` }}>
            <div className="relative w-full" style={{ aspectRatio: "16 / 9", background: CREAM_WARM }}><RImg src={c.r.image_url} alt={c.r.title} /></div>
            <div className="px-3 pt-2 pb-2.5">
              <h3 className="line-clamp-1" style={{ fontFamily: FRAUNCES, fontVariationSettings: '"opsz" 60, "wght" 600', fontSize: 14, letterSpacing: "-0.015em", lineHeight: 1.2, color: INK }}>{c.r.title}</h3>
              <div className="mt-0.5"><span className="marco-signature" style={{ fontSize: "1rem", color: INK }}>~{c.name}</span></div>
              <p style={{ fontFamily: FRAUNCES, fontStyle: "italic", fontVariationSettings: '"opsz" 14, "wght" 400', fontSize: 11.5, color: INK_SOFT, lineHeight: 1.35, marginTop: 1 }}>{c.microline}</p>
              <div className="flex items-center gap-1.5 mt-1.5 pt-1.5" style={{ borderTop: "1px solid rgba(28,26,23,0.12)", fontFamily: MONO, fontSize: 9, letterSpacing: "0.13em", textTransform: "uppercase", color: INK_SOFT, fontWeight: 500 }}>{c.meta}</div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
