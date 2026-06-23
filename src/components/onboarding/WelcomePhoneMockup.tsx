"use client";

/* The welcome-screen phone. Shows one of three Marco screens — Save
   recipes, Create a meal plan, Generate a grocery list — driven by the `screen`
   prop so it stays in sync with the rotating headline. Each screen staggers in
   and pops a handwritten sticker. */

const INGREDIENTS = [
  { emoji: "🍝", amount: "1 pack", name: "tortellini" },
  { emoji: "🍄", amount: "250 g", name: "chestnut mushrooms" },
  { emoji: "🧅", amount: "1", name: "shallot, diced" },
  { emoji: "🧄", amount: "4 cloves", name: "garlic" },
  { emoji: "🌿", amount: "1 tsp", name: "Italian herbs" },
  { emoji: "🥣", amount: "700 ml", name: "vegetable stock" },
  { emoji: "🧀", amount: "2 tbsp", name: "cream cheese" },
] as const;

const PLAN_DAYS = [
  { day: "MON", title: "Creamy Pork Stew", type: "Dinner", img: "/onboarding/recipes/245361-creamy-pork-stew-Beauty-4x3-a56080e9b5a4462a8dad0a7661f6d1f4.jpg" },
  { day: "TUE", title: "Mapo Tofu", type: "Dinner", img: "/onboarding/recipes/mapo-tofu.jpg" },
  { day: "WED", title: "Chicken Shawarma", type: "Lunch", img: "/onboarding/recipes/Chicken-Shawarma-8.jpg" },
  { day: "THU", title: "Shrimp Scampi", type: "Dinner", img: "/onboarding/recipes/shrimp scampi.jpg" },
] as const;

const GROCERIES: { section: string; emoji: string; items: { name: string; qty: string; done?: boolean }[] }[] = [
  { section: "Produce", emoji: "🥬", items: [{ name: "Shallots", qty: "2", done: true }, { name: "Garlic", qty: "1 head" }, { name: "Fresh basil", qty: "1 bunch" }] },
  { section: "Dairy", emoji: "🧀", items: [{ name: "Cream cheese", qty: "1 tub", done: true }, { name: "Parmesan", qty: "100 g" }] },
];

const HOUSEHOLD = [
  { initial: "Y", name: "You", note: "Owner", color: "#E5462E" },
  { initial: "S", name: "Sam", note: "Cooking Tue · Thu", color: "#3E7C59" },
  { initial: "M", name: "Mia", note: "On groceries", color: "#C98A2B" },
  { initial: "J", name: "Jess", note: "Invited", color: "#6B5BD2" },
] as const;

const DISCOVER = [
  { title: "Buffalo Wings", img: "/onboarding/recipes/buffalowings.jpg", rating: "4.9" },
  { title: "Lamb Biryani", img: "/onboarding/recipes/lamb-biryani-83e5c3d.jpg", rating: "4.8" },
  { title: "Salmon Teriyaki", img: "/onboarding/recipes/salmon terriyaki.jpg", rating: "4.7" },
  { title: "Smoked Brisket", img: "/onboarding/recipes/smoked-brisket.jpg", rating: "5.0" },
] as const;

const STICKERS = ["Save Recipes", "Auto-planned", "Cash back", "In sync", "For you"] as const;
const STICKER_DELAY = [1.35, 1.0, 1.05, 1.05, 1.05];

const labelMono = {
  fontFamily: "var(--font-mono, monospace)",
  textTransform: "uppercase" as const,
  color: "var(--ink-soft, #4A4742)",
};

