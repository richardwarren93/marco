"use client";

// A rotating PREVIEW of what a cook-card becomes — pure aspiration, never a real
// post. Used on the empty Table and the capture dropzone to make posting feel
// worth it. Clearly framed as "what yours will look like", so it's honest.

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

const EX = [
  { photo: "/food/meal1.jpg", title: "Shakshuka",         note: "15 min, one pan, unreal.",   accent: TOMATO, seat: LIME },
  { photo: "/food/meal3.jpg", title: "Cajun fish tacos",  note: "the char is the point.",     accent: COBALT, seat: BUTTER },
  { photo: "/food/meal5.jpg", title: "Extra crispy wings",note: "napkins ready.",             accent: PINK,   seat: LIME },
  { photo: "/food/meal6.jpg", title: "Beef dumpling stew",note: "dumplings that hug back.",   accent: TOMATO, seat: PINK },
];

export default function CardPeek({ h = 150 }: { h?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % EX.length), 2600);
    return () => clearInterval(t);
  }, []);
  const e = EX[i];
  return (
    <div style={{ position: "relative" }}>
      <div key={i} style={{ animation: "cpFade .55s ease", background: PAPER, border: `2px solid ${INK}`, borderRadius: 12, padding: 12, transform: "rotate(-1.6deg)", boxShadow: "0 14px 30px rgba(23,20,16,0.22)" }}>
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
      <style>{`@keyframes cpFade{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  );
}
