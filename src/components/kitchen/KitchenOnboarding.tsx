"use client";

// The first-run walkthrough — run INSIDE the kitchen (never leave it). Marco
// welcomes you, gathers the essentials that make his suggestions real, has you
// bring in your first recipe, then fires your first real herb sprout as the
// payoff before handing you a genuine suggestion.
//
// Every beat shares the full-bleed kitchen backdrop: Marco stands in the room
// with a speech bubble (the line, or the question), and question beats add a
// warm answer "tray" that rises from the floor. Narration beats just advance on
// tap. The essentials save to the same backend the old onboarding used.
//
// Build status: welcome + goal are real. allergies / dietary / taste / import /
// sprout are placeholders — each becomes a real kitchen-native beat one at a time.

import { useState, useRef, useEffect } from "react";
import KitchenScene from "@/components/kitchen/KitchenScene";
import TomatoMascot from "@/components/gamification/TomatoMascot";
import { DIETARY_FILTERS } from "@/lib/cook/dietary";
import RANKING_RECIPES from "@/components/onboarding/data/ranking-recipes";
import { SEED_REEL_URL, SEED_RECIPE, SEED_DETAIL } from "@/components/onboarding/data/seed-recipe";
import { parseStep, classifyAllSteps, TRACK_LABELS, type StepTrack } from "@/lib/cook/stepParser";
import type { Ingredient } from "@/types";

// Common food allergens (safety-critical hard filter). Stored as free strings in
// user_preferences.allergies — same set the old allergies step used, + Sesame.
const ALLERGENS = ["Peanuts", "Tree Nuts", "Dairy", "Gluten", "Shellfish", "Eggs", "Soy", "Fish", "Sesame"];

// Taste is a quick "this or that" — a handful of forced-choice matchups, each
// probing a flavor contrast. Forced choice gives cleaner signal than "pick what
// you like" (no tap-everything / tap-nothing), and it plays like a game.
const TASTE_MATCHUPS: [string, string][] = [
  ["rank-teriyaki-salmon", "rank-ceviche"],       // sweet ↔ tangy
  ["rank-fettuccine-alfredo", "rank-tabbouleh"],  // rich ↔ fresh
  ["rank-buffalo-wings", "rank-chicken-waffles"], // spicy ↔ sweet
  ["rank-mapo-tofu", "rank-shawarma"],            // savory heat ↔ smoky
  ["rank-ceviche", "rank-fettuccine-alfredo"],    // light ↔ indulgent
];
const dishById = (id: string) => RANKING_RECIPES.find((r) => r.id === id)!;

const INK = "#1C1A17";
const INK_SOFT = "#4A4742";
const TOMATO = "#E5462E";
const LEAF = "#5E6E38";
const SHADOW = "#A9683A";
const CARD = "#FFFDF9";
const CREAM = "#F5EEE2";
const CREAM_WARM = "#EFE5D2";

type Beat = "space" | "welcome" | "goal" | "household" | "allergies" | "dietary" | "taste" | "import" | "bookshelf" | "cook" | "sprout" | "handoff";
const ORDER: Beat[] = ["space", "welcome", "goal", "household", "allergies", "dietary", "taste", "import", "bookshelf", "cook", "sprout", "handoff"];