export default function WelcomePhoneMockup({ screen = 0, showSticker = false }: { screen?: number; showSticker?: boolean }) {
  const idx = ((screen % 5) + 5) % 5;

  return (
    <div className="relative mx-auto h-full" style={{ aspectRatio: "186 / 380", maxWidth: "100%" }}>
      {/* Soft glow puddle behind the phone */}
      <div
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2"
        style={{ bottom: "-4%", width: "118%", height: "30%", background: "radial-gradient(ellipse at center, rgba(28,26,23,0.18) 0%, rgba(28,26,23,0) 70%)", filter: "blur(6px)" }}
      />

      {/* Phone bezel */}
      <div
        className="relative h-full w-full overflow-hidden"
        style={{ borderRadius: "40px", background: "#1C1A17", padding: "8px", boxShadow: "0 22px 50px -12px rgba(28,26,23,0.45), 0 0 0 2px rgba(28,26,23,0.9), inset 0 0 0 1px rgba(255,255,255,0.08)" }}
      >
        {/* Screen */}
        <div className="relative h-full w-full overflow-hidden" style={{ borderRadius: "33px", background: "#F5EEE2" }}>
          {/* Dynamic island */}
          <div aria-hidden className="absolute left-1/2 -translate-x-1/2 z-20" style={{ top: "9px", width: "32%", height: "16px", background: "#1C1A17", borderRadius: "100px" }} />

          {/* Active screen — remounts on change so it fades + staggers in */}
          <div key={idx} className="absolute inset-0" style={{ animation: "welcome-screen-in 0.45s ease both" }}>
            {idx === 0 ? <RecipeScreen /> : idx === 1 ? <MealPlanScreen /> : idx === 2 ? <GroceryScreen /> : idx === 3 ? <HouseholdScreen /> : <DiscoverScreen />}
          </div>
        </div>
      </div>

      {/* Per-screen sticker */}
      {showSticker && STICKERS[idx] && (
        <div
          key={`sticker-${idx}`}
          className="absolute z-30"
          style={{ left: "50%", bottom: "16%", transform: "translateX(-50%) rotate(-7deg)", animation: `welcome-sticker-pop 0.55s cubic-bezier(0.34,1.56,0.64,1) ${STICKER_DELAY[idx]}s both` }}
        >
          <span
            className="block whitespace-nowrap"
            style={{ fontFamily: "var(--font-script, 'Caveat', cursive)", fontWeight: 700, fontSize: "clamp(20px, 6.2vw, 30px)", lineHeight: 1, color: "#F5EEE2", background: "var(--tomato, #E5462E)", padding: "8px 18px 10px", borderRadius: "14px", boxShadow: "0 8px 20px -6px rgba(229,70,46,0.6)" }}
          >
            {STICKERS[idx]}
          </span>
        </div>
      )}

      <style>{`
        @keyframes welcome-sticker-pop {
          0%   { opacity: 0; transform: translateX(-50%) rotate(-7deg) scale(0.4); }
          70%  { opacity: 1; transform: translateX(-50%) rotate(-7deg) scale(1.08); }
          100% { opacity: 1; transform: translateX(-50%) rotate(-7deg) scale(1); }
        }
        @keyframes welcome-screen-in {
          0%   { opacity: 0; transform: scale(0.985); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

/* ── Screen 1 — Save recipes ─────────────────────────────────────────────── */
function RecipeScreen() {
  return (
    <div className="flex h-full w-full flex-col" style={{ paddingTop: "34px" }}>
      <div className="flex items-center justify-between px-4 pb-2">
        <span className="marco-signature" style={{ fontSize: "1.05rem" }}>Marco</span>
        <span style={{ ...labelMono, fontSize: "8px", letterSpacing: "0.18em" }}>Imported</span>
      </div>

      <div className="px-4 pb-2.5 animate-stagger-in" style={{ animationDelay: "0.05s" }}>
        <p style={{ ...labelMono, fontSize: "7.5px", letterSpacing: "0.22em", color: "var(--tomato, #E5462E)", marginBottom: "3px" }}>25 min · serves 4</p>
        <h3 style={{ fontFamily: "var(--font-display, Georgia, serif)", fontVariationSettings: '"opsz" 40, "wght" 600', fontSize: "19px", lineHeight: 1.05, letterSpacing: "-0.01em", color: "var(--ink, #1C1A17)" }}>
          Creamy Tortellini Soup
        </h3>
      </div>

      <div className="mx-4" style={{ height: "1px", background: "rgba(28,26,23,0.1)" }} />

      <p className="px-4 pt-2.5 pb-1 animate-stagger-in" style={{ animationDelay: "0.18s", ...labelMono, fontSize: "8px", letterSpacing: "0.2em" }}>Ingredients</p>

      <div className="flex-1 overflow-hidden px-4">
        {INGREDIENTS.map((ing, i) => (
          <div key={ing.name} className="flex items-center gap-2.5 animate-stagger-in" style={{ paddingTop: "6.5px", paddingBottom: "6.5px", animationDelay: `${0.35 + i * 0.11}s` }}>
            <span className="flex items-center justify-center flex-shrink-0" style={{ width: "22px", height: "22px", fontSize: "12px", background: "rgba(255,253,247,0.8)", borderRadius: "50%", boxShadow: "0 1px 2px rgba(28,26,23,0.08)" }}>{ing.emoji}</span>
            <span style={{ fontFamily: "var(--font-display, Georgia, serif)", fontVariationSettings: '"opsz" 14, "wght" 450', fontSize: "11.5px", lineHeight: 1.2, color: "var(--ink, #1C1A17)" }}>
              <strong style={{ fontVariationSettings: '"wght" 650' }}>{ing.amount}</strong> {ing.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Screen 2 — Create a meal plan ───────────────────────────────────────── */
function MealPlanScreen() {
  return (
    <div className="flex h-full w-full flex-col" style={{ paddingTop: "34px" }}>
      <div className="flex items-center justify-between px-4 pb-2">
        <span className="marco-signature" style={{ fontSize: "1.05rem" }}>Marco</span>
        <span style={{ ...labelMono, fontSize: "8px", letterSpacing: "0.18em" }}>This week</span>
      </div>

      <div className="px-4 pb-2.5 animate-stagger-in" style={{ animationDelay: "0.05s" }}>
        <p style={{ ...labelMono, fontSize: "7.5px", letterSpacing: "0.22em", color: "var(--tomato, #E5462E)", marginBottom: "3px" }}>Jun 16 – 22</p>
        <h3 style={{ fontFamily: "var(--font-display, Georgia, serif)", fontVariationSettings: '"opsz" 40, "wght" 600', fontSize: "19px", lineHeight: 1.05, letterSpacing: "-0.01em", color: "var(--ink, #1C1A17)" }}>
          Your meal plan
        </h3>
      </div>

      <div className="mx-4" style={{ height: "1px", background: "rgba(28,26,23,0.1)" }} />

      <div className="flex-1 overflow-hidden px-3 pt-2 flex flex-col gap-1.5">
        {PLAN_DAYS.map((d, i) => (
          <div
            key={d.day}
            className="flex items-center gap-2 animate-stagger-in"
            style={{ padding: "5px 6px", borderRadius: "10px", background: "#FFFFFF", boxShadow: "0 1px 2px rgba(28,26,23,0.05)", animationDelay: `${0.25 + i * 0.12}s` }}
          >
            <div className="relative flex-shrink-0 overflow-hidden" style={{ width: "26px", height: "26px", borderRadius: "7px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={encodeURI(d.img)} alt={d.title} referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontVariationSettings: '"opsz" 14, "wght" 550', fontSize: "11px", lineHeight: 1.15, color: "var(--ink, #1C1A17)" }}>{d.title}</p>
              <p style={{ ...labelMono, fontSize: "6.5px", letterSpacing: "0.1em", marginTop: "1px" }}>{d.type}</p>
            </div>
            <span style={{ ...labelMono, fontSize: "7px", letterSpacing: "0.08em", color: "var(--tomato, #E5462E)", background: "rgba(229,70,46,0.1)", padding: "2px 5px", borderRadius: "5px" }}>{d.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Screen 4 — Coordinate with your household ───────────────────────────── */
function HouseholdScreen() {
  return (
    <div className="flex h-full w-full flex-col" style={{ paddingTop: "34px" }}>
      <div className="flex items-center justify-between px-4 pb-2">
        <span className="marco-signature" style={{ fontSize: "1.05rem" }}>Marco</span>
        <span style={{ ...labelMono, fontSize: "8px", letterSpacing: "0.18em" }}>Household</span>
      </div>

      <div className="px-4 pb-2.5 animate-stagger-in" style={{ animationDelay: "0.05s" }}>
        <p style={{ ...labelMono, fontSize: "7.5px", letterSpacing: "0.22em", color: "var(--tomato, #E5462E)", marginBottom: "3px" }}>4 members · in sync</p>
        <h3 style={{ fontFamily: "var(--font-display, Georgia, serif)", fontVariationSettings: '"opsz" 40, "wght" 600', fontSize: "19px", lineHeight: 1.05, letterSpacing: "-0.01em", color: "var(--ink, #1C1A17)" }}>
          The Warren Kitchen
        </h3>
      </div>

      <div className="mx-4" style={{ height: "1px", background: "rgba(28,26,23,0.1)" }} />

      {/* Overlapping avatar stack */}
      <div className="px-4 pt-3 pb-1 flex items-center animate-stagger-in" style={{ animationDelay: "0.15s" }}>
        {HOUSEHOLD.map((m, i) => (
          <span
            key={m.name}
            className="flex items-center justify-center flex-shrink-0"
            style={{ width: "26px", height: "26px", borderRadius: "50%", background: m.color, color: "#FFFDF7", fontFamily: "var(--font-mono, monospace)", fontSize: "10px", fontWeight: 600, marginLeft: i === 0 ? 0 : "-7px", border: "2px solid #F5EEE2", zIndex: HOUSEHOLD.length - i }}
          >
            {m.initial}
          </span>
        ))}
        <span className="ml-auto" style={{ ...labelMono, fontSize: "7px", letterSpacing: "0.1em", color: "var(--tomato, #E5462E)", background: "rgba(229,70,46,0.1)", padding: "3px 7px", borderRadius: "6px" }}>+ Invite</span>
      </div>

      <div className="flex-1 overflow-hidden px-3 pt-2 flex flex-col gap-1.5">
        {HOUSEHOLD.map((m, i) => (
          <div
            key={m.name}
            className="flex items-center gap-2 animate-stagger-in"
            style={{ padding: "5px 6px", borderRadius: "10px", background: "#FFFFFF", boxShadow: "0 1px 2px rgba(28,26,23,0.05)", animationDelay: `${0.25 + i * 0.12}s` }}
          >
            <span className="flex items-center justify-center flex-shrink-0" style={{ width: "24px", height: "24px", borderRadius: "50%", background: m.color, color: "#FFFDF7", fontFamily: "var(--font-mono, monospace)", fontSize: "9.5px", fontWeight: 600 }}>{m.initial}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontVariationSettings: '"opsz" 14, "wght" 550', fontSize: "11px", lineHeight: 1.15, color: "var(--ink, #1C1A17)" }}>{m.name}</p>
              <p style={{ ...labelMono, fontSize: "6.5px", letterSpacing: "0.08em", marginTop: "1px" }}>{m.note}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Screen 5 — Get inspired (Discover) ──────────────────────────────────── */
function DiscoverScreen() {
  return (
    <div className="flex h-full w-full flex-col" style={{ paddingTop: "34px" }}>
      <div className="flex items-center justify-between px-4 pb-2">
        <span className="marco-signature" style={{ fontSize: "1.05rem" }}>Marco</span>
        <span style={{ ...labelMono, fontSize: "8px", letterSpacing: "0.18em" }}>Discover</span>
      </div>

      {/* Search pill */}
      <div className="px-4 pb-2 animate-stagger-in" style={{ animationDelay: "0.05s" }}>
        <div className="flex items-center gap-1.5" style={{ background: "#FFFFFF", borderRadius: "9px", padding: "6px 9px", boxShadow: "0 1px 2px rgba(28,26,23,0.05)" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--ink-soft, #4A4742)" strokeWidth={2.2} strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <span style={{ fontFamily: "var(--font-display, Georgia, serif)", fontVariationSettings: '"opsz" 14, "wght" 450', fontSize: "10px", color: "var(--ink-soft, #4A4742)" }}>Search 10,000+ recipes</span>
        </div>
      </div>

      <p className="px-4 pt-1 pb-1.5 animate-stagger-in" style={{ animationDelay: "0.15s", ...labelMono, fontSize: "8px", letterSpacing: "0.2em" }}>Trending now</p>

      <div className="flex-1 overflow-hidden px-3 grid grid-cols-2 gap-2 content-start">
        {DISCOVER.map((d, i) => (
          <div
            key={d.title}
            className="relative overflow-hidden animate-stagger-in"
            style={{ aspectRatio: "1 / 1", borderRadius: "11px", boxShadow: "0 2px 5px rgba(28,26,23,0.1)", animationDelay: `${0.22 + i * 0.1}s` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={encodeURI(d.img)} alt={d.title} referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
            <span className="absolute flex items-center gap-0.5" style={{ top: "5px", right: "5px", background: "rgba(255,253,247,0.92)", borderRadius: "100px", padding: "2px 5px" }}>
              <svg width="7" height="7" viewBox="0 0 24 24" fill="var(--tomato, #E5462E)"><path d="M12 2l3 6.5 7 .6-5.3 4.6 1.6 6.8L12 17l-6.9 4.1 1.6-6.8L1.4 9.1l7-.6z" /></svg>
              <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "6.5px", fontWeight: 600, color: "var(--ink, #1C1A17)" }}>{d.rating}</span>
            </span>
            <div className="absolute inset-x-0 bottom-0" style={{ padding: "10px 7px 5px", background: "linear-gradient(to top, rgba(28,26,23,0.78), rgba(28,26,23,0))" }}>
              <p className="truncate" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontVariationSettings: '"opsz" 14, "wght" 600', fontSize: "9.5px", color: "#FFFDF7" }}>{d.title}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Screen 3 — Generate a grocery list ──────────────────────────────────── */
function GroceryScreen() {
  let row = 0;
  return (
    <div className="flex h-full w-full flex-col" style={{ paddingTop: "34px" }}>
      <div className="flex items-center justify-between px-4 pb-2">
        <span className="marco-signature" style={{ fontSize: "1.05rem" }}>Marco</span>
        <span style={{ ...labelMono, fontSize: "8px", letterSpacing: "0.18em" }}>Groceries</span>
      </div>

      <div className="px-4 pb-2 animate-stagger-in" style={{ animationDelay: "0.05s" }}>
        <h3 style={{ fontFamily: "var(--font-display, Georgia, serif)", fontVariationSettings: '"opsz" 40, "wght" 600', fontSize: "19px", lineHeight: 1.05, letterSpacing: "-0.01em", color: "var(--ink, #1C1A17)" }}>
          Grocery list
        </h3>
        <span className="inline-block mt-1.5" style={{ ...labelMono, fontSize: "6.5px", letterSpacing: "0.1em", color: "var(--tomato, #E5462E)", background: "rgba(229,70,46,0.1)", padding: "2px 6px", borderRadius: "5px" }}>Auto-added from your plan</span>
      </div>

      <div className="flex-1 overflow-hidden px-4 pt-1 flex flex-col gap-2">
        {GROCERIES.map((sec) => (
          <div key={sec.section}>
            <p className="mb-1 flex items-center gap-1" style={{ ...labelMono, fontSize: "7px", letterSpacing: "0.14em" }}>
              <span style={{ fontSize: "9px" }}>{sec.emoji}</span> {sec.section}
            </p>
            <div style={{ background: "#FFFFFF", borderRadius: "9px", overflow: "hidden", boxShadow: "0 1px 2px rgba(28,26,23,0.04)" }}>
              {sec.items.map((it, j) => {
                row += 1;
                return (
                  <div
                    key={it.name}
                    className="flex items-center gap-2 px-2 animate-stagger-in"
                    style={{ paddingTop: "5px", paddingBottom: "5px", borderTop: j === 0 ? "none" : "1px solid rgba(28,26,23,0.05)", animationDelay: `${0.2 + row * 0.08}s` }}
                  >
                    <span className="flex items-center justify-center flex-shrink-0" style={{ width: "12px", height: "12px", borderRadius: "4px", background: it.done ? "var(--tomato, #E5462E)" : "transparent", border: it.done ? "none" : "1.5px solid rgba(28,26,23,0.25)" }}>
                      {it.done && (
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                      )}
                    </span>
                    <span className="flex-1 truncate" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontVariationSettings: '"opsz" 14, "wght" 450', fontSize: "10.5px", color: it.done ? "var(--ink-soft, #4A4742)" : "var(--ink, #1C1A17)", textDecoration: it.done ? "line-through" : "none" }}>{it.name}</span>
                    <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "8px", color: "var(--ink-soft, #4A4742)" }}>{it.qty}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
