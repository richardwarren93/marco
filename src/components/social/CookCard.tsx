// The art-directed cook card — one of three treatments (polaroid / receipt /
// poster). Shared by the "I cooked" reveal and the Table feed so a posted cook
// looks the same everywhere and cooks visually vary by their saved treatment.

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const COBALT = "#2540E8";
const LIME = "#C4EE45";
const PINK = "#FF4D9D";
const BUTTER = "#FFD84D";
const DISP = '"Marker Felt", Georgia, serif';
const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
const SANS = "system-ui, -apple-system, sans-serif";
const MONO = "ui-monospace, monospace";

function Tape({ style }: { style?: React.CSSProperties }) {
  return <div style={{ position: "absolute", width: 82, height: 24, background: "rgba(255,216,77,0.82)", ...style }} />;
}
function Img({ photo, h }: { photo: string; h: number }) {
  if (!photo) return <div style={{ width: "100%", height: h, background: `linear-gradient(135deg, ${COBALT}, #101E63)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: h * 0.4 }} aria-hidden>🍳</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={photo} alt="" style={{ width: "100%", height: h, objectFit: "cover", display: "block" }} />;
}

export interface CookCardProps {
  treatment: string; // 'polaroid' | 'receipt' | 'poster'
  photo: string;
  title: string;
  note: string;
  authorName: string;
  authorAvatar?: string;
  timeLabel?: string;
  h?: number; // photo height (feed uses a smaller card than the reveal)
}

export default function CookCard(p: CookCardProps) {
  if (p.treatment === "receipt") return <Receipt {...p} />;
  if (p.treatment === "poster") return <Poster {...p} />;
  return <Polaroid {...p} />;
}

function Polaroid({ photo, title, note, authorName, timeLabel = "just now", h = 224 }: CookCardProps) {
  return (
    <div style={{ position: "relative", background: PAPER, borderRadius: 12, padding: 14, border: `2px solid ${INK}`, transform: "rotate(-1.4deg)", boxShadow: "0 18px 40px rgba(23,20,16,0.22)" }}>
      <div style={{ position: "relative", transform: "rotate(1.2deg)" }}>
        <Tape style={{ top: -8, left: "50%", marginLeft: -41, transform: "rotate(-4deg)" }} />
        <div style={{ background: "#fff", padding: 8, border: `1px solid rgba(23,20,16,0.12)` }}><Img photo={photo} h={h} /></div>
      </div>
      <div style={{ padding: "14px 4px 0" }}>
        <div style={{ fontFamily: SANS, fontSize: 13, color: INK }}><b>{authorName}</b> cooked · {timeLabel}</div>
        {title && <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 27, color: INK, lineHeight: 1.02, marginTop: 6 }}>{title}</div>}
        <svg width="180" height="11" viewBox="0 0 180 11" fill="none" aria-hidden style={{ marginTop: 3 }}><path d="M2 7 C 28 2, 52 10, 78 6 S 132 2, 178 6" stroke={TOMATO} strokeWidth="3.5" strokeLinecap="round" /></svg>
        {note && <div style={{ fontFamily: HAND, fontSize: 18, color: TOMATO, marginTop: 8, transform: "rotate(-1deg)" }}>{note}</div>}
      </div>
    </div>
  );
}

function Receipt({ photo, title, note, authorName, h = 200 }: CookCardProps) {
  return (
    <div style={{ position: "relative", background: "#fff", padding: "18px 18px 22px", border: `2px solid ${INK}`, transform: "rotate(1deg)", boxShadow: "0 18px 40px rgba(23,20,16,0.22)", backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 26px, rgba(23,20,16,0.05) 27px)" }}>
      <div className="text-center" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.22em", color: INK }}>· MARCO KITCHEN ·<br />FRESH OUT THE PAN</div>
      <div style={{ borderTop: `1.5px dashed ${INK}`, margin: "12px 0" }} />
      <div style={{ position: "relative", transform: "rotate(-1.6deg)", border: `2px solid ${INK}`, padding: 6, background: "#fff", width: "88%", margin: "0 auto" }}>
        <Img photo={photo} h={h} />
        <div style={{ position: "absolute", bottom: -12, right: -10, background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 13, padding: "5px 12px", borderRadius: 4, transform: "rotate(7deg)", border: `2px solid ${INK}` }}>COOKED ✓</div>
      </div>
      {title && <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 23, color: INK, marginTop: 20, textAlign: "center", lineHeight: 1.05 }}>{title}</div>}
      {note && <div style={{ fontFamily: HAND, fontSize: 17, color: COBALT, marginTop: 6, textAlign: "center" }}>&ldquo;{note}&rdquo;</div>}
      <div style={{ borderTop: `1.5px dashed ${INK}`, margin: "14px 0 8px" }} />
      <div className="text-center" style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", color: INK }}>by {authorName} · thank you · come again</div>
      <div style={{ display: "flex", gap: 2, justifyContent: "center", marginTop: 8 }}>{Array.from({ length: 28 }).map((_, i) => <span key={i} style={{ width: i % 3 ? 2 : 4, height: 22, background: INK }} />)}</div>
    </div>
  );
}

function Poster({ photo, title, note, authorName, authorAvatar = "?", timeLabel = "just now", h = 230 }: CookCardProps) {
  return (
    <div style={{ position: "relative", background: COBALT, borderRadius: 12, padding: 16, border: `2.5px solid ${INK}`, transform: "rotate(-1deg)", boxShadow: "0 18px 40px rgba(23,20,16,0.24)", overflow: "hidden" }}>
      <div className="absolute" style={{ top: 10, left: 12, fontFamily: MONO, fontSize: 11, letterSpacing: "0.2em", color: LIME }}>NOW COOKING</div>
      <div style={{ position: "relative", transform: "rotate(2deg)", border: `4px solid ${PAPER}`, marginTop: 26, boxShadow: "0 10px 20px rgba(0,0,0,0.35)" }}>
        <Img photo={photo} h={h} />
        <div style={{ position: "absolute", top: -14, right: -12, background: PINK, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 13, padding: "6px 12px", borderRadius: 99, transform: "rotate(10deg)", border: `2px solid ${INK}` }}>hot 🔥</div>
      </div>
      {title && <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 30, color: PAPER, lineHeight: 1.0, marginTop: 16, textShadow: `2px 2px 0 ${PINK}` }}>{title}</div>}
      {note && <div style={{ fontFamily: HAND, fontSize: 18, color: BUTTER, marginTop: 8 }}>{note}</div>}
      <div className="flex items-center gap-2" style={{ marginTop: 12 }}>
        <div className="flex items-center justify-center" style={{ width: 26, height: 26, borderRadius: 99, background: LIME, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 12, border: `1.5px solid ${INK}` }}>{(authorAvatar || "?").slice(0, 1)}</div>
        <span style={{ fontFamily: SANS, fontSize: 13, color: PAPER }}>{authorName} · {timeLabel}</span>
      </div>
    </div>
  );
}
