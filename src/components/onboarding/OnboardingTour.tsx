"use client";
import { useEffect, useState } from "react";
import MarcoPhone, { type MarcoScreen } from "@/components/onboarding/MarcoPhone";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const DISP = '"Marker Felt", Georgia, serif';
const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
const SANS = "system-ui, -apple-system, sans-serif";
const DOTS = "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)";

// The value showcase — the app's real screens at phone scale. Runs BEFORE auth
// (on the signup flow) so people see why Marco matters before being asked to
// sign in. Everything else (allergies, taste, household, action quests) is
// captured by the ongoing in-app guide once you land in your kitchen.
const PANELS: { screens: MarcoScreen[]; title: string; sub: string }[] = [
  { screens: ["save"], title: "Save from anywhere — even group chats", sub: "React to any recipe link or food photo in a group chat and Marco saves it to your Kitchen." },
  { screens: ["planText", "plan", "grocery"], title: "Plan meals & groceries, by text", sub: "Tell Marco what you're thinking and your week fills in — the plan and the grocery list, in sync with your household." },
  { screens: ["cookText", "goal"], title: "Actually cook — don't just save", sub: "Text Marco when you cook and watch your goal fill up. Recipes are for cooking, not hoarding." },
  { screens: ["feed"], title: "Inspired by friends, not strangers", sub: "Your family and close friends each get a table — cook from what your people actually make." },
  { screens: ["compare", "taste"], title: "The more you cook, the smarter it gets", sub: "Rank your cooks head-to-head and Marco sharpens your taste — so every suggestion fits you better." },
];

function PhoneRotator({ screens }: { screens: MarcoScreen[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (screens.length < 2) return;
    const t = setInterval(() => setI(v => (v + 1) % screens.length), 2400);
    return () => clearInterval(t);
  }, [screens]);
  const cur = i % screens.length;
  return (
    <div className="relative h-full w-full">
      <MarcoPhone screen={screens[cur]} />
      {screens.length > 1 && (
        <div className="absolute inset-x-0 flex items-center justify-center gap-1" style={{ bottom: -14 }}>
          {screens.map((_, j) => <span key={j} style={{ width: 5, height: 5, borderRadius: 99, background: j === cur ? TOMATO : "rgba(23,20,16,0.22)", transition: "all .25s" }} />)}
        </div>
      )}
    </div>
  );
}

const primaryBtn: React.CSSProperties = { color: PAPER, background: TOMATO, fontFamily: DISP, fontWeight: 700, fontSize: 17, padding: "15px 0", borderRadius: 14, border: `2.5px solid ${INK}`, boxShadow: "0 8px 18px rgba(229,70,46,0.28)" };

export default function OnboardingTour({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);

  return (
    <div className="min-h-[100dvh] w-full" style={{ background: "#E9E2D3", backgroundImage: DOTS, backgroundSize: "13px 13px", color: INK }}>
      <div className="relative mx-auto flex w-full max-w-md flex-col px-6" style={{ minHeight: "100dvh", paddingTop: "calc(env(safe-area-inset-top,0px) + 16px)", paddingBottom: 24 }}>
        <div className="flex items-center justify-between">
          <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 20, color: INK }}>Marco</span>
          <button onClick={onDone} style={{ fontFamily: HAND, fontSize: 15, color: INK, opacity: 0.55, background: "none", border: "none" }}>skip →</button>
        </div>

        <div className="flex flex-1 flex-col">
          <div className="flex flex-1 items-center justify-center overflow-hidden pt-3" style={{ minHeight: 0 }}>
            <div key={`phone-${step}`} style={{ height: "min(400px, 46vh)", width: "calc(min(400px, 46vh) * 186 / 380)", animation: "ob-slide 0.4s ease both" }}>
              <PhoneRotator key={step} screens={PANELS[step].screens} />
            </div>
          </div>
          <div key={`copy-${step}`} className="text-center" style={{ animation: "ob-slide 0.4s ease 0.05s both" }}>
            <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 30, lineHeight: 1.04, letterSpacing: "-0.01em", color: INK }}>{PANELS[step].title}</h1>
            <p className="mx-auto" style={{ fontFamily: SANS, fontSize: 15, color: "#4A4742", marginTop: 8, lineHeight: 1.45, maxWidth: "20rem" }}>{PANELS[step].sub}</p>
          </div>
          <div className="flex items-center justify-center gap-1.5" style={{ margin: "16px 0" }}>
            {PANELS.map((_, i) => <span key={i} style={{ width: i === step ? 22 : 8, height: 8, borderRadius: 99, background: i === step ? TOMATO : "rgba(23,20,16,0.2)", transition: "all .25s" }} />)}
          </div>
          <div className="flex items-center gap-3">
            {step > 0 && <button onClick={() => setStep(step - 1)} className="transition-transform active:scale-95" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 15, color: INK, background: PAPER, border: `2px solid ${INK}`, borderRadius: 12, padding: "13px 18px" }}>←</button>}
            <button onClick={() => (step === PANELS.length - 1 ? onDone() : setStep(step + 1))} className="flex-1 transition-transform active:scale-[0.98]" style={primaryBtn}>
              {step === PANELS.length - 1 ? "Let's get cooking →" : "Next →"}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes ob-slide{0%{opacity:0;transform:translateX(20px)}100%{opacity:1;transform:translateX(0)}}@media (prefers-reduced-motion: reduce){[style*="ob-slide"]{animation:none !important}}`}</style>
    </div>
  );
}
