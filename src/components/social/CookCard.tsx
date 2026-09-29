// The art-directed cook card — one of three treatments (polaroid / receipt /
// poster). Shared by the "I cooked" reveal and the Table feed so a posted cook
// looks the same everywhere and cooks visually vary by their saved treatment.
// In the feed, the recipe actions live INSIDE the card's border (so it's
// unambiguous they belong to this cook, not the one above or below).

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
  cookedCount?: number; // times this recipe has been cooked (lineage size) — a stamp
  // Recipe actions (feed only). When onCook is set, a labeled action bar renders
  // INSIDE the card's border. onOpen makes the card tap-to-open-recipe.
  onOpen?: () => void;
  onCook?: () => void;
  onToggleSave?: () => void; // toggle save/unsave (omitted for your own cook = static "saved")
  onPlan?: () => void;
  saved?: boolean;
}

export default function CookCard(p: CookCardProps) {
  if (p.treatment === "receipt") return <Receipt {...p} />;
  if (p.treatment === "poster") return <Poster {...p} />;
  return <Polaroid {...p} />;
}

// "cooked N×" stamp — social proof, in the cards' own badge language. Shown only
// once a recipe has more than one cook in its lineage.
function CountStamp({ n, style }: { n: number; style?: React.CSSProperties }) {
  if (!n || n < 2) return null;
  return (
    <div style={{ position: "absolute", zIndex: 4, background: BUTTER, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 12, padding: "4px 9px", borderRadius: 99, border: `2px solid ${INK}`, boxShadow: "0 3px 8px rgba(23,20,16,0.22)", whiteSpace: "nowrap", ...style }}>🍳 {n}×</div>
  );
}

// The labeled recipe actions, rendered INSIDE the card. "I cooked this" leads
// (it grows the lineage); save + meal-plan sit under it. Tone adapts to the
// card's background so outlines read on light (paper) or dark (cobalt).
function CardActions({ tone, saved, onCook, onToggleSave, onPlan }: { tone: "light" | "dark"; saved?: boolean; onCook?: () => void; onToggleSave?: () => void; onPlan?: () => void }) {
  if (!onCook) return null;
  const dark = tone === "dark";
  const line = dark ? "rgba(251,247,238,0.30)" : "rgba(23,20,16,0.14)";
  const edge = dark ? PAPER : INK;
  const txt = dark ? PAPER : INK;
  const stop = (fn?: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn?.(); };
  return (
    <div style={{ marginTop: 14, borderTop: `1.5px solid ${line}`, paddingTop: 12 }}>
      <button onClick={stop(onCook)} className="w-full flex items-center justify-center gap-2 active:scale-[0.98] transition-transform" style={{ background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 16, padding: "12px 0", borderRadius: 11, border: `2px solid ${INK}` }}><span aria-hidden>🍳</span> I cooked this</button>
      <div className="flex gap-2" style={{ marginTop: 8 }}>
        <button onClick={stop(onPlan)} className="flex-1 flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform" style={{ background: "transparent", color: txt, fontFamily: DISP, fontWeight: 700, fontSize: 14, padding: "10px 0", borderRadius: 11, border: `2px solid ${edge}` }}><span aria-hidden>📅</span> Meal plan</button>
        <BookmarkBtn saved={saved} edge={edge} onToggle={onToggleSave} />
      </div>
    </div>
  );
}

// Save = a bookmark that fills when the recipe is in your kitchen. Tap to
// toggle (save/unsave). With no onToggle it's a static "saved" mark — used on
// your own cook, which is inherently in your kitchen.
function BookmarkBtn({ saved, edge, onToggle }: { saved?: boolean; edge: string; onToggle?: () => void }) {
  const icon = (
    <svg width="19" height="19" viewBox="0 0 24 24" fill={saved ? edge : "none"} stroke={edge} strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5z" />
    </svg>
  );
  const box: React.CSSProperties = { width: 52, borderRadius: 11, border: `2px solid ${edge}`, background: saved ? (edge === PAPER ? "rgba(251,247,238,0.14)" : "rgba(23,20,16,0.06)") : "transparent" };
  if (!onToggle) {
    return <div className="flex items-center justify-center" style={box} aria-label="In your kitchen" title="In your kitchen">{icon}</div>;
  }
  return (
    <button onClick={(e) => { e.stopPropagation(); onToggle(); }} aria-pressed={!!saved} aria-label={saved ? "In your kitchen — tap to remove" : "Save to your kitchen"} className="flex items-center justify-center active:scale-90 transition-transform" style={box}>
      {icon}
    </button>
  );
}

function openProps(onOpen?: () => void): React.HTMLAttributes<HTMLDivElement> {
  if (!onOpen) return {};
  return { onClick: onOpen, role: "button", tabIndex: 0, style: { cursor: "pointer" } };
}

function Polaroid({ photo, title, note, authorName, timeLabel = "just now", h = 224, cookedCount, onOpen, onCook, onToggleSave, onPlan, saved }: CookCardProps) {
  const op = openProps(onOpen);
  return (
    <div {...op} style={{ position: "relative", background: PAPER, borderRadius: 12, padding: 14, border: `2px solid ${INK}`, transform: "rotate(-1.4deg)", boxShadow: "0 18px 40px rgba(23,20,16,0.22)", ...op.style }}>
      <CountStamp n={cookedCount ?? 0} style={{ top: 4, left: -6, transform: "rotate(-7deg)" }} />
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
      <CardActions tone="light" saved={saved} onCook={onCook} onToggleSave={onToggleSave} onPlan={onPlan} />
    </div>
  );
}

function Receipt({ photo, title, note, authorName, h = 200, cookedCount, onOpen, onCook, onToggleSave, onPlan, saved }: CookCardProps) {
  const op = openProps(onOpen);
  return (
    <div {...op} style={{ position: "relative", background: "#fff", padding: "18px 18px 22px", border: `2px solid ${INK}`, transform: "rotate(1deg)", boxShadow: "0 18px 40px rgba(23,20,16,0.22)", backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 26px, rgba(23,20,16,0.05) 27px)", ...op.style }}>
      <CountStamp n={cookedCount ?? 0} style={{ top: 6, left: -6, transform: "rotate(-7deg)" }} />
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
      <CardActions tone="light" saved={saved} onCook={onCook} onToggleSave={onToggleSave} onPlan={onPlan} />
    </div>
  );
}

function Poster({ photo, title, note, authorName, authorAvatar = "?", timeLabel = "just now", h = 230, cookedCount, onOpen, onCook, onToggleSave, onPlan, saved }: CookCardProps) {
  const op = openProps(onOpen);
  return (
    <div {...op} style={{ position: "relative", background: COBALT, borderRadius: 12, padding: 16, border: `2.5px solid ${INK}`, transform: "rotate(-1deg)", boxShadow: "0 18px 40px rgba(23,20,16,0.24)", overflow: "hidden", ...op.style }}>
      <div className="absolute" style={{ top: 10, left: 12, fontFamily: MONO, fontSize: 11, letterSpacing: "0.2em", color: LIME }}>NOW COOKING</div>
      <CountStamp n={cookedCount ?? 0} style={{ top: 8, right: 12, transform: "rotate(6deg)" }} />
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
      <CardActions tone="dark" saved={saved} onCook={onCook} onToggleSave={onToggleSave} onPlan={onPlan} />
    </div>
  );
}