export default function KitchenOnboarding({ onComplete }: { onComplete: () => void }) {
  const [i, setI] = useState(0);
  const beat = ORDER[i];
  const next = () => (i >= ORDER.length - 1 ? onComplete() : setI(i + 1));

  const [allergies, setAllergies] = useState<string[]>([]);
  const [dietary, setDietary] = useState<string[]>([]);
  const [tasteRound, setTasteRound] = useState(0);
  const [tasteWinners, setTasteWinners] = useState<string[]>([]);
  const [spaceLine, setSpaceLine] = useState(0);
  const [falling, setFalling] = useState(false);
  const [tuscan, setTuscan] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [linkText, setLinkText] = useState("");
  const importPhotoRef = useRef<HTMLInputElement>(null);
  // The recipe they brought in — carried into the guided cook + sprout so the
  // onboarding "first cook" is genuine (writes herb 0→1 via /api/cook/complete).
  const [firstRecipe, setFirstRecipe] = useState<{ id: string; source: "user" | "catalog"; title: string; steps: string[]; image: string | null } | null>(null);
  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>, v: string) =>
    setter((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  function saveGoal(n: number) {
    fetch("/api/cooking-goal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekly_target: n }),
    }).catch(() => {});
    next();
  }
  function saveHousehold(n: number) {
    fetch("/api/onboarding/household", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ householdSize: n }),
    }).catch(() => {});
    next();
  }
  function saveAllergies() {
    fetch("/api/user/allergies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allergies }),
    }).catch(() => {});
    next();
  }
  function saveDietary() {
    fetch("/api/user/dietary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filters: dietary }),
    }).catch(() => {});
    next();
  }
  // Seed the taste profile from the dishes the user chose (the matchup winners):
  // average their flavor weights → 0–100 scores, tally cuisines. Feeds the cook
  // engine via /api/taste-profile/retune.
  function seedTaste(ids: string[]) {
    const picks = ids.map(dishById);
    if (!picks.length) return;
    const avg = (k: "sweet" | "savory" | "richness" | "tangy") =>
      Math.round((picks.reduce((s, r) => s + r.flavorWeights[k], 0) / picks.length) * 100);
    const scores = { sweet: avg("sweet"), savory: avg("savory"), richness: avg("richness"), tangy: avg("tangy") };
    const cuisines = [...new Set(picks.map((r) => r.cuisine))];
    fetch("/api/taste-profile/retune", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scores, cuisines }),
    }).catch(() => {});
  }
  // ── Import: seed recipe (can't-fail default) + bring-your-own (link / photo) ──
  async function addSeed() {
    setImportBusy(true);
    try {
      const res = await fetch("/api/recipes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: SEED_RECIPE.title,
          image_url: SEED_RECIPE.image_url,
          ingredients: SEED_DETAIL.ingredients.map((i) => ({ name: i.name, amount: i.amt, unit: "" })),
          steps: SEED_DETAIL.steps,
          meal_type: "dinner",
          prep_time_minutes: SEED_DETAIL.prep,
          cook_time_minutes: SEED_DETAIL.cook,
          servings: SEED_DETAIL.servings,
          source_url: SEED_REEL_URL,
          source_platform: "instagram",
        }),
      });
      const data = await res.json().catch(() => null);
      if (data?.recipe?.id) setFirstRecipe({ id: data.recipe.id, source: "user", title: SEED_RECIPE.title, steps: SEED_DETAIL.steps, image: SEED_RECIPE.image_url });
    } catch {}
    setImportBusy(false);
    next();
  }
  async function addLink() {
    const url = linkText.trim();
    if (!/^https?:\/\//i.test(url)) return;
    setImportBusy(true);
    try {
      const res = await fetch("/api/onboarding/import-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [url] }),
      });
      const data = await res.json().catch(() => null);
      const r = data?.recipes?.[0];
      if (r?.id) setFirstRecipe({ id: r.id, source: "user", title: r.title ?? "Your recipe", steps: r.steps ?? [], image: r.image_url ?? null });
    } catch {}
    setImportBusy(false);
    next();
  }
  async function addPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const ex = await fetch("/api/recipes/extract-image", { method: "POST", body: fd }).then((r) => r.json());
      if (ex?.recipe) {
        const saved = await fetch("/api/recipes/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ex.recipe) }).then((r) => r.json()).catch(() => null);
        if (saved?.recipe?.id) setFirstRecipe({ id: saved.recipe.id, source: "user", title: ex.recipe.title ?? "Your recipe", steps: ex.recipe.steps ?? [], image: saved.recipe.image_url ?? null });
      }
    } catch {}
    setImportBusy(false);
    next();
  }

  function pickMatchup(winnerId: string) {
    const winners = [...tasteWinners, winnerId];
    if (tasteRound >= TASTE_MATCHUPS.length - 1) {
      seedTaste(winners);
      next();
    } else {
      setTasteWinners(winners);
      setTasteRound(tasteRound + 1);
    }
  }

  // ── Beat content ──
  if (beat === "space") {
    const line = tuscan
      ? "Oh, isn't this lovely? …but we're not ready for this one yet."
      : falling
      ? "whoaaa—! 🍅💫"
      : spaceLine === 0
      ? "A long, long time ago, in a galaxy far, far away…"
      : "…oh — never mind. We'll get there once you've cooked enough. 🚀";
    const showArrow = tuscan || !falling; // no arrow mid-tumble
    const onTap = () => {
      if (tuscan) {
        // Keep dropping: the Tuscan dream slides away downward, revealing the
        // humble starter kitchen beneath — one continuous fall, no hard cut.
        if (leaving) return;
        setLeaving(true);
        window.setTimeout(next, 720);
        return;
      }
      if (falling) return; // ignore taps mid-tumble
      if (spaceLine === 0) {
        setSpaceLine(1);
      } else {
        // Marco gives up on the moon: rocket turns around and free-falls; a
        // gorgeous Tuscan villa rushes up and HOLDS (labeled + a Marco line),
        // then a tap drops him into his humble starter kitchen.
        setFalling(true);
        window.setTimeout(() => setTuscan(true), 1150);
      }
    };
    return (
      <div
        className="min-h-[100dvh] relative overflow-hidden select-none"
        style={{ background: "radial-gradient(130% 100% at 72% 22%, #2c2557 0%, #171233 45%, #0a0818 100%)" }}
      >
        <Starfield />

        {/* Preload the Tuscan villa so its fly-by flash isn't blank the first time */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/kitchen/tuscan-home.png" alt="" aria-hidden style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />

        {/* The lunar kitchen — a warm glow on a far-off moon we never quite reach */}
        <div className="absolute" style={{ right: "22%", top: "13%", width: 88, height: 88 }}>
          <div style={{ position: "absolute", inset: -26, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,214,140,0.38), rgba(255,214,140,0) 70%)" }} />
          <div
            style={{
              width: 88, height: 88, borderRadius: "50%",
              background: "radial-gradient(circle at 34% 30%, #f6ecd0, #dcc79c 68%, #b7a074)",
              boxShadow: "inset -9px -9px 22px rgba(110,84,46,0.45)",
            }}
          />
          {/* a couple of warm windows — a hint of a kitchen, never shown up close */}
          <div className="mk-tw" style={{ position: "absolute", left: 40, top: 44, width: 8, height: 8, borderRadius: 2, background: "#FFD27A", boxShadow: "0 0 9px rgba(255,200,110,0.95)" }} />
          <div className="mk-tw" style={{ position: "absolute", left: 52, top: 50, width: 7, height: 7, borderRadius: 2, background: "#FFD27A", boxShadow: "0 0 8px rgba(255,200,110,0.9)", animationDelay: "1.1s" }} />
          {/* Big zany signpost planted on the moon — locked (you're not ready yet) */}
          <div style={{ position: "absolute", left: "50%", top: 2, transform: "translate(-50%,-100%)", display: "flex", flexDirection: "column", alignItems: "center", whiteSpace: "nowrap" }}>
            <div
              style={{
                transform: "rotate(-6deg)", background: "#FFFDF7", color: INK,
                padding: "9px 16px", borderRadius: 14, border: `2.5px solid ${TOMATO}`,
                boxShadow: "0 8px 24px rgba(0,0,0,0.55)",
                fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 800, fontSize: 22, lineHeight: 1,
              }}
            >
              Lunar Kitchen <span style={{ fontSize: 17 }}>🔒</span>
            </div>
            {/* pole into the moon */}
            <div style={{ width: 5, height: 26, background: "linear-gradient(#d8c7a6,#a9906a)", borderRadius: 2 }} />
          </div>
        </div>

        {/* Rocket with a tiny Marco: climbs toward the moon, then tumbles away */}
        <div className={`absolute ${falling ? "mk-fall" : "mk-rocket"}`} style={{ left: "32%", top: "46%", zIndex: 3 }}>
          <Rocket />
          {/* exhaust streaks trailing DOWN — reads as climbing upward */}
          {!falling && (
            <div className="absolute" style={{ left: 26, top: 112 }} aria-hidden>
              {[0, 1, 2].map((k) => (
                <span
                  key={k}
                  className="mk-streak absolute rounded-full"
                  style={{ left: k * 8, top: 0, width: 2.5, height: 20, background: "linear-gradient(rgba(255,190,110,0), rgba(255,170,90,0.65))", animationDelay: `${k * 0.22}s` }}
                />
              ))}
            </div>
          )}
        </div>

        {/* The humble starter kitchen sits behind, revealed as the Tuscan drops away */}
        {leaving && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src="/kitchen/starter.png" alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" style={{ zIndex: 1 }} />
        )}

        {/* On the fall, a gorgeous Tuscan home rushes up and HOLDS (freeze), then
            keeps dropping down — revealing the starter kitchen beneath. */}
        {falling && (
          <div className={`absolute inset-0 ${leaving ? "mk-villa-out" : "mk-villa-in"}`} style={{ zIndex: 2, transform: "translateY(0) scale(1.04)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/kitchen/tuscan-home.png" alt="A Tuscan home you're not ready for yet" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Tuscan Kitchen label — echoes the Lunar Kitchen sign (locked) */}
        {tuscan && !leaving && (
          <div className="absolute left-0 right-0 flex justify-center mk-fadein" style={{ top: "7%", zIndex: 6 }}>
            <div
              style={{
                transform: "rotate(-5deg)", background: "#FFFDF7", color: INK,
                padding: "9px 16px", borderRadius: 14, border: `2.5px solid ${TOMATO}`,
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)", whiteSpace: "nowrap",
                fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 800, fontSize: 22, lineHeight: 1,
              }}
            >
              Tuscan Kitchen <span style={{ fontSize: 17 }}>🔒</span>
            </div>
          </div>
        )}

        {/* Marco's narration — his bubble, tap to advance (hidden while dropping) */}
        {!leaving && (
          <button
            onClick={onTap}
            className="absolute left-1/2 active:scale-95 transition-transform text-center"
            style={{
              bottom: "13%", transform: "translateX(-50%)", zIndex: 10,
              background: CARD, border: "1.5px solid rgba(229,70,46,0.55)", borderRadius: 20,
              padding: "14px 22px", width: "min(86vw, 340px)",
              fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontSize: 16, lineHeight: 1.3,
              color: INK, boxShadow: "0 14px 34px rgba(0,0,0,0.5)",
            }}
          >
            {line} {showArrow && <span className="not-italic font-bold" style={{ color: TOMATO }}>→</span>}
          </button>
        )}

        <style>{`
          @keyframes mk-rocket { 0%,100%{transform:translate(0,0) rotate(15deg)} 50%{transform:translate(12px,-16px) rotate(15deg)} }
          .mk-rocket { animation: mk-rocket 4.5s ease-in-out infinite; }
          @keyframes mk-fall { 0%{transform:translate(0,0) rotate(15deg)} 18%{transform:translate(-6px,-10px) rotate(-30deg)} 100%{transform:translate(30px,115vh) rotate(560deg)} }
          .mk-fall { animation: mk-fall .95s cubic-bezier(.45,0,.9,.45) forwards; }
          @keyframes mk-villa-in { 0%{transform:translateY(72%) scale(1.18);opacity:0} 30%{opacity:1} 100%{transform:translateY(0) scale(1.04);opacity:1} }
          .mk-villa-in { transform-origin: center 55%; animation: mk-villa-in 1.2s cubic-bezier(.22,.6,.3,1) forwards; }
          @keyframes mk-villa-out { 0%{transform:translateY(0) scale(1.04)} 100%{transform:translateY(106%) scale(1.04)} }
          .mk-villa-out { transform-origin: center 55%; animation: mk-villa-out .72s cubic-bezier(.5,0,.75,.5) forwards; }
          @keyframes mk-fadein { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
          .mk-fadein { animation: mk-fadein .45s ease .1s both; }
          @keyframes mk-streak { 0%{transform:translateY(-4px);opacity:.7} 100%{transform:translateY(30px);opacity:0} }
          .mk-streak { animation: mk-streak .7s linear infinite; }
          @keyframes mk-tw { 0%,100%{opacity:.28} 50%{opacity:1} }
          .mk-tw { animation: mk-tw 3s ease-in-out infinite; }
          @keyframes mk-flame { 0%,100%{transform:scaleY(1);opacity:.9} 50%{transform:scaleY(1.4);opacity:1} }
          .mk-flame { transform-origin: top center; animation: mk-flame .5s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce){ .mk-rocket,.mk-tw,.mk-flame{ animation:none!important } }
        `}</style>
      </div>
    );
  }

  if (beat === "goal") {
    return (
      <Frame beat={beat} question="First — how many days a week do you want to cook?">
        <div className="grid grid-cols-7 gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button
              key={n}
              onClick={() => saveGoal(n)}
              className="flex items-center justify-center active:scale-90 transition-transform"
              style={{
                aspectRatio: "1 / 1",
                borderRadius: 12,
                background: "#FFF",
                border: "1px solid rgba(28,26,23,0.12)",
                boxShadow: "0 1px 3px rgba(28,26,23,0.05)",
                color: INK,
                fontFamily: "var(--font-display, Georgia, serif)",
                fontSize: 17,
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex justify-between mt-2 px-0.5">
          <span style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontSize: 12, color: INK_SOFT }}>Just starting</span>
          <span style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontSize: 12, color: INK_SOFT }}>Every night</span>
        </div>
      </Frame>
    );
  }

  if (beat === "household") {
    return (
      <Frame beat={beat} question="And how many are you usually cooking for?">
        <TrayHint>I&apos;ll size recipes and groceries to match.</TrayHint>
        <div className="grid grid-cols-6 gap-1.5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              onClick={() => saveHousehold(n)}
              className="flex items-center justify-center active:scale-90 transition-transform"
              style={{
                aspectRatio: "1 / 1", borderRadius: 12, background: "#FFF",
                border: "1px solid rgba(28,26,23,0.12)", boxShadow: "0 1px 3px rgba(28,26,23,0.05)",
                color: INK, fontFamily: "var(--font-display, Georgia, serif)", fontSize: 17,
              }}
            >
              {n === 6 ? "6+" : n}
            </button>
          ))}
        </div>
        <div className="flex justify-between mt-2 px-0.5">
          <span style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontSize: 12, color: INK_SOFT }}>Just me</span>
          <span style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontSize: 12, color: INK_SOFT }}>Full table</span>
        </div>
      </Frame>
    );
  }

  if (beat === "allergies") {
    return (
      <Frame beat={beat} question="Any allergies I should cook around?">
        <TrayHint>I&apos;ll keep these out of every suggestion.</TrayHint>
        <ChipSelect options={ALLERGENS.map((a) => ({ id: a, label: a }))} selected={allergies} onToggle={(v) => toggle(setAllergies, v)} />
        <ContinueBtn onClick={saveAllergies}>{allergies.length ? "Continue" : "No allergies — continue"}</ContinueBtn>
      </Frame>
    );
  }

  if (beat === "dietary") {
    return (
      <Frame beat={beat} question="Anything you don't eat?">
        <TrayHint>I&apos;ll flag any recipe that doesn&apos;t fit before you cook it.</TrayHint>
        <ChipSelect options={DIETARY_FILTERS.map((f) => ({ id: f.id, label: f.label }))} selected={dietary} onToggle={(v) => toggle(setDietary, v)} />
        <ContinueBtn onClick={saveDietary}>{dietary.length ? "Continue" : "No restrictions — continue"}</ContinueBtn>
      </Frame>
    );
  }

  if (beat === "import") {
    return (
      <Frame beat={beat} question="Now — let's bring in a recipe you love.">
        <TrayHint>Here&apos;s one to start — or add your own.</TrayHint>
        {/* Seeded recipe — the can't-fail easy default */}
        <div className="flex items-center gap-3 rounded-2xl p-2.5" style={{ background: "#FFF", border: "1px solid rgba(28,26,23,0.08)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={SEED_RECIPE.image_url ?? ""} alt={SEED_RECIPE.title} className="rounded-xl object-cover flex-shrink-0" style={{ width: 54, height: 54 }} />
          <div className="min-w-0 flex-1">
            <p className="truncate" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: 15, color: INK, lineHeight: 1.15 }}>{SEED_RECIPE.title}</p>
            <p style={{ fontSize: 12, color: INK_SOFT }}>A cozy one to break in your kitchen</p>
          </div>
        </div>
        <ContinueBtn onClick={addSeed}>{importBusy ? "Adding…" : "Add this to my kitchen"}</ContinueBtn>

        {/* or bring your own */}
        <div className="flex items-center gap-3 mt-3 mb-2">
          <div className="flex-1" style={{ height: 1, background: "rgba(28,26,23,0.12)" }} />
          <span style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontSize: 12, color: INK_SOFT }}>or add your own</span>
          <div className="flex-1" style={{ height: 1, background: "rgba(28,26,23,0.12)" }} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setShowLink((v) => !v)} className="py-2.5 rounded-xl text-sm font-medium active:scale-95 transition-transform" style={{ background: "#FFF", border: "1px solid rgba(28,26,23,0.14)", color: INK }}>🔗 Paste link</button>
          <button onClick={() => importPhotoRef.current?.click()} className="py-2.5 rounded-xl text-sm font-medium active:scale-95 transition-transform" style={{ background: "#FFF", border: "1px solid rgba(28,26,23,0.14)", color: INK }}>📷 Photo</button>
        </div>
        {showLink && (
          <div className="flex gap-2 mt-2">
            <input
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              placeholder="https://…"
              className="flex-1 px-3 py-2.5 rounded-xl outline-none"
              style={{ background: "#FFF", border: "1px solid rgba(28,26,23,0.14)", fontSize: 14, color: INK }}
            />
            <button onClick={addLink} disabled={importBusy} className="px-4 rounded-xl text-white font-semibold text-sm" style={{ background: TOMATO }}>Add</button>
          </div>
        )}
        <input ref={importPhotoRef} type="file" accept="image/*" className="hidden" onChange={addPhoto} />
      </Frame>
    );
  }

  if (beat === "bookshelf") {
    return (
      <ZoomFrame
        originX={62}
        originY={19}
        scale={2.4}
        line="And that recipe? It just landed on your shelf. A little bare for now — it fills up as you save more."
        onTap={next}
      >
        {/* the recipe they just added, popping onto the shelf board */}
        <div className="absolute mk-bookpop" style={{ left: "50%", top: "36%", zIndex: 4 }}>
          <ShelfBook />
        </div>
        <style>{`
          @keyframes mk-bookpop { 0%{transform:scale(0) translateY(10px);opacity:0} 60%{transform:scale(1.12) translateY(0);opacity:1} 100%{transform:scale(1) translateY(0);opacity:1} }
          .mk-bookpop { transform-origin: bottom center; animation: mk-bookpop .6s cubic-bezier(.34,1.5,.6,1) 1.05s both; }
        `}</style>
      </ZoomFrame>
    );
  }

  if (beat === "cook") {
    const isSeed = !firstRecipe || firstRecipe.title === SEED_RECIPE.title;
    return (
      <GuidedCook
        title={firstRecipe?.title ?? SEED_RECIPE.title}
        steps={firstRecipe?.steps?.length ? firstRecipe.steps : SEED_DETAIL.steps}
        ingredients={isSeed ? SEED_DETAIL.ingredients.map((i) => ({ name: i.name, amount: i.amt, unit: "" })) : []}
        onDone={next}
      />
    );
  }

  if (beat === "sprout") {
    return <SproutReveal recipe={firstRecipe ? { id: firstRecipe.id, source: firstRecipe.source } : null} onDone={next} />;
  }

  if (beat === "taste") {
    const [aId, bId] = TASTE_MATCHUPS[tasteRound];
    const total = TASTE_MATCHUPS.length;
    return (
      <div className="min-h-[100dvh] relative flex flex-col" style={{ background: SHADOW }}>
        {/* Dimmed kitchen behind — Marco "lowers the lights" so the food pops */}
        <div className="absolute inset-0">
          <KitchenScene baseImage="/kitchen/starter.png" herbLevel={0} marcoState="thriving" showMarco={false} interactiveZones={false} />
        </div>
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(26,16,6,0.55), rgba(26,16,6,0.74))" }} />

        {/* Content — the whole group centered vertically */}
        <div
          className="relative flex flex-col justify-center min-h-[100dvh]"
          style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 1rem)", paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 1rem)" }}
        >
          {/* Marco talking — bubble ABOVE him, tail down, Marco tucked right
              above the food (consistent with every other beat). */}
          <div className="px-6 flex flex-col items-center text-center">
            <div
              className="relative"
              style={{
                background: CARD, border: "1.5px solid rgba(229,70,46,0.5)", borderRadius: 18,
                padding: "11px 18px", maxWidth: 320,
                fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontSize: 15.5,
                lineHeight: 1.3, color: INK, boxShadow: "0 10px 24px rgba(0,0,0,0.3)",
              }}
            >
              Getting a feel for your taste — which sounds better?
              <span
                aria-hidden
                className="absolute"
                style={{
                  bottom: -7, left: "50%", transform: "translateX(-50%) rotate(45deg)", width: 14, height: 14,
                  background: CARD, borderBottom: "1.5px solid rgba(229,70,46,0.5)", borderRight: "1.5px solid rgba(229,70,46,0.5)", borderBottomRightRadius: 3,
                }}
              />
            </div>
            <div style={{ marginTop: 8 }}>
              <TomatoMascot state="thriving" size={58} greeting />
            </div>
          </div>

          {/* The two contenders, right below Marco */}
          <div className="mt-3 flex flex-col gap-2.5 px-5">
            <VsCard dish={dishById(aId)} onPick={() => pickMatchup(aId)} />
            <div className="flex items-center justify-center">
              <span style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontSize: 15, color: "#FBEFD9", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>or</span>
            </div>
            <VsCard dish={dishById(bId)} onPick={() => pickMatchup(bId)} />
          </div>

          {/* Round progress */}
          <div className="flex items-center justify-center gap-1.5 mt-6">
            {Array.from({ length: total }).map((_, i) => (
              <span key={i} className="rounded-full" style={{ width: 6, height: 6, background: i <= tasteRound ? TOMATO : "rgba(255,248,235,0.4)" }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Narration beats — bubble is a tappable "→" that advances.
  const line =
    beat === "welcome"
      ? "Welcome to your starter kitchen! First, a little housekeeping…"
      : beat === "handoff"
      ? "Now — here's a real one for whenever you're ready"
      : `[${beat}] — coming next`;
  return <Frame beat={beat} question={line} onTap={next} />;
}

// ── Space cold-open bits ─────────────────────────────────────────────────────
function Starfield() {
  // Deterministic scatter so it's stable across renders (no hydration mismatch).
  const stars = Array.from({ length: 40 }, (_, i) => ({
    left: (i * 41 + 7) % 100,
    top: (i * 27 + 13) % 100,
    s: (i % 3) + 1,
    delay: ((i * 7) % 30) / 10,
  }));
  return (
    <div className="absolute inset-0 pointer-events-none">
      {stars.map((st, i) => (
        <span
          key={i}
          className="mk-tw absolute rounded-full"
          style={{ left: `${st.left}%`, top: `${st.top}%`, width: st.s, height: st.s, background: "#fff", animationDelay: `${st.delay}s` }}
        />
      ))}
    </div>
  );
}

function Rocket() {
  return (
    <svg width="76" height="120" viewBox="0 0 70 112" fill="none" aria-hidden="true">
      {/* flame */}
      <path className="mk-flame" d="M27 92 Q35 116 43 92 Z" fill="#FFB43D" />
      <path className="mk-flame" d="M30 92 Q35 108 40 92 Z" fill="#FF7A2D" />
      {/* fins */}
      <path d="M18 70 L6 92 L18 85 Z" fill="#C23A24" />
      <path d="M52 70 L64 92 L52 85 Z" fill="#C23A24" />
      {/* body */}
      <path d="M35 4 C20 4 18 34 18 58 L18 80 C18 88 24 92 30 92 L40 92 C46 92 52 88 52 80 L52 58 C52 34 50 4 35 4 Z" fill="#F5EFE2" stroke="#D8C7A6" strokeWidth="1.5" />
      {/* nose */}
      <path d="M35 4 C25 4 20 20 19 34 L51 34 C50 20 45 4 35 4 Z" fill="#E5462E" />
      {/* porthole + tiny Marco winking */}
      <circle cx="35" cy="54" r="13" fill="#CFE3EE" stroke="#E5462E" strokeWidth="3" />
      <circle cx="35" cy="55" r="9" fill="#E5462E" />
      <path d="M35 46 q3 -3 5 0" stroke="#5E6E38" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="31.5" cy="54" r="1.6" fill="#1C1A17" />
      <path d="M37 52.5 q2 1.5 0 3" stroke="#1C1A17" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M31 59 q4 3 8 0" stroke="#1C1A17" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ── Camera-zoom beat (reveals a zone in the existing kitchen) ────────────────
function ZoomFrame({
  originX,
  originY,
  scale = 2.2,
  line,
  onTap,
  children,
}: {
  originX: number;
  originY: number;
  scale?: number;
  line: string;
  onTap?: () => void;
  children?: React.ReactNode;
}) {
  const [z, setZ] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => setZ(scale), 40); // push in on mount
    return () => clearTimeout(t);
  }, [scale]);
  return (
    <div className="min-h-[100dvh] relative overflow-hidden select-none" style={{ background: SHADOW }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/kitchen/starter.png"
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transformOrigin: `${originX}% ${originY}%`, transform: `scale(${z})`, transition: "transform 1.1s cubic-bezier(.3,.7,.25,1)" }}
      />
      {/* focus vignette toward the zone */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(62% 46% at ${originX}% ${originY}%, rgba(0,0,0,0) 42%, rgba(16,9,3,0.62) 100%)` }} />
      {children}
      {/* Marco + his bubble */}
      <div className="absolute inset-x-0 bottom-0 px-5 flex flex-col items-center" style={{ paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 2rem)", zIndex: 8 }}>
        <button
          onClick={onTap}
          className="relative active:scale-95 transition-transform text-center"
          style={{
            background: CARD, border: "1.5px solid rgba(229,70,46,0.55)", borderRadius: 20,
            padding: "13px 20px", maxWidth: 320, boxShadow: "0 12px 30px rgba(0,0,0,0.4)",
            fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontSize: 16, lineHeight: 1.3, color: INK,
          }}
        >
          {line} <span className="not-italic font-bold" style={{ color: TOMATO }}>→</span>
          <span
            aria-hidden
            className="absolute"
            style={{ bottom: -7, left: "50%", transform: "translateX(-50%) rotate(45deg)", width: 14, height: 14, background: CARD, borderBottom: "1.5px solid rgba(229,70,46,0.55)", borderRight: "1.5px solid rgba(229,70,46,0.55)", borderBottomRightRadius: 3 }}
          />
        </button>
        <div style={{ marginTop: 8 }}>
          <TomatoMascot state="thriving" size={62} greeting />
        </div>
      </div>
    </div>
  );
}

// Per-step cooking action → an icon + label. Keyword heuristic (mirrors the
// spec's "different action per step" — sauté vs chop vs simmer).
type ActionId = "chop" | "season" | "saute" | "boil" | "simmer" | "roast" | "grill" | "mix" | "plate";
// Order matters: PLATE (finishing verbs, most specific) → COOK verbs → PREP.
// Cook beats prep so "Brown the beef mince" reads Sauté, not Prep (the "mince"
// noun) — same philosophy as stepParser.classifyStepTrack.
const ACTIONS: { id: ActionId; label: string; kw: string[] }[] = [
  { id: "plate", label: "Plate", kw: ["serve", "plate", "divide", "garnish", "top with", "assemble", "drizzle", "sprinkle", "finish with"] },
  { id: "grill", label: "Grill", kw: ["grill", "broil", "char"] },
  { id: "roast", label: "Roast", kw: ["roast", "bake", "oven", "preheat"] },
  { id: "boil", label: "Boil", kw: ["boil", "blanch", "parboil", "poach"] },
  { id: "simmer", label: "Simmer", kw: ["simmer", "stew", "braise", "reduce", "sauce", "deglaze"] },
  { id: "saute", label: "Sauté", kw: ["sauté", "saute", "sear", "brown", "fry", "stir-fry", "cook until", "soften", "cook the", "cook through"] },
  { id: "mix", label: "Mix", kw: ["mix", "stir", "whisk", "combine", "fold", "blend", "mash", "beat"] },
  { id: "season", label: "Season", kw: ["season", "salt", "pepper", "marinate", "rub", "spice", "toss with"] },
  { id: "chop", label: "Prep", kw: ["chop", "dice", "mince", "slice", "cut", "peel", "grate", "julienne"] },
];
function stepAction(text: string): { id: ActionId; label: string } {
  const t = text.toLowerCase();
  for (const a of ACTIONS) if (a.kw.some((k) => t.includes(k))) return a;
  return { id: "mix", label: "Cook" };
}

// Guess the step's main-ingredient colour so the "food" in the animation reads
// as what you're actually cooking (brown beef, pale onion, red tomato…).
function foodColor(text: string): string {
  const t = text.toLowerCase();
  if (/beef|steak|mince|brisket|pork|lamb|bacon|sausage/.test(t)) return "#8B4A2F";
  if (/chicken|turkey|duck/.test(t)) return "#D8A45C";
  if (/salmon|shrimp|prawn|tuna|fish|seafood/.test(t)) return "#E08A5B";
  if (/tomato|pepper|chili|chilli|paprika|sriracha|hot honey/.test(t)) return "#D6452F";
  if (/spinach|herb|cilantro|basil|avocado|lettuce|green|pea|broccoli|kale/.test(t)) return "#6E8B3D";
  if (/egg|honey|corn|cheese|yogurt|cream|potato/.test(t)) return "#E8B84B";
  if (/onion|garlic|rice|dough|flour|bread|tortilla|noodle/.test(t)) return "#E7CF9C";
  return "#C98A54";
}

// Each action is a little LOOPING animation of the technique — a pan sizzling,
// a knife chopping, a pot bubbling, a spoon stirring — with the food tinted by
// the step's ingredient. SVG+CSS only; keyframes live in GuidedCook's <style>.
function ActionIcon({ id, size = 60, tint = "#C98A54" }: { id: ActionId; size?: number; tint?: string }) {
  const p = { fill: "none", stroke: TOMATO, strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const bit = { fill: tint, stroke: "none" };
  const steam = (x: number, d = "0s") => (
    <path className="ai-steam" style={{ animationDelay: d }} d={`M${x} 9c-2-2 2-3 0-5`} stroke={TOMATO} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.55" />
  );
  const inner = (() => {
    switch (id) {
      case "saute": // top-down pan, bits sizzling + steam
        return (<>
          {steam(15, "0s")}{steam(23, ".5s")}
          <circle {...p} cx="18" cy="22" r="11" />
          <path {...p} d="M29 22h9" />
          <circle {...bit} cx="14" cy="21" r="2.3" className="ai-sizzle" style={{ animationDelay: "0s" }} />
          <circle {...bit} cx="20" cy="24" r="2.3" className="ai-sizzle" style={{ animationDelay: ".25s" }} />
          <circle {...bit} cx="22" cy="19" r="1.9" className="ai-sizzle" style={{ animationDelay: ".5s" }} />
        </>);
      case "chop": // knife chopping over a board with pieces
        return (<>
          <path {...p} d="M5 31h30" />
          <circle {...bit} cx="11" cy="28.5" r="2" /><circle {...bit} cx="16" cy="28.5" r="2" /><circle {...bit} cx="21" cy="28.5" r="1.8" />
          <g className="ai-chop">
            <path {...p} d="M15 6l10 10-3 3-10-10z" />
            <path {...p} d="M24 15l5 5" />
          </g>
        </>);
      case "boil": // pot with bubbles rising
        return (<>
          {steam(16, "0s")}{steam(24, ".6s")}
          <path {...p} d="M8 20h24l-2 13a3 3 0 0 1-3 2.6H13a3 3 0 0 1-3-2.6z" />
          <path {...p} d="M6 20h28" />
          <circle {...bit} cx="15" cy="30" r="1.6" className="ai-bubble" style={{ animationDelay: "0s" }} />
          <circle {...bit} cx="21" cy="31" r="1.9" className="ai-bubble" style={{ animationDelay: ".5s" }} />
          <circle {...bit} cx="26" cy="30" r="1.5" className="ai-bubble" style={{ animationDelay: "1s" }} />
        </>);
      case "simmer": // pot, gentle steam + one lazy bubble
        return (<>
          {steam(14, "0s")}{steam(20, ".7s")}{steam(26, "1.3s")}
          <path {...p} d="M8 22h24l-2 11a3 3 0 0 1-3 2.6H13a3 3 0 0 1-3-2.6z" />
          <path {...p} d="M6 22h28" />
          <circle {...bit} cx="20" cy="31" r="1.6" className="ai-bubble" style={{ animationDelay: ".3s" }} />
        </>);
      case "roast": // oven with heat waves
        return (<>
          <rect {...p} x="7" y="9" width="26" height="24" rx="3" />
          <path {...p} d="M7 16h26" /><path {...p} d="M13 12.5h6" />
          <path className="ai-heat" style={{ animationDelay: "0s" }} d="M14 28c-1.5-1.5 1.5-2.5 0-4" stroke={tint} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path className="ai-heat" style={{ animationDelay: ".6s" }} d="M20 28c-1.5-1.5 1.5-2.5 0-4" stroke={tint} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path className="ai-heat" style={{ animationDelay: "1.1s" }} d="M26 28c-1.5-1.5 1.5-2.5 0-4" stroke={tint} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </>);
      case "grill": // grate with heat shimmer
        return (<>
          <path className="ai-heat" style={{ animationDelay: "0s" }} d="M14 12c-1.5-1.5 1.5-2.5 0-4" stroke={tint} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path className="ai-heat" style={{ animationDelay: ".7s" }} d="M26 12c-1.5-1.5 1.5-2.5 0-4" stroke={tint} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <circle {...p} cx="20" cy="24" r="11" />
          <path {...p} d="M13 20h14M13 24h14M13 28h14" />
        </>);
      case "season": // shaker tilting, dots falling
        return (<>
          <g className="ai-shake" style={{ transformBox: "fill-box", transformOrigin: "center bottom" }}>
            <path {...p} d="M14 15h10l-1.2 12a2 2 0 0 1-2 1.8h-3.6a2 2 0 0 1-2-1.8z" />
            <path {...p} d="M15.5 15v-2.5a3.5 3.5 0 0 1 7 0V15" />
            <path {...p} d="M17.5 19.5h4M18 23h3" />
          </g>
          <circle {...bit} cx="12" cy="32" r="1" className="ai-fall" style={{ animationDelay: "0s" }} />
          <circle {...bit} cx="20" cy="34" r="1" className="ai-fall" style={{ animationDelay: ".4s" }} />
          <circle {...bit} cx="27" cy="32" r="1" className="ai-fall" style={{ animationDelay: ".8s" }} />
        </>);
      case "plate": // plated dish with a soft shimmer
        return (<>
          <circle {...p} cx="20" cy="21" r="12" />
          <circle {...p} cx="20" cy="21" r="7.5" opacity="0.5" />
          <circle {...bit} cx="18" cy="20" r="2.2" /><circle {...bit} cx="23" cy="22" r="1.8" />
        </>);
      case "mix":
      default: // bowl with a spoon stirring back and forth
        return (<>
          <path {...p} d="M8 22h24l-3 10a4 4 0 0 1-3.8 3H14.8a4 4 0 0 1-3.8-3z" />
          <ellipse {...p} cx="20" cy="22" rx="12" ry="3" />
          <g className="ai-stir" style={{ transformBox: "fill-box", transformOrigin: "center top" }}>
            <path {...p} d="M22 10l-3 14" />
            <ellipse {...bit} cx="19" cy="25" rx="3" ry="2" />
          </g>
        </>);
    }
  })();
  return (<svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">{inner}</svg>);
}

// The guided cook — a recipe "page" that auto-turns through the steps, each with
// its own cooking-action icon + the tokenized step (ingredient-amount chips,
// timer labels — the CookMode treatment). A demo of the loop; ends on "You made
// it!" which flows into the sprout.
function GuidedCook({ title, steps, ingredients, onDone }: { title: string; steps: string[]; ingredients: Ingredient[]; onDone: () => void }) {
  const list = steps.length ? steps : ["Prep your ingredients.", "Cook everything through.", "Plate it up and dig in."];
  const [i, setI] = useState(0);
  const tracks = classifyAllSteps(list);
  useEffect(() => {
    const t = setTimeout(() => (i >= list.length - 1 ? onDone() : setI((n) => n + 1)), 2600);
    return () => clearTimeout(t);
  }, [i, list.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const tap = () => (i >= list.length - 1 ? onDone() : setI((n) => n + 1));
  const act = stepAction(list[i] ?? "");
  const tokens = parseStep(list[i] ?? "", ingredients);
  const activeTrack = tracks[i];
  const counts = (["prep", "cook", "plate"] as StepTrack[])
    .map((tk) => ({ tk, total: tracks.filter((t) => t === tk).length, done: tracks.filter((t, idx) => t === tk && idx < i).length }))
    .filter((c) => c.total > 0);
  const upNext = i + 1 < list.length ? list[i + 1] : null;
  const stepFont = { fontFamily: "var(--font-display, Georgia, serif)" };
  const mono = { fontFamily: "var(--font-mono, ui-monospace, monospace)" };

  const renderTokens = tokens.map((tok, k) => {
    if (tok.type === "text") return <span key={k}>{tok.content}</span>;
    if (tok.type === "duration") return (<span key={k} className="inline-flex items-center align-baseline mx-1" style={{ fontFamily: "var(--font-sans, system-ui, sans-serif)", fontSize: 13, fontWeight: 600, color: TOMATO, border: `1px solid ${TOMATO}`, borderRadius: 999, padding: "1px 9px", whiteSpace: "nowrap" }}>◷ {tok.label}</span>);
    const amt = [tok.amount, tok.unit].filter(Boolean).join(" ").trim();
    return (<span key={k}>{tok.matchedText}{amt ? <span className="inline-flex items-baseline ml-1.5" style={{ fontFamily: "var(--font-sans, system-ui, sans-serif)", fontSize: 13, fontWeight: 600, background: CREAM_WARM, color: "#B8331E", padding: "1px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>{amt}</span> : null}</span>);
  });

  // ── Following the recipe (CookMode-style) ──
  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: CREAM, paddingTop: "env(safe-area-inset-top,0px)", paddingBottom: "env(safe-area-inset-bottom,0px)" }}>
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5">
        <div className="min-w-0 flex-1">
          <p className="truncate" style={{ ...mono, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: INK_SOFT, opacity: 0.75 }}>{title}</p>
          <p className="mt-1" style={{ ...stepFont, fontStyle: "italic", fontSize: 20, color: INK, lineHeight: 1.1 }}>Step {i + 1} of {list.length}</p>
        </div>
        <div className="flex-shrink-0 ml-2"><TomatoMascot state="thriving" size={40} greeting /></div>
      </div>

      {/* Progress dots */}
      <div className="px-5 mt-4 flex flex-wrap gap-1.5">
        {list.map((_, k) => (
          <span key={k} className="rounded-full" style={{ width: 8, height: 8, background: k <= i ? TOMATO : "transparent", border: `1px solid ${k <= i ? TOMATO : "rgba(28,26,23,0.18)"}` }} />
        ))}
      </div>

      {/* Prep · Cook · Plate track row */}
      {counts.length > 0 && (
        <div className="px-5 mt-3 flex flex-wrap items-center gap-x-3 gap-y-1" style={{ ...mono, fontSize: 10, letterSpacing: "0.13em", textTransform: "uppercase", color: INK_SOFT }}>
          {counts.map((c, idx) => {
            const isCur = activeTrack === c.tk;
            return (
              <span key={c.tk} className="inline-flex items-center gap-2">
                <span style={{ color: isCur ? TOMATO : INK_SOFT, opacity: isCur ? 1 : 0.7 }}>{TRACK_LABELS[c.tk]} <span style={{ opacity: 0.6 }}>{c.done}/{c.total}</span></span>
                {idx < counts.length - 1 && <span aria-hidden style={{ opacity: 0.35 }}>·</span>}
              </span>
            );
          })}
        </div>
      )}

      {/* Completed steps — faded, struck through (last two) */}
      {i > 0 && (
        <div className="px-5 mt-5 space-y-2">
          {list.slice(Math.max(0, i - 2), i).map((s, idx) => (
            <div key={idx} className="flex items-start gap-2" style={{ opacity: 0.42 }}>
              <svg className="w-3.5 h-3.5 flex-shrink-0 mt-1" viewBox="0 0 24 24" fill="none" stroke={LEAF} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
              <p className="text-[13px] leading-tight line-clamp-2" style={{ color: INK_SOFT, textDecoration: "line-through", textDecorationColor: TOMATO }}>{s}</p>
            </div>
          ))}
        </div>
      )}

      {/* Active step card */}
      <button onClick={tap} className="text-left mx-5 mt-5 relative rounded-2xl bg-white active:scale-[0.99] transition-transform" style={{ boxShadow: "0 2px 16px rgba(20,12,5,0.08)", border: "1px solid rgba(28,26,23,0.08)", padding: "18px 20px 18px 22px" }}>
        <div aria-hidden className="absolute top-0 bottom-0 left-0 rounded-l-2xl" style={{ width: 3, background: TOMATO }} />
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center rounded-2xl flex-shrink-0" style={{ width: 54, height: 54, background: "rgba(229,70,46,0.09)" }}>
            <ActionIcon id={act.id} size={40} tint={foodColor(list[i] ?? "")} />
          </div>
          <p style={{ ...mono, fontSize: 10.5, letterSpacing: "0.13em", textTransform: "uppercase", color: TOMATO }}>Now · {act.label}</p>
        </div>
        <p key={i} className="mk-page" style={{ ...stepFont, fontSize: 20, lineHeight: 1.4, color: INK }}>{renderTokens}</p>
        {/* auto-turn progress */}
        <div className="mt-4 rounded-full overflow-hidden" style={{ height: 3, background: "rgba(28,26,23,0.08)" }}>
          <div key={`p${i}`} className="ai-progress" style={{ height: "100%", background: TOMATO }} />
        </div>
      </button>

      {/* Up next */}
      {upNext && (
        <div className="px-5 pt-3">
          <p style={{ ...mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: INK_SOFT, opacity: 0.6 }}>Up next</p>
          <div className="rounded-xl px-3 py-2.5 mt-1.5" style={{ background: CREAM_WARM }}>
            <p className="text-[13px] leading-snug line-clamp-2" style={{ color: INK_SOFT }}>{upNext}</p>
          </div>
        </div>
      )}

      <div className="flex-1" />
      <p className="text-center pb-4" style={{ ...stepFont, fontStyle: "italic", fontSize: 13, color: INK_SOFT }}>Marco&apos;s turning the pages · tap to skip</p>

      <style>{`
        @keyframes mk-page { 0%{opacity:0;transform:translateX(16px)} 100%{opacity:1;transform:translateX(0)} }
        .mk-page { animation: mk-page .4s ease; }
        @keyframes mk-pop2 { 0%{transform:scale(.5);opacity:0} 60%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
        .mk-pop2 { animation: mk-pop2 .5s cubic-bezier(.34,1.5,.6,1) both; }
        @keyframes ai-progress { from{width:0%} to{width:100%} }
        .ai-progress { animation: ai-progress 2.6s linear both; }
        @keyframes ai-sizzle { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
        .ai-sizzle { animation: ai-sizzle .7s ease-in-out infinite; }
        @keyframes ai-steam { 0%{opacity:0;transform:translateY(3px)} 40%{opacity:.6} 100%{opacity:0;transform:translateY(-4px)} }
        .ai-steam { animation: ai-steam 1.8s ease-in-out infinite; }
        @keyframes ai-chop { 0%,45%{transform:translateY(-7px) rotate(-4deg)} 58%{transform:translateY(0) rotate(0)} 72%,100%{transform:translateY(-7px) rotate(-4deg)} }
        .ai-chop { transform-box: fill-box; transform-origin: 70% 20%; animation: ai-chop 1.1s ease-in-out infinite; }
        @keyframes ai-bubble { 0%{transform:translateY(4px) scale(.4);opacity:0} 30%{opacity:1} 100%{transform:translateY(-8px) scale(1);opacity:0} }
        .ai-bubble { animation: ai-bubble 1.6s ease-in infinite; }
        @keyframes ai-heat { 0%{opacity:0;transform:translateY(3px)} 45%{opacity:.7} 100%{opacity:0;transform:translateY(-4px)} }
        .ai-heat { animation: ai-heat 1.6s ease-in-out infinite; }
        @keyframes ai-shake { 0%,100%{transform:rotate(-12deg)} 50%{transform:rotate(12deg)} }
        .ai-shake { animation: ai-shake .5s ease-in-out infinite; }
        @keyframes ai-fall { 0%{opacity:0;transform:translateY(-6px)} 30%{opacity:1} 100%{opacity:0;transform:translateY(6px)} }
        .ai-fall { animation: ai-fall 1s ease-in infinite; }
        @keyframes ai-stir { 0%,100%{transform:rotate(-16deg)} 50%{transform:rotate(16deg)} }
        .ai-stir { animation: ai-stir 1.1s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce){ .ai-sizzle,.ai-steam,.ai-chop,.ai-bubble,.ai-heat,.ai-shake,.ai-fall,.ai-stir{ animation:none!important } }
      `}</style>
    </div>
  );
}

// The payoff — zoom to the windowsill, fire the GENUINE completion (writes herb
// 0→1 + first skills via /api/cook/complete), grow the herb, and have Marco name
// the skill you gained + the garden waking up.
function SproutReveal({ recipe, onDone }: { recipe: { id: string; source: "user" | "catalog" } | null; onDone: () => void }) {
  const [skill, setSkill] = useState<string | null>(null);
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/cook/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipeId: recipe?.id, recipeSource: recipe?.source ?? "user" }),
        });
        const data = res.ok ? await res.json() : null;
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const g = (data?.gains as any[])?.find((x) => x?.leveledUp)?.label ?? (data?.gains as any[])?.[0]?.label ?? null;
        if (alive) setSkill(g);
      } catch {}
    })();
    const t = setTimeout(() => alive && setGrown(true), 900);
    return () => { alive = false; clearTimeout(t); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const line = skill
    ? `Nice job cooking! You've started your ${skill} — and look, your herb garden's coming to life. Keep cooking and adding recipes, and it'll flourish 🌱`
    : "Nice job cooking! Look — something's coming to life on your windowsill…";
  return (
    <ZoomFrame originX={14} originY={31} scale={2.7} line={line} onTap={onDone}>
      <div className="absolute" style={{ left: "12%", top: "37%", zIndex: 4 }}>
        <HerbSprout grown={grown} />
      </div>
    </ZoomFrame>
  );
}

function HerbSprout({ grown }: { grown: boolean }) {
  return (
    <div className={`relative ${grown ? "hs-place" : "hs-pre"}`} style={{ width: 96, height: 120 }}>
      <div className={grown ? "hs-glow" : ""} style={{ position: "absolute", inset: -22, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,222,140,0.55), rgba(255,222,140,0) 70%)", opacity: grown ? 1 : 0, transition: "opacity .6s" }} />
      <svg width="96" height="120" viewBox="0 0 60 76" style={{ position: "relative" }} aria-hidden="true">
        <path d="M18 58 h24 l-3 14 a3 3 0 0 1 -3 2.5 h-12 a3 3 0 0 1 -3 -2.5 z" fill="#B9895A" />
        <path d="M17 56 h26 l-1.6 5 h-22.8 z" fill="#A0703F" />
        <g className={grown ? "hs-grow" : "hs-seed"} style={{ transformBox: "fill-box", transformOrigin: "center bottom" }}>
          <path d="M30 58 q-6 -18 -2 -30" stroke={LEAF} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M30 58 q6 -14 2 -26" stroke="#6E7E44" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <ellipse cx="24" cy="34" rx="5" ry="8" fill={LEAF} transform="rotate(-30 24 34)" />
          <ellipse cx="34" cy="38" rx="5" ry="8" fill="#6E7E44" transform="rotate(28 34 38)" />
          <ellipse cx="28" cy="26" rx="4.5" ry="7" fill="#7E8E4E" />
        </g>
      </svg>
      {grown && [0, 1, 2].map((k) => (
        <span key={k} className="hs-spark" style={{ position: "absolute", left: `${18 + k * 30}%`, top: `${8 + k * 12}%`, fontSize: 13, animationDelay: `${k * 0.25}s` }}>✨</span>
      ))}
      <style>{`
        .hs-pre { opacity: 0; }
        @keyframes hs-place { 0%{transform:translateY(-36px);opacity:0} 16%{transform:translateY(-36px);opacity:1} 34%{transform:translateY(-28px)} 52%{transform:translateY(-35px)} 100%{transform:translateY(0)} }
        .hs-place { animation: hs-place 2.3s cubic-bezier(.4,0,.3,1) both; }
        .hs-seed { transform: scaleY(.05); opacity: 0; }
        @keyframes hs-grow { 0%{transform:scaleY(.05) scaleX(.5);opacity:0} 55%{opacity:1} 80%{transform:scaleY(1.06) scaleX(1)} 100%{transform:scaleY(1) scaleX(1);opacity:1} }
        .hs-grow { animation: hs-grow 1.1s cubic-bezier(.3,1.25,.5,1) forwards; }
        @keyframes hs-glow { 0%,100%{opacity:.7} 50%{opacity:1} }
        .hs-glow { animation: hs-glow 2.4s ease-in-out infinite; }
        @keyframes hs-spark { 0%{opacity:0;transform:scale(.4)} 40%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(.6) translateY(-7px)} }
        .hs-spark { animation: hs-spark 1.5s ease-out infinite; }
        @media (prefers-reduced-motion: reduce){ .hs-grow,.hs-glow,.hs-spark{ animation:none!important } .hs-seed{ transform:none;opacity:1 } }
      `}</style>
    </div>
  );
}

// A little cookbook standing on the shelf — the user's first saved recipe.
function ShelfBook() {
  return (
    <div style={{ filter: "drop-shadow(0 7px 11px rgba(0,0,0,0.5))" }}>
      <svg width="86" height="126" viewBox="0 0 38 56" fill="none" aria-hidden="true">
        <rect x="5" y="2" width="28" height="54" rx="3" fill="#E5462E" />
        <rect x="5" y="2" width="5" height="54" fill="#B8331E" />
        <rect x="14" y="10" width="15" height="3" rx="1.5" fill="#FBE7CE" />
        <rect x="14" y="16" width="11" height="2.5" rx="1.25" fill="#FBE7CE" opacity="0.85" />
        <circle cx="21" cy="37" r="6" fill="#FBE7CE" />
        <path d="M21 33.5 q2.5 -1.5 4 0" stroke="#5E6E38" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// ── Taste "this or that" card ────────────────────────────────────────────────
function VsCard({ dish, onPick }: { dish: { title: string; image: string }; onPick: () => void }) {
  return (
    <button
      onClick={onPick}
      className="relative w-full rounded-2xl overflow-hidden active:scale-[0.98] transition-transform text-left"
      style={{ border: "2.5px solid rgba(255,255,255,0.15)", boxShadow: "0 10px 26px rgba(0,0,0,0.4)" }}
    >
      <div style={{ aspectRatio: "16 / 9", background: "#E5D5B0" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dish.image} alt={dish.title} className="w-full h-full object-cover" />
      </div>
      {/* title on a gradient so it reads over any photo */}
      <div className="absolute inset-x-0 bottom-0 px-4 pt-8 pb-3" style={{ background: "linear-gradient(to top, rgba(20,12,4,0.82), rgba(20,12,4,0))" }}>
        <p style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: 18, color: "#fff", lineHeight: 1.15, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>{dish.title}</p>
      </div>
    </button>
  );
}

// ── Tray building blocks (question beats) ────────────────────────────────────
function TrayHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center mb-3" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontSize: 13, color: INK_SOFT }}>
      {children}
    </p>
  );
}

function ChipSelect({
  options,
  selected,
  onToggle,
}: {
  options: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {options.map((o) => {
        const on = selected.includes(o.id);
        return (
          <button
            key={o.id}
            onClick={() => onToggle(o.id)}
            className="px-3.5 py-2 rounded-full transition-all active:scale-95"
            style={{
              background: on ? TOMATO : "#FFF",
              color: on ? "#FFF" : INK,
              border: `1.5px solid ${on ? TOMATO : "rgba(28,26,23,0.14)"}`,
              boxShadow: on ? "none" : "0 1px 2px rgba(28,26,23,0.05)",
              fontFamily: "var(--font-display, Georgia, serif)",
              fontSize: 14,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ContinueBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full mt-4 py-3.5 rounded-2xl text-white font-semibold active:scale-[0.99] transition-transform"
      style={{ background: TOMATO, boxShadow: "0 6px 18px rgba(229,70,46,0.28)" }}
    >
      {children}
    </button>
  );
}

// ── Shared in-kitchen frame ──────────────────────────────────────────────────
// Kitchen backdrop + Marco with a speech bubble. If `onTap` is set the bubble is
// a button that advances (narration). If `children` are passed they render on a
// warm answer tray rising from the floor (a question beat).
function Frame({
  beat,
  question,
  onTap,
  children,
}: {
  beat: Beat;
  question: string;
  onTap?: () => void;
  children?: React.ReactNode;
}) {
  const bubbleStyle: React.CSSProperties = {
    background: CARD,
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
  };
  const bubbleInner = (
    <>
      {question} {onTap && <span className="not-italic font-bold" style={{ color: TOMATO }}>→</span>}
      <span
        aria-hidden
        className="absolute"
        style={{
          bottom: -7,
          left: "50%",
          transform: "translateX(-50%) rotate(45deg)",
          width: 14,
          height: 14,
          background: CARD,
          borderBottom: "1.5px solid rgba(229,70,46,0.55)",
          borderRight: "1.5px solid rgba(229,70,46,0.55)",
          borderBottomRightRadius: 3,
        }}
      />
    </>
  );
  const bubble = onTap ? (
    <button onClick={onTap} className="relative text-center active:scale-95 transition-transform" style={bubbleStyle}>
      {bubbleInner}
    </button>
  ) : (
    <div className="relative text-center" style={bubbleStyle}>
      {bubbleInner}
    </div>
  );

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: SHADOW }}>
      <div className="relative isolate flex-1 flex flex-col">
        <div className="absolute inset-0 -z-10">
          <KitchenScene
            baseImage="/kitchen/starter.png"
            herbLevel={beat === "sprout" || beat === "handoff" ? 1 : 0}
            celebrateHerb={beat === "sprout"}
            marcoState="thriving"
            showMarco={false}
            interactiveZones={false}
          />
        </div>

        <div className="flex-1" />

        {/* Marco + his bubble (bubble above, tail down — one connected unit) */}
        <div className="px-5 flex flex-col items-center" style={{ paddingBottom: children ? 12 : "calc(env(safe-area-inset-bottom,0px) + 2rem)" }}>
          {bubble}
          <div style={{ marginTop: 8 }}>
            <TomatoMascot state="thriving" size={children ? 66 : 78} greeting />
          </div>
        </div>

        {/* Answer tray (question beats only) — rises from the floor, kitchen stays behind */}
        {children && (
          <div
            style={{
              background: "rgba(251,243,230,0.97)",
              backdropFilter: "blur(8px)",
              borderTop: "1px solid rgba(120,80,40,0.18)",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              boxShadow: "0 -10px 30px rgba(40,22,6,0.18)",
              padding: "18px 20px calc(env(safe-area-inset-bottom,0px) + 22px)",
            }}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
