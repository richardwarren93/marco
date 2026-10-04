"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MarcoPhone, { type MarcoScreen } from "@/components/onboarding/MarcoPhone";
import { contactsPickerAvailable, pickContactNumber } from "@/lib/native/pickContact";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const LIME = "#C4EE45";
const BUTTER = "#FFD84D";
const LAV = "#C9B8FF";
const PINK = "#FF4D9D";
const DISP = '"Marker Felt", Georgia, serif';
const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
const SANS = "system-ui, -apple-system, sans-serif";
const DOTS = "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)";

// Each panel shows one or more REAL Marco screens (beautiful-chaos) in the phone.
const PANELS: { screens: MarcoScreen[]; title: string; sub: string }[] = [
  { screens: ["save"], title: "Save from anywhere — even group chats", sub: "React to any recipe link or food photo in a group chat and Marco saves it to your Kitchen." },
  { screens: ["planText", "plan", "grocery"], title: "Plan meals & groceries, by text", sub: "Tell Marco what you're thinking and your week fills in — the plan and the grocery list, in sync with your household." },
  { screens: ["cookText", "goal"], title: "Actually cook — don't just save", sub: "Text Marco when you cook and watch your goal fill up. Recipes are for cooking, not hoarding." },
  { screens: ["feed"], title: "Inspired by friends, not strangers", sub: "Your family and close friends each get a table — cook from what your people actually make." },
  { screens: ["compare", "taste"], title: "The more you cook, the smarter it gets", sub: "Rank your cooks head-to-head and Marco sharpens your taste — so every suggestion fits you better." },
];

const ALLERGY_OPTIONS = ["Peanuts", "Tree nuts", "Dairy", "Gluten", "Shellfish", "Eggs", "Soy", "Fish"];
const HOUSEHOLDS: { k: string; e: string; size: number; c: string }[] = [
  { k: "Just me", e: "🧑", size: 1, c: LIME },
  { k: "My partner", e: "❤️", size: 2, c: PINK },
  { k: "My family", e: "👨‍👩‍👧", size: 4, c: BUTTER },
  { k: "Roommates", e: "🏠", size: 3, c: LAV },
];

type Stage = "tour" | "name" | "goal" | "allergies" | "household" | "ready";

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
const inkBtn: React.CSSProperties = { color: PAPER, background: INK, fontFamily: DISP, fontWeight: 700, fontSize: 18, padding: "16px 0", borderRadius: 14, border: `2.5px solid ${INK}` };

