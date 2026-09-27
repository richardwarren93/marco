"use client";

// A rotating PREVIEW of the post transformation: a raw camera shot → the
// art-directed card, alternating (camera → card → camera → card) so it teaches
// "you snap this, Marco makes it that". Pure aspiration, never a real post.

import { useEffect, useState } from "react";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const LIME = "#C4EE45";
const PINK = "#FF4D9D";
const BUTTER = "#FFD84D";
const COBALT = "#2540E8";
const DISP = '"Marker Felt", Georgia, serif';
const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
const SANS = "system-ui, -apple-system, sans-serif";
const MONO = "ui-monospace, monospace";

const EX = [
  { photo: "/food/meal1.jpg", title: "Shakshuka",         note: "15 min, one pan, unreal.",   accent: TOMATO, seat: LIME },
  { photo: "/food/meal3.jpg", title: "Cajun fish tacos",  note: "the char is the point.",     accent: COBALT, seat: BUTTER },
  { photo: "/food/meal5.jpg", title: "Extra crispy wings",note: "napkins ready.",             accent: PINK,   seat: LIME },
  { photo: "/food/meal6.jpg", title: "Beef dumpling stew",note: "dumplings that hug back.",   accent: TOMATO, seat: PINK },
];

function Corner({ at }: { at: "tl" | "tr" | "bl" | "br" }) {
  const s: React.CSSProperties = { position: "absolute", width: 15, height: 15, borderColor: PAPER, borderStyle: "solid", borderWidth: 0 };
  if (at === "tl") { s.top = 7; s.left = 7; s.borderTopWidth = 3; s.borderLeftWidth = 3; }
  if (at === "tr") { s.top = 7; s.right = 7; s.borderTopWidth = 3; s.borderRightWidth = 3; }
  if (at === "bl") { s.bottom = 7; s.left = 7; s.borderBottomWidth = 3; s.borderLeftWidth = 3; }
  if (at === "br") { s.bottom = 7; s.right = 7; s.borderBottomWidth = 3; s.borderRightWidth = 3; }
  return <div style={s} aria-hidden />;
}

