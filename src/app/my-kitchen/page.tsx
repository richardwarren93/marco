"use client";

// "My Kitchen" — the composed whole-room identity surface. The wide master image
// is framed as a hero (the panorama aspect is a deliberate design choice here, not
// a letterbox), over a warm page with progress stats + a share hook. This is the
// attachment payoff: "this is MY kitchen, and it fills in as I cook."
//
// Stats are placeholders for now (design pass) — wired to real cook data next.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TomatoMascot from "@/components/gamification/TomatoMascot";

const CREAM = "#F4ECDD";
const INK = "#2E2A22";
const INK_SOFT = "#8B8574";
const GOLD = "#9A7B4F";
const GREEN = "#3B4A2E";
const TOMATO = "#E5462E";

const SCRIPT = '"Segoe Script", "Bradley Hand", "Snell Roundhand", cursive';
const SERIF = "var(--font-display, Georgia, serif)";
const MONO = "var(--font-mono, ui-monospace, monospace)";

export default function MyKitchenPage() {
  const router = useRouter();
  const [stats, setStats] = useState({ meals: 12, dishes: 8, skills: 4, growing: 1 });
  const [name, setName] = useState("Sunny Apartment");
  const [editing, setEditing] = useState(false);
  const month = new Date().toLocaleString("en-US", { month: "long" }).toUpperCase();

  useEffect(() => {
    try { const v = localStorage.getItem("marco_kitchen_name"); if (v) setName(v); } catch { /* ignore */ }
  }, []);
  function saveName(v: string) {
    const t = v.trim() || "My Kitchen";
    setName(t);
    try { localStorage.setItem("marco_kitchen_name", t); } catch { /* ignore */ }
    setEditing(false);
  }

  // Pull whatever real numbers we have today; the rest stay as design placeholders
  // until the progression endpoint lands.
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/cook/home");
        if (!r.ok) return;
        const d = await r.json();
        setStats((s) => ({ ...s, dishes: d.savedRecipes ?? s.dishes }));
      } catch { /* keep placeholders */ }
    })();
  }, []);

  return (
    <div className="min-h-[100dvh] w-full" style={{ background: CREAM }}>
      <div className="mx-auto w-full max-w-md px-6" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 14px)", paddingBottom: "2rem" }}>
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/tonight")}
            aria-label="Back"
            className="flex items-center justify-center rounded-full active:scale-95 transition-transform"
            style={{ width: 40, height: 40, background: "rgba(46,42,34,0.06)" }}
          >
            <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <button onClick={() => setEditing(true)} className="px-4 py-2 rounded-full text-sm font-medium active:scale-95 transition-transform" style={{ background: "rgba(46,42,34,0.06)", color: INK }}>
            Edit
          </button>
        </div>

        {/* Title block */}
        <div className="text-center mt-3 flex flex-col items-center">
          <TomatoMascot state="thriving" size={46} greeting />
          <h1 style={{ fontFamily: SERIF, fontSize: 46, lineHeight: 1.02, color: INK, marginTop: 8 }}>My Kitchen</h1>
          {editing ? (
            <input
              autoFocus
              defaultValue={name}
              maxLength={28}
              onFocus={(e) => e.target.select()}
              onBlur={(e) => saveName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveName((e.target as HTMLInputElement).value); }}
              className="mt-3 text-center bg-transparent outline-none"
              style={{ fontFamily: MONO, fontSize: 12.5, letterSpacing: "0.14em", color: INK, borderBottom: `1.5px solid ${GOLD}`, textTransform: "uppercase", width: "80%" }}
            />
          ) : (
            <p className="mt-3" style={{ fontFamily: MONO, fontSize: 12.5, letterSpacing: "0.18em", color: INK_SOFT }}>{name.toUpperCase()} · {month}</p>
          )}
          <p className="mt-3" style={{ fontFamily: SCRIPT, fontSize: 22, color: GOLD }}>A work in progress</p>
          <div className="mx-auto mt-3" style={{ width: 54, height: 2, background: "rgba(154,123,79,0.5)", borderRadius: 2 }} />
        </div>

        {/* Panorama hero — the wide master, framed. Deliberate panorama crop. */}
        <div className="mt-6 overflow-hidden" style={{ borderRadius: 18, boxShadow: "0 20px 44px rgba(46,34,14,0.20)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kitchen/room-wide.png" alt="Your whole kitchen" className="block w-full h-auto" />
        </div>

        {/* Stats */}
        <div className="mt-7 flex items-stretch">
          {[
            { icon: <ForkKnife />, n: stats.meals, l: ["Meals", "Cooked"] },
            { icon: <Bowl />, n: stats.dishes, l: ["Dishes", "Learned"] },
            { icon: <ChefHat />, n: stats.skills, l: ["Skills", "Unlocked"] },
            { icon: <Sprout />, n: stats.growing, l: ["Kitchen", "Growing"] },
          ].map((s, i) => (
            <div key={i} className="flex-1 flex flex-col items-center text-center" style={{ borderLeft: i ? "1px solid rgba(46,42,34,0.12)" : "none", padding: "0 6px" }}>
              <div style={{ color: GREEN, opacity: 0.85 }}>{s.icon}</div>
              <div style={{ fontFamily: SERIF, fontSize: 30, color: INK, lineHeight: 1, marginTop: 8 }}>{s.n}</div>
              <div className="mt-2" style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em", color: INK_SOFT, lineHeight: 1.35 }}>
                {s.l[0].toUpperCase()}<br />{s.l[1].toUpperCase()}
              </div>
            </div>
          ))}
        </div>

        {/* Share */}
        <button
          className="w-full mt-8 flex items-center justify-center gap-2.5 active:scale-[0.98] transition-transform"
          style={{ background: TOMATO, color: "#FFF7EF", borderRadius: 999, padding: "17px 0", fontFamily: SERIF, fontSize: 18, boxShadow: "0 12px 26px rgba(229,70,46,0.32)" }}
        >
          <svg viewBox="0 0 24 24" width={19} height={19} fill="none" stroke="#F4ECDD" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M8 8l4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
          Share my kitchen
        </button>

        <p className="text-center mt-7" style={{ fontFamily: SCRIPT, fontSize: 18, color: GOLD }}>&ldquo;Good food, Brighter days.&rdquo;</p>
        <div className="mx-auto mt-3" style={{ width: 44, height: 2, background: "rgba(154,123,79,0.4)", borderRadius: 2 }} />
      </div>
    </div>
  );
}

/* — line icons — */
function ForkKnife() {
  return (<svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v7a2 2 0 0 0 4 0V3M8 3v18M18 3c-1.5 0-3 1.8-3 5s1.5 4 3 4v9" /></svg>);
}
function Bowl() {
  return (<svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M3 11h18a9 9 0 0 1-18 0zM8 11c0-3 1.8-5 4-5s4 2 4 5" /></svg>);
}
function ChefHat() {
  return (<svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M7 20h10M6.5 16h11a3.5 3.5 0 0 0 .5-6.96A4.5 4.5 0 0 0 12 5a4.5 4.5 0 0 0-6 4.04A3.5 3.5 0 0 0 6.5 16z" /></svg>);
}
function Sprout() {
  return (<svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M12 21v-8M12 13c0-3 2.5-4 5-4-.5 3-2 4-5 4zM12 13c0-2.5-2-3.5-4-3.5.4 2.5 1.6 3.5 4 3.5z" /></svg>);
}