export default function OnboardingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);

  const [stage, setStage] = useState<Stage>("tour");
  const [step, setStep] = useState(0); // tour index
  const [name, setName] = useState("");
  const [goal, setGoal] = useState(0);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [household, setHousehold] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  const [memberName, setMemberName] = useState("");
  const [marcoNumber, setMarcoNumber] = useState("");
  const canPickContact = contactsPickerAvailable();

  async function pickFromContacts() {
    const picked = await pickContactNumber();
    if (picked?.number) { setMemberPhone(picked.number); setMemberName(picked.name?.split(" ")[0] ?? ""); }
  }

  // Marco's number — needed to open a group iMessage (you + household + Marco).
  useEffect(() => {
    void fetch("/api/imessage/link", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(v => { if (v?.marcoNumber) setMarcoNumber(v.marcoNumber); }).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      const r = await fetch("/api/profile", { cache: "no-store" });
      if (r.status === 401) { router.replace("/auth/login"); return; }
      if (!r.ok) throw new Error("Your profile could not be loaded. Please retry.");
      const data = await r.json();
      if (!active) return;
      if (data.profile?.onboarding_completed) { router.replace("/kitchen"); return; }
      setName(data.profile?.display_name || ""); setReady(true);
    }
    void load().catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [router, reload]);

  // Finalize: persist everything, create a household if they cook with others,
  // then either hand off to texting Marco or drop into the app.
  async function finish(toText: boolean) {
    setBusy(true); setError("");
    try {
      const hh = HOUSEHOLDS.find(h => h.k === household);
      const body: Record<string, unknown> = { display_name: name.trim() };
      if (goal) body.weekly_target = goal;
      if (allergies.length) body.allergies = allergies;
      if (hh) { body.household_type = hh.k; body.household_size = hh.size; }
      const r = await fetch("/api/onboarding/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const value = await r.json(); if (!r.ok) throw new Error(value.error || "Could not save your setup.");
      if (hh && hh.k !== "Just me") {
        await fetch("/api/household", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: `${name.trim()}'s Kitchen` }) }).catch(() => {});
      }
      // Household + a number → open a group iMessage (you + them + Marco), where
      // recipes dropped in the chat get saved. Otherwise hand off to the DM link.
      const member = memberPhone.replace(/[^\d+]/g, "");
      if (toText && marcoNumber && member.length >= 7) {
        const body = `Welcome to our kitchen 🍅 Drop any recipe link here and Marco saves it for us.`;
        try { window.location.href = `sms:${member},${marcoNumber}&body=${encodeURIComponent(body)}`; } catch { /* fall through to connect */ }
        router.replace("/connect/imessage");
      } else {
        router.replace(toText ? "/connect/imessage" : "/kitchen");
      }
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save. Try again."); setBusy(false); }
  }

  const toggleAllergy = (a: string) => setAllergies(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a]);
  const addCustom = () => { const t = custom.trim(); if (t && !allergies.includes(t)) { setAllergies(p => [...p, t]); setCustom(""); } };

  // Progress across the setup sequence (after the tour)
  const SETUP: Stage[] = ["name", "goal", "allergies", "household", "ready"];
  const setupIdx = SETUP.indexOf(stage);

  return (
    <div className="min-h-[100dvh] w-full" style={{ background: "#E9E2D3", backgroundImage: DOTS, backgroundSize: "13px 13px", color: INK }}>
      <div className="relative mx-auto flex w-full max-w-md flex-col px-6" style={{ minHeight: "100dvh", paddingTop: "calc(env(safe-area-inset-top,0px) + 16px)", paddingBottom: 24 }}>
        {/* top bar */}
        <div className="flex items-center justify-between">
          <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 20, color: INK }}>Marco</span>
          {stage === "tour" && <button onClick={() => setStage("name")} style={{ fontFamily: HAND, fontSize: 15, color: INK, opacity: 0.55, background: "none", border: "none" }}>skip →</button>}
          {setupIdx > 0 && stage !== "ready" && (
            <div className="flex items-center gap-1.5">
              {SETUP.slice(0, 4).map((s, i) => <span key={s} style={{ width: i === setupIdx ? 20 : 7, height: 7, borderRadius: 99, background: i <= setupIdx ? TOMATO : "rgba(23,20,16,0.2)", transition: "all .2s" }} />)}
            </div>
          )}
        </div>

        {error && <div role="alert" className="mt-4 rounded-xl bg-white p-4" style={{ border: `2px solid ${INK}` }}>{error}{!ready && <button className="mt-2 block underline" onClick={() => { setError(""); setReload(v => v + 1); }}>Retry</button>}</div>}
        {!ready && !error && <p role="status" className="mt-8" style={{ fontFamily: HAND, fontSize: 17, color: TOMATO }}>getting your kitchen ready…</p>}

        {/* ─── Tour ─────────────────────────────────────────────────────── */}
        {ready && stage === "tour" && (
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
              <button onClick={() => (step === PANELS.length - 1 ? setStage("name") : setStep(step + 1))} className="flex-1 transition-transform active:scale-[0.98]" style={primaryBtn}>
                {step === PANELS.length - 1 ? "Set up my kitchen →" : "Next →"}
              </button>
            </div>
          </div>
        )}

        {/* ─── Name ─────────────────────────────────────────────────────── */}
        {ready && stage === "name" && (
          <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) setStage("goal"); }} className="flex flex-1 flex-col">
            <div className="flex flex-1 flex-col justify-center">
              <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 32, lineHeight: 1.03, color: INK }}>Let&apos;s get cooking</h1>
              <Squiggle />
              <label className="block" style={{ marginTop: 24, fontFamily: DISP, fontWeight: 700, fontSize: 17, color: INK }}>What should we call you?
                <input autoFocus autoComplete="given-name" required maxLength={60} value={name} onChange={e => setName(e.target.value)} className="block w-full" style={{ marginTop: 10, background: PAPER, border: `2.5px solid ${INK}`, borderRadius: 14, padding: "14px 16px", fontFamily: SANS, fontSize: 17, color: INK }} />
              </label>
              <p style={{ fontFamily: HAND, fontSize: 15, color: TOMATO, marginTop: 12, transform: "rotate(-1deg)" }}>a few quick things, then you&apos;re cooking</p>
            </div>
            <button type="submit" disabled={!name.trim()} className="w-full transition-transform active:scale-[0.98] disabled:opacity-50" style={primaryBtn}>Next →</button>
          </form>
        )}

        {/* ─── Goal ─────────────────────────────────────────────────────── */}
        {ready && stage === "goal" && (
          <div className="flex flex-1 flex-col">
            <button onClick={() => setStage("name")} className="self-start" style={backBtn}>←</button>
            <div className="flex flex-1 flex-col justify-center">
              <h1 style={stepH}>How often do you want to <span style={{ color: TOMATO }}>cook</span>?</h1>
              <p style={stepSub}>We&apos;ll set this as your weekly goal — change it anytime.</p>
              <div className="grid grid-cols-7" style={{ gap: 7, marginTop: 26 }}>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => {
                  const on = goal === n;
                  return <button key={n} onClick={() => setGoal(n)} className="transition-transform active:scale-90" style={{ aspectRatio: "1/1", borderRadius: 12, background: on ? TOMATO : PAPER, color: on ? PAPER : INK, border: `2px solid ${INK}`, fontFamily: DISP, fontWeight: 700, fontSize: 17, boxShadow: on ? "0 5px 12px rgba(229,70,46,0.3)" : "none" }}>{n}</button>;
                })}
              </div>
              <div className="flex justify-between" style={{ marginTop: 8, fontFamily: HAND, fontSize: 13, color: "#8A857C" }}><span>just starting</span><span>every night</span></div>
            </div>
            <button onClick={() => setStage("allergies")} disabled={!goal} className="w-full transition-transform active:scale-[0.98] disabled:opacity-50" style={primaryBtn}>Next →</button>
          </div>
        )}

        {/* ─── Allergies ────────────────────────────────────────────────── */}
        {ready && stage === "allergies" && (
          <div className="flex flex-1 flex-col">
            <button onClick={() => setStage("goal")} className="self-start" style={backBtn}>←</button>
            <div className="flex flex-1 flex-col justify-center">
              <h1 style={stepH}>Anything we should <span style={{ color: TOMATO }}>cook around</span>?</h1>
              <p style={stepSub}>We&apos;ll keep these out of your suggestions.</p>
              <div className="flex gap-2" style={{ marginTop: 20 }}>
                <input value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCustom())} placeholder="type another…" className="flex-1" style={{ background: PAPER, border: `2px solid ${INK}`, borderRadius: 12, padding: "11px 14px", fontFamily: SANS, fontSize: 15, color: INK }} />
                {custom.trim() && <button onClick={addCustom} style={{ ...primaryBtn, fontSize: 14, padding: "0 16px" }}>Add</button>}
              </div>
              <div className="flex flex-wrap gap-2" style={{ marginTop: 14 }}>
                {Array.from(new Set([...ALLERGY_OPTIONS, ...allergies])).map((a) => {
                  const on = allergies.includes(a);
                  return <button key={a} onClick={() => toggleAllergy(a)} className="transition-transform active:scale-95" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14.5, color: on ? PAPER : INK, background: on ? TOMATO : PAPER, border: `2px solid ${INK}`, borderRadius: 99, padding: "8px 15px" }}>{a}</button>;
                })}
              </div>
            </div>
            <button onClick={() => setStage("household")} className="w-full transition-transform active:scale-[0.98]" style={primaryBtn}>{allergies.length ? "Next →" : "None — next →"}</button>
          </div>
        )}

        {/* ─── Household ────────────────────────────────────────────────── */}
        {ready && stage === "household" && (
          <div className="flex flex-1 flex-col">
            <button onClick={() => setStage("allergies")} className="self-start" style={backBtn}>←</button>
            <div className="flex flex-1 flex-col justify-center">
              <h1 style={stepH}>Who do you <span style={{ color: TOMATO }}>cook with</span>?</h1>
              <p style={stepSub}>Marco keeps your plan, list and recipes in sync with them.</p>
              <div className="grid grid-cols-2" style={{ gap: 10, marginTop: 24 }}>
                {HOUSEHOLDS.map((h) => {
                  const on = household === h.k;
                  return (
                    <button key={h.k} onClick={() => setHousehold(h.k)} className="flex flex-col items-start transition-transform active:scale-[0.97]" style={{ background: on ? h.c : PAPER, border: `2.5px solid ${INK}`, borderRadius: 16, padding: "16px 14px", boxShadow: on ? "0 8px 16px rgba(23,20,16,0.16)" : "none", transform: on ? "rotate(-1deg)" : "none" }}>
                      <span style={{ fontSize: 26 }}>{h.e}</span>
                      <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 16, color: INK, marginTop: 6 }}>{h.k}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <button onClick={() => setStage("ready")} disabled={!household} className="w-full transition-transform active:scale-[0.98] disabled:opacity-50" style={primaryBtn}>Next →</button>
          </div>
        )}

        {/* ─── Ready → text hand-off ────────────────────────────────────── */}
        {ready && stage === "ready" && (() => {
          const partner = household === "My partner" ? "your partner" : household === "My family" ? "your family" : household === "Roommates" ? "your roommates" : "";
          const groupReady = !!partner && memberPhone.replace(/[^\d+]/g, "").length >= 7;
          return (
            <div className="flex flex-1 flex-col">
              <button onClick={() => setStage("household")} className="self-start" style={backBtn}>←</button>
              <div className="flex flex-1 flex-col justify-center text-center">
                <div style={{ fontSize: 46 }}>🍅</div>
                <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 30, lineHeight: 1.04, color: INK, marginTop: 10 }}>You&apos;re all set, {name.trim() || "chef"}!</h1>
                <Squiggle center />
                <p className="mx-auto" style={{ fontFamily: SANS, fontSize: 15.5, color: "#4A4742", marginTop: 12, lineHeight: 1.5, maxWidth: "20rem" }}>
                  {partner ? <>Start a kitchen group chat with {partner} &amp; Marco — drop any recipe in and it&apos;s saved for you both.</> : <>The magic lives in your texts. Connect Marco and save recipes from any chat, plan by text, and cook with your people.</>}
                </p>
                {partner && (
                  <div className="mx-auto w-full" style={{ marginTop: 18, maxWidth: "20rem", textAlign: "left" }}>
                    {canPickContact && (
                      <button type="button" onClick={pickFromContacts} className="mb-2.5 flex w-full items-center justify-center gap-2 transition-transform active:scale-[0.98]" style={{ background: LIME, border: `2.5px solid ${INK}`, borderRadius: 14, padding: "12px 0", fontFamily: DISP, fontWeight: 700, fontSize: 16, color: INK }}>
                        <span aria-hidden>👤</span> {memberName ? `${memberName} selected · change` : "Pick from contacts"}
                      </button>
                    )}
                    <input type="tel" inputMode="tel" autoComplete="tel" value={memberPhone} onChange={e => { setMemberPhone(e.target.value); setMemberName(""); }} placeholder={`${partner === "your partner" ? "partner" : partner === "your family" ? "a family member" : "a roommate"}'s number`} className="block w-full" style={{ background: PAPER, border: `2.5px solid ${INK}`, borderRadius: 14, padding: "13px 16px", fontFamily: SANS, fontSize: 16, color: INK }} />
                    <p style={{ fontFamily: HAND, fontSize: 13.5, color: TOMATO, marginTop: 8, transform: "rotate(-1deg)" }}>we&apos;ll open a group chat with you, them &amp; Marco</p>
                  </div>
                )}
              </div>
              <button onClick={() => finish(true)} disabled={busy} className="w-full transition-transform active:scale-[0.98] disabled:opacity-60" style={primaryBtn}>{busy ? "Setting up…" : groupReady ? "Start our kitchen group chat →" : "Text Marco to start →"}</button>
              <button onClick={() => finish(false)} disabled={busy} style={{ fontFamily: HAND, fontSize: 15, color: INK, opacity: 0.6, background: "none", border: "none", marginTop: 14 }}>maybe later — take me in</button>
            </div>
          );
        })()}
      </div>
      <style>{`@keyframes ob-slide{0%{opacity:0;transform:translateX(20px)}100%{opacity:1;transform:translateX(0)}}@media (prefers-reduced-motion: reduce){[style*="ob-slide"]{animation:none !important}}`}</style>
    </div>
  );
}

const stepH: React.CSSProperties = { fontFamily: DISP, fontWeight: 700, fontSize: 28, lineHeight: 1.08, letterSpacing: "-0.01em", color: INK };
const stepSub: React.CSSProperties = { fontFamily: SANS, fontSize: 15, color: "#4A4742", marginTop: 10, lineHeight: 1.45 };
const backBtn: React.CSSProperties = { fontFamily: DISP, fontWeight: 700, fontSize: 16, color: INK, background: PAPER, border: `2px solid ${INK}`, borderRadius: 11, padding: "7px 14px", marginTop: 6 };

function Squiggle({ center }: { center?: boolean }) {
  return <svg width="150" height="11" viewBox="0 0 150 11" fill="none" aria-hidden className={center ? "mx-auto block" : "block"} style={{ marginTop: 2 }}><path d="M2 7 C 26 2, 50 10, 76 6 S 128 2, 148 6" stroke={TOMATO} strokeWidth="3.5" strokeLinecap="round" /></svg>;
}
