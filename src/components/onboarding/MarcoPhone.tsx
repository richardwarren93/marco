"use client";

/* The onboarding phone — renders Marco's ACTUAL surfaces (beautiful-chaos:
   dotted cream, Marker Felt, ink borders, taped polaroids) at phone scale, so
   the showcase looks like the real app. Screens map to the five value props:
   save (react in a group chat), plan/grocery + planText, cook goals
   (cookText/goal), the Table feed, and the Beli-style compare + taste profile. */

import TomatoMascot from "@/components/gamification/TomatoMascot";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const LIME = "#C4EE45";
const PINK = "#FF4D9D";
const BUTTER = "#FFD84D";
const LAV = "#C9B8FF";
const COBALT = "#2540E8";
const DISP = '"Marker Felt", Georgia, serif';
const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
const SANS = "system-ui, -apple-system, sans-serif";
const MONO = "ui-monospace, monospace";
const DOTS = "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)";
const img = (p: string) => encodeURI(p);

export type MarcoScreen = "save" | "planText" | "plan" | "grocery" | "cookText" | "goal" | "feed" | "compare" | "taste";

export default function MarcoPhone({ screen = "feed" }: { screen?: MarcoScreen }) {
  const body =
    screen === "save" ? <TextScreen variant="save" /> :
    screen === "planText" ? <TextScreen variant="plan" /> :
    screen === "cookText" ? <TextScreen variant="cook" /> :
    screen === "plan" ? <PlanScreen /> :
    screen === "grocery" ? <GroceryScreen /> :
    screen === "goal" ? <GoalScreen /> :
    screen === "compare" ? <CompareScreen /> :
    screen === "taste" ? <TasteScreen /> :
    <FeedScreen />;
  return (
    <div className="relative mx-auto h-full w-full" style={{ maxWidth: "100%" }}>
      <div aria-hidden className="absolute left-1/2 -translate-x-1/2" style={{ bottom: "-4%", width: "118%", height: "30%", background: "radial-gradient(ellipse at center, rgba(28,26,23,0.18) 0%, rgba(28,26,23,0) 70%)", filter: "blur(6px)" }} />
      <div className="relative h-full w-full overflow-hidden" style={{ borderRadius: 38, background: "#1C1A17", padding: 7, boxShadow: "0 22px 50px -12px rgba(28,26,23,0.45), 0 0 0 2px rgba(28,26,23,0.9)" }}>
        <div className="relative h-full w-full overflow-hidden" style={{ borderRadius: 31, background: "#E9E2D3" }}>
          <div aria-hidden className="absolute left-1/2 -translate-x-1/2 z-20" style={{ top: 8, width: "30%", height: 15, background: "#1C1A17", borderRadius: 100 }} />
          <div key={screen} className="absolute inset-0" style={{ animation: "mp-in 0.4s ease both" }}>{body}</div>
        </div>
      </div>
      <style>{`@keyframes mp-in{0%{opacity:0;transform:scale(0.99)}100%{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

function Tape({ style }: { style?: React.CSSProperties }) {
  return <div aria-hidden style={{ position: "absolute", width: 46, height: 14, background: "rgba(255,216,77,0.85)", border: "1px solid rgba(23,20,16,0.15)", ...style }} />;
}
function Squiggle({ w = 96 }: { w?: number }) {
  return <svg width={w} height="7" viewBox={`0 0 ${w} 7`} fill="none" aria-hidden style={{ marginTop: 2 }}><path d={`M2 4.5 C ${w * 0.17} 1, ${w * 0.31} 6, ${w * 0.48} 4 S ${w * 0.83} 1, ${w - 2} 4`} stroke={TOMATO} strokeWidth="2.2" strokeLinecap="round" /></svg>;
}
const dotBg = { background: "#E9E2D3", backgroundImage: DOTS, backgroundSize: "11px 11px" } as const;

/* ── The Table (feed) ────────────────────────────────────────────────────── */
const SEATS = [
  { a: "Y", name: "you", c: LIME, r: -3 },
  { a: "S", name: "Sam", c: BUTTER, r: 3 },
  { a: "M", name: "Mia", c: PINK, r: -3 },
];
function FeedScreen() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden" style={{ ...dotBg, paddingTop: 28 }}>
      <div className="flex items-start justify-between" style={{ padding: "0 10px" }}>
        <div>
          <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em", color: INK, lineHeight: 1 }}>Marco</div>
          <div style={{ fontFamily: HAND, fontSize: 9, color: TOMATO, transform: "rotate(-2deg)", marginTop: 2 }}>what are your people cooking?</div>
        </div>
        <div className="flex items-center justify-center" style={{ width: 22, height: 22, borderRadius: 99, background: INK, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 9, border: `1.5px solid ${LIME}`, transform: "rotate(5deg)" }}>Y</div>
      </div>
      <div style={{ padding: "0 9px", marginTop: 7 }}>
        <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 11, color: INK, marginLeft: 2 }}>your table</div>
        <div className="relative" style={{ marginTop: 4, background: PAPER, border: `2px solid ${INK}`, borderRadius: 10, padding: "9px 4px 6px", transform: "rotate(-0.5deg)", boxShadow: "0 5px 12px rgba(23,20,16,0.12)" }}>
          <Tape style={{ top: -5, left: 14, transform: "rotate(-6deg)" }} />
          <div className="flex items-start justify-center gap-1">
            {SEATS.map((s) => (
              <div key={s.a} style={{ width: 40, textAlign: "center" }}>
                <div className="flex items-center justify-center" style={{ width: 26, height: 26, borderRadius: 99, margin: "0 auto", background: s.c, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 11, border: `2px solid ${INK}`, transform: `rotate(${s.r}deg)` }}>{s.a}</div>
                <div style={{ fontFamily: SANS, fontSize: 7.5, color: INK, marginTop: 2, fontWeight: s.name === "you" ? 700 : 400 }}>{s.name}</div>
              </div>
            ))}
            <div style={{ width: 40, textAlign: "center" }}>
              <div className="flex items-center justify-center" style={{ width: 26, height: 26, borderRadius: 99, margin: "0 auto", color: INK, fontSize: 13, border: `2px dashed ${INK}`, opacity: 0.5 }}>+</div>
              <div style={{ fontFamily: HAND, fontSize: 8.5, color: TOMATO, marginTop: 2 }}>invite</div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between" style={{ margin: "7px 9px 0", background: BUTTER, border: `2px solid ${INK}`, borderRadius: 9, padding: "6px 9px", fontFamily: DISP, fontWeight: 700, fontSize: 9.5, color: INK }}>
        <span>🍲 Potluck</span><span>Cook together →</span>
      </div>
      <div style={{ padding: "9px 12px 0" }}>
        <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 10, color: INK, marginBottom: 5, marginLeft: 2 }}>hot off the stove 🔥</div>
        <MiniPolaroid photo="/onboarding/recipes/mapo-tofu.jpg" title="Mapo Tofu" note="numbing, the good way" author="Sam" time="2h" />
      </div>
    </div>
  );
}
function MiniPolaroid({ photo, title, note, author, time, h = 66, rot = -1.4 }: { photo: string; title: string; note: string; author?: string; time?: string; h?: number; rot?: number }) {
  return (
    <div className="relative" style={{ background: PAPER, borderRadius: 8, padding: 7, border: `2px solid ${INK}`, transform: `rotate(${rot}deg)`, boxShadow: "0 9px 20px rgba(23,20,16,0.2)" }}>
      <div className="relative" style={{ transform: "rotate(1.2deg)" }}>
        <Tape style={{ top: -5, left: "50%", marginLeft: -23, transform: "rotate(-4deg)" }} />
        <div style={{ background: "#fff", padding: 4, border: "1px solid rgba(23,20,16,0.12)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img(photo)} alt="" referrerPolicy="no-referrer" style={{ width: "100%", height: h, objectFit: "cover", display: "block" }} />
        </div>
      </div>
      <div style={{ padding: "6px 2px 0" }}>
        {author && <div style={{ fontFamily: SANS, fontSize: 7.5, color: INK }}><b>{author}</b> cooked · {time}</div>}
        <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: INK, lineHeight: 1.0, marginTop: 2 }}>{title}</div>
        <Squiggle />
        {note && <div style={{ fontFamily: HAND, fontSize: 10, color: TOMATO, marginTop: 3, transform: "rotate(-1deg)" }}>{note}</div>}
      </div>
    </div>
  );
}

/* ── Meal plan (the week) ────────────────────────────────────────────────── */
const PLAN = [
  { day: "MON", title: "Creamy Pork Stew", meal: "DINNER", img: "/onboarding/recipes/245361-creamy-pork-stew-Beauty-4x3-a56080e9b5a4462a8dad0a7661f6d1f4.jpg" },
  { day: "TUE", title: "Mapo Tofu", meal: "DINNER", img: "/onboarding/recipes/mapo-tofu.jpg" },
  { day: "WED", title: "Chicken Shawarma", meal: "LUNCH", img: "/onboarding/recipes/Chicken-Shawarma-8.jpg" },
  { day: "THU", title: "Shrimp Scampi", meal: "DINNER", img: "/onboarding/recipes/shrimp scampi.jpg" },
  { day: "FRI", title: "Salmon Teriyaki", meal: "DINNER", img: "/onboarding/recipes/salmon terriyaki.jpg" },
];
function PlanScreen() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden" style={{ ...dotBg, paddingTop: 28 }}>
      <div style={{ padding: "0 11px" }}>
        <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 17, color: INK, lineHeight: 1 }}>This week</div>
        <div style={{ fontFamily: HAND, fontSize: 9.5, color: TOMATO, transform: "rotate(-1deg)", marginTop: 2 }}>Jun 16 – 22 · in sync</div>
      </div>
      <div className="flex flex-col" style={{ padding: "8px 10px 0", gap: 5 }}>
        {PLAN.map((d, i) => (
          <div key={d.day} className="flex items-center gap-2" style={{ background: PAPER, border: `2px solid ${INK}`, borderRadius: 9, padding: "4px 6px", transform: `rotate(${i % 2 ? 0.5 : -0.5}deg)`, boxShadow: "0 3px 8px rgba(23,20,16,0.08)" }}>
            <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 8, color: PAPER, background: TOMATO, border: `1.5px solid ${INK}`, borderRadius: 5, padding: "3px 5px", letterSpacing: "0.04em" }}>{d.day}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img(d.img)} alt="" referrerPolicy="no-referrer" style={{ width: 24, height: 24, borderRadius: 6, objectFit: "cover", border: `1.5px solid ${INK}` }} />
            <div className="min-w-0 flex-1">
              <div className="truncate" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 11, color: INK, lineHeight: 1.1 }}>{d.title}</div>
              <div style={{ fontFamily: MONO, fontSize: 6.5, letterSpacing: "0.1em", color: "#4A4742", marginTop: 1 }}>{d.meal}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Grocery (writes itself) ─────────────────────────────────────────────── */
const GROCERY: { sec: string; emoji: string; items: { name: string; qty: string; done?: boolean }[] }[] = [
  { sec: "Produce", emoji: "🥬", items: [{ name: "Shallots", qty: "2", done: true }, { name: "Garlic", qty: "1 head" }, { name: "Fresh basil", qty: "1 bunch" }] },
  { sec: "Dairy", emoji: "🧀", items: [{ name: "Cream cheese", qty: "1 tub", done: true }, { name: "Parmesan", qty: "100 g" }] },
];
function GroceryScreen() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden" style={{ ...dotBg, paddingTop: 28 }}>
      <div style={{ padding: "0 11px" }}>
        <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 17, color: INK, lineHeight: 1 }}>Grocery list</div>
        <div style={{ fontFamily: HAND, fontSize: 9.5, color: TOMATO, transform: "rotate(-1deg)", marginTop: 2 }}>auto-added from your plan ✨</div>
      </div>
      <div className="flex flex-col" style={{ padding: "8px 10px 0", gap: 8 }}>
        {GROCERY.map((g) => (
          <div key={g.sec}>
            <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 10, color: INK, marginBottom: 3, marginLeft: 2 }}>{g.emoji} {g.sec}</div>
            <div style={{ background: PAPER, border: `2px solid ${INK}`, borderRadius: 9, overflow: "hidden" }}>
              {g.items.map((it, j) => (
                <div key={it.name} className="flex items-center gap-2" style={{ padding: "5px 8px", borderTop: j === 0 ? "none" : "1px solid rgba(23,20,16,0.08)" }}>
                  <span className="flex items-center justify-center" style={{ width: 13, height: 13, borderRadius: 4, flexShrink: 0, background: it.done ? TOMATO : "transparent", border: it.done ? "none" : `1.5px solid ${INK}` }}>
                    {it.done && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>}
                  </span>
                  <span className="flex-1 truncate" style={{ fontFamily: SANS, fontSize: 10, color: it.done ? "#8A857C" : INK, textDecoration: it.done ? "line-through" : "none" }}>{it.name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 8, color: "#4A4742" }}>{it.qty}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Goal (reach your cooking goals) ─────────────────────────────────────── */
function GoalScreen() {
  const cooked = 3, target = 4;
  return (
    <div className="flex h-full w-full flex-col items-center overflow-hidden" style={{ ...dotBg, paddingTop: 30 }}>
      <div style={{ fontFamily: HAND, fontSize: 11, color: TOMATO, transform: "rotate(-2deg)" }}>you cooked it! 🎉</div>
      <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 19, color: INK, marginTop: 2, textAlign: "center", lineHeight: 1.02 }}>3 cooks this week</div>
      <Squiggle w={120} />
      {/* four cook slots, 3 filled */}
      <div className="flex items-center gap-2" style={{ marginTop: 12 }}>
        {Array.from({ length: target }).map((_, i) => (
          <div key={i} className="flex items-center justify-center" style={{ width: 30, height: 30, borderRadius: 99, border: `2px solid ${INK}`, background: i < cooked ? TOMATO : "transparent", color: PAPER, fontSize: 13, transform: `rotate(${i % 2 ? 4 : -4}deg)` }}>{i < cooked ? "🍳" : ""}</div>
        ))}
      </div>
      <div style={{ fontFamily: SANS, fontSize: 10, color: "#4A4742", marginTop: 10 }}>one more to hit your goal 💪</div>
      {/* the cook that just landed */}
      <div style={{ width: 120, marginTop: 12 }}>
        <MiniPolaroid photo="/onboarding/recipes/shrimp scampi.jpg" title="Shrimp Scampi" note="logged by text ✓" h={54} rot={1.6} />
      </div>
    </div>
  );
}

/* ── Compare (Beli-style) + taste profile ────────────────────────────────── */
function CompareScreen() {
  const dishes = [
    { title: "Mapo Tofu", photo: "/onboarding/recipes/mapo-tofu.jpg", c: LIME },
    { title: "Shrimp Scampi", photo: "/onboarding/recipes/shrimp scampi.jpg", c: LAV },
  ];
  return (
    <div className="flex h-full w-full flex-col items-center overflow-hidden" style={{ ...dotBg, paddingTop: 30 }}>
      <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 16, color: INK, textAlign: "center", lineHeight: 1.04, padding: "0 12px" }}>Which did you<br />like more?</div>
      <div style={{ fontFamily: HAND, fontSize: 9.5, color: TOMATO, transform: "rotate(-1deg)", marginTop: 2 }}>swipe to rank — Marco learns your taste</div>
      <div className="flex items-stretch justify-center" style={{ gap: 8, marginTop: 14, padding: "0 10px" }}>
        {dishes.map((d, i) => (
          <div key={d.title} className="relative flex-1" style={{ background: PAPER, border: `2px solid ${INK}`, borderRadius: 10, padding: 6, transform: `rotate(${i ? 2 : -2}deg)`, boxShadow: "0 8px 18px rgba(23,20,16,0.18)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img(d.photo)} alt="" referrerPolicy="no-referrer" style={{ width: "100%", height: 74, objectFit: "cover", borderRadius: 5, border: `1.5px solid ${INK}`, display: "block" }} />
            <div className="truncate" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 11, color: INK, marginTop: 5, textAlign: "center" }}>{d.title}</div>
          </div>
        ))}
        <div className="absolute flex items-center justify-center" style={{ top: 118, left: "50%", marginLeft: -15, width: 30, height: 30, borderRadius: 99, background: INK, color: BUTTER, fontFamily: DISP, fontWeight: 700, fontSize: 11, border: `2px solid ${PAPER}`, transform: "rotate(-6deg)", zIndex: 3 }}>VS</div>
      </div>
      <div className="flex items-center gap-3" style={{ marginTop: 16 }}>
        <div className="flex items-center justify-center" style={{ width: 34, height: 34, borderRadius: 99, background: PAPER, border: `2px solid ${INK}`, fontSize: 15 }}>👈</div>
        <div style={{ fontFamily: HAND, fontSize: 10, color: INK, opacity: 0.6 }}>or</div>
        <div className="flex items-center justify-center" style={{ width: 34, height: 34, borderRadius: 99, background: PAPER, border: `2px solid ${INK}`, fontSize: 15 }}>👉</div>
      </div>
    </div>
  );
}
const TASTE = [
  { t: "spicy 🌶️", c: TOMATO, fg: PAPER, r: -3 },
  { t: "quick ⚡", c: BUTTER, fg: INK, r: 2 },
  { t: "one-pan 🍳", c: LIME, fg: INK, r: -2 },
  { t: "noodles 🍜", c: LAV, fg: INK, r: 3 },
  { t: "cozy 🫕", c: PINK, fg: PAPER, r: -2 },
];
function TasteScreen() {
  return (
    <div className="flex h-full w-full flex-col items-center overflow-hidden" style={{ ...dotBg, paddingTop: 32 }}>
      <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 18, color: INK }}>Your taste</div>
      <div style={{ fontFamily: HAND, fontSize: 9.5, color: TOMATO, transform: "rotate(-1deg)", marginTop: 1 }}>the more you cook, the sharper this gets</div>
      <div className="flex flex-wrap items-center justify-center" style={{ gap: 7, padding: "16px 16px 0" }}>
        {TASTE.map((x) => (
          <span key={x.t} style={{ fontFamily: DISP, fontWeight: 700, fontSize: 12, color: x.fg, background: x.c, border: `2px solid ${INK}`, borderRadius: 99, padding: "6px 12px", transform: `rotate(${x.r}deg)`, boxShadow: "0 4px 9px rgba(23,20,16,0.15)" }}>{x.t}</span>
        ))}
      </div>
      <div className="relative" style={{ marginTop: 18, width: "80%", background: PAPER, border: `2px solid ${INK}`, borderRadius: 10, padding: "10px 12px", transform: "rotate(-0.6deg)" }}>
        <div style={{ fontFamily: SANS, fontSize: 9.5, color: INK, lineHeight: 1.35 }}>Because you loved <b>Mapo Tofu</b>, try the <b>Dan Dan Noodles</b> in your saves →</div>
        <div style={{ position: "absolute", bottom: -8, right: 10, fontFamily: DISP, fontWeight: 700, fontSize: 9, color: PAPER, background: COBALT, border: `1.5px solid ${INK}`, borderRadius: 99, padding: "3px 8px", transform: "rotate(4deg)" }}>for you 🍅</div>
      </div>
    </div>
  );
}

/* ── Text threads (save / plan / cook) ───────────────────────────────────── */
type Msg = { who: "you" | "sam" | "marco"; text?: string; photo?: string; react?: string };
const THREADS: Record<"save" | "plan" | "cook", Msg[]> = {
  save: [
    { who: "sam", photo: "/onboarding/recipes/fettuccine-alfredo.jpg", text: "made this, so good 😍" },
    { who: "sam", text: "instagram.com/reel/chili-crisp-pasta", react: "❤️" },
    { who: "marco", text: "Saved to your Kitchen 👨‍🍳" },
  ],
  plan: [
    { who: "you", text: "what should we cook friday babe?" },
    { who: "marco", text: "from your saves — green curry or shrimp scampi?" },
    { who: "sam", text: "shrimp scampi! 🍤" },
    { who: "marco", text: "Added to your plan for Fri." },
  ],
  cook: [
    { who: "you", photo: "/onboarding/recipes/shrimp scampi.jpg", text: "made the scampi!! 🔥" },
    { who: "marco", text: "🎉 logged — that's 3 cooks this week!" },
    { who: "marco", text: "one more and you hit your goal 💪" },
  ],
};
function TextScreen({ variant }: { variant: "save" | "plan" | "cook" }) {
  const BLUE = "#007AFF";
  const thread = THREADS[variant];
  return (
    <div className="flex h-full w-full flex-col" style={{ background: "#FFFFFF", paddingTop: 26 }}>
      <div className="flex flex-col items-center px-3 pb-1.5" style={{ borderBottom: "1px solid rgba(28,26,23,0.08)" }}>
        <div className="flex items-center" style={{ height: 32 }}>
          <span className="flex items-center justify-center" style={{ width: 30, height: 30, borderRadius: 99, background: "#6B5BD2", color: "#FFFDF7", fontFamily: SANS, fontSize: 12, fontWeight: 600, border: "2px solid #FFFFFF", zIndex: 1 }}>S</span>
          <span className="flex items-center justify-center overflow-hidden" style={{ width: 32, height: 32, borderRadius: 99, background: LIME, border: "2px solid #FFFFFF", marginLeft: -10, zIndex: 2 }}>
            <TomatoMascot state="thriving" size={25} />
          </span>
        </div>
        <span style={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 600, color: "#1C1A17", marginTop: 2 }}>Sam &amp; Marco ›</span>
      </div>
      <div className="flex flex-1 flex-col justify-end overflow-hidden px-2.5 pb-1.5 pt-1.5" style={{ gap: 3 }}>
        {thread.map((r, i) => {
          const me = r.who === "you";
          return (
            <div key={i} className="flex flex-col" style={{ alignItems: me ? "flex-end" : "flex-start", marginTop: i > 0 && thread[i - 1].who !== r.who ? 3 : 0 }}>
              {!me && <span style={{ fontFamily: SANS, fontSize: 7.5, fontWeight: 600, color: r.who === "marco" ? TOMATO : "#6B5BD2", margin: "0 0 1px 9px" }}>{r.who === "marco" ? "Marco" : "Sam"}</span>}
              <div className="relative" style={{ maxWidth: "80%" }}>
                {r.react && (
                  <span className="absolute flex items-center justify-center" style={{ top: -9, left: -8, fontSize: 9, background: "#fff", borderRadius: 99, width: 18, height: 18, border: "1px solid rgba(28,26,23,0.1)", boxShadow: "0 1px 3px rgba(0,0,0,0.12)", zIndex: 3 }}>{r.react}</span>
                )}
                {r.photo ? (
                  <div style={{ borderRadius: 13, overflow: "hidden", border: "1px solid rgba(28,26,23,0.12)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img(r.photo)} alt="" referrerPolicy="no-referrer" style={{ width: 118, height: 86, objectFit: "cover", display: "block" }} />
                    {r.text && <div style={{ background: me ? BLUE : "#E9E9EB", color: me ? "#fff" : "#1C1A17", fontFamily: SANS, fontSize: 10, padding: "4px 8px" }}>{r.text}</div>}
                  </div>
                ) : (
                  <span style={{ display: "inline-block", background: me ? BLUE : "#E9E9EB", color: me ? "#FFFFFF" : "#1C1A17", borderRadius: 15, padding: "5px 9px", fontFamily: SANS, fontSize: 10.5, lineHeight: 1.28, wordBreak: "break-word" }}>{r.text}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5 px-2.5 pb-2.5 pt-1.5" style={{ borderTop: "1px solid rgba(28,26,23,0.08)" }}>
        <div className="flex flex-1 items-center" style={{ height: 22, borderRadius: 100, border: "1px solid rgba(28,26,23,0.2)", padding: "0 9px" }}>
          <span style={{ fontFamily: SANS, fontSize: 9.5, color: "rgba(28,26,23,0.4)" }}>iMessage</span>
        </div>
        <span className="flex flex-shrink-0 items-center justify-center" style={{ width: 22, height: 22, borderRadius: 99, background: BLUE }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
        </span>
      </div>
    </div>
  );
}