export default function CardPeek({ h = 150, label, fullBleed = false }: { h?: number; label?: string; fullBleed?: boolean }) {
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<"camera" | "card">("camera");

  useEffect(() => {
    const t = setTimeout(() => {
      if (phase === "camera") setPhase("card");
      else { setPhase("camera"); setI((v) => (v + 1) % EX.length); }
    }, phase === "camera" ? 1400 : 2300);
    return () => clearTimeout(t);
  }, [phase, i]);

  const e = EX[i];

  // Full-screen mode: the viewfinder and the food image each fill the whole
  // screen, alternating — an immersive "camera".
  if (fullBleed) {
    const brackets = [
      { top: 24, left: 24, bt: 1, bl: 1 }, { top: 24, right: 24, bt: 1, br: 1 },
      { bottom: 24, left: 24, bb: 1, bl: 1 }, { bottom: 24, right: 24, bb: 1, br: 1 },
    ];
    return (
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#0E0C0A" }}>
        {phase === "camera" ? (
          <div key={`cam${i}`} style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", animation: "cpFade .45s ease" }}>
            {brackets.map((b, k) => (
              <div key={k} style={{ position: "absolute", top: b.top, bottom: b.bottom, left: b.left, right: b.right, width: 28, height: 28, borderColor: PAPER, borderStyle: "solid", borderWidth: 0, opacity: 0.85, borderTopWidth: b.bt ? 4 : 0, borderBottomWidth: b.bb ? 4 : 0, borderLeftWidth: b.bl ? 4 : 0, borderRightWidth: b.br ? 4 : 0 }} />
            ))}
            <div style={{ position: "absolute", top: 26, right: 58, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 9, height: 9, borderRadius: 99, background: TOMATO, display: "inline-block" }} className="cpPulse" />
              <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.2em", color: PAPER }}>SNAP</span>
            </div>
            <span style={{ fontSize: 94 }} aria-hidden>📸</span>
            {label && <div style={{ position: "absolute", bottom: 64, left: 0, right: 0, textAlign: "center", fontFamily: DISP, fontWeight: 700, fontSize: 23, color: PAPER }}>{label}</div>}
          </div>
        ) : (
          <div key={`card${i}`} className="flex items-center justify-center" style={{ position: "absolute", inset: 0, padding: "0 26px", animation: "cpFade .5s ease" }}>
            <div style={{ width: "100%", maxWidth: 330, background: PAPER, border: `2.5px solid ${INK}`, borderRadius: 14, padding: 14, transform: "rotate(-1.6deg)", boxShadow: "0 26px 54px rgba(0,0,0,0.55)" }}>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", top: -9, left: "50%", marginLeft: -42, width: 84, height: 24, background: "rgba(255,216,77,0.85)", transform: "rotate(-4deg)" }} />
                <div style={{ background: "#fff", padding: 8, border: "1px solid rgba(23,20,16,0.12)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={e.photo} alt="" style={{ width: "100%", height: 300, objectFit: "cover", display: "block" }} />
                </div>
              </div>
              <div className="flex items-center gap-2" style={{ marginTop: 12 }}>
                <div className="flex items-center justify-center" style={{ width: 22, height: 22, borderRadius: 99, background: e.seat, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 10, border: `1.5px solid ${INK}` }}>you</div>
                <span style={{ fontFamily: SANS, fontSize: 12.5, color: INK }}><b>you</b> cooked · just now</span>
              </div>
              <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 24, color: INK, marginTop: 8, lineHeight: 1.03 }}>{e.title}</div>
              <div style={{ fontFamily: HAND, fontSize: 17, color: e.accent, marginTop: 3 }}>{e.note}</div>
            </div>
          </div>
        )}
        <style>{`@keyframes cpFade{from{opacity:0}to{opacity:1}}@keyframes cpP{0%,100%{opacity:.3}50%{opacity:1}}.cpPulse{animation:cpP 1s infinite}`}</style>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", minHeight: h + 150 }}>
      {phase === "camera" ? (
        // the "you snap it" beat — a camera viewfinder, no photo yet
        <div key={`cam${i}`} style={{ animation: "cpFade .4s ease", position: "relative", background: INK, borderRadius: 12, transform: "rotate(1.4deg)", boxShadow: "0 14px 30px rgba(23,20,16,0.22)", height: h + 116, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Corner at="tl" /><Corner at="tr" /><Corner at="bl" /><Corner at="br" />
          <div style={{ position: "absolute", top: 12, right: 14, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: TOMATO, display: "inline-block" }} className="cpPulse" />
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.18em", color: PAPER }}>SNAP</span>
          </div>
          <span style={{ fontSize: 66 }} aria-hidden>📸</span>
          {label && <div style={{ position: "absolute", bottom: 16, left: 0, right: 0, textAlign: "center", fontFamily: DISP, fontWeight: 700, fontSize: 18, color: PAPER }}>{label}</div>}
        </div>
      ) : (
        // the art-directed card
        <div key={`card${i}`} style={{ animation: "cpRise .45s ease", background: PAPER, border: `2px solid ${INK}`, borderRadius: 12, padding: 12, transform: "rotate(-1.6deg)", boxShadow: "0 14px 30px rgba(23,20,16,0.22)" }}>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", top: -8, left: "50%", marginLeft: -38, width: 76, height: 22, background: "rgba(255,216,77,0.85)", transform: "rotate(-4deg)" }} />
            <div style={{ background: "#fff", padding: 6, border: "1px solid rgba(23,20,16,0.12)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={e.photo} alt="" style={{ width: "100%", height: h, objectFit: "cover", display: "block" }} />
            </div>
          </div>
          <div className="flex items-center gap-2" style={{ marginTop: 10 }}>
            <div className="flex items-center justify-center" style={{ width: 20, height: 20, borderRadius: 99, background: e.seat, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 10, border: `1.5px solid ${INK}` }}>you</div>
            <span style={{ fontFamily: SANS, fontSize: 11.5, color: INK }}><b>you</b> cooked · just now</span>
          </div>
          <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 20, color: INK, marginTop: 6, lineHeight: 1.04 }}>{e.title}</div>
          <div style={{ fontFamily: HAND, fontSize: 15, color: e.accent, marginTop: 2 }}>{e.note}</div>
        </div>
      )}
      <style>{`@keyframes cpFade{from{opacity:0}to{opacity:1}}@keyframes cpRise{from{opacity:0;transform:rotate(-1.6deg) translateY(8px)}to{opacity:1;transform:rotate(-1.6deg) translateY(0)}}@keyframes cpP{0%,100%{opacity:.3}50%{opacity:1}}.cpPulse{animation:cpP 1s infinite}`}</style>
    </div>
  );
}
