/* The shareable card: the same table, drawn as a poster you can send.
 *
 * Drawn on a 2D canvas rather than rasterised from the DOM, for two reasons.
 *
 *   1. No new dependency. html2canvas and friends are ~200KB to reproduce a
 *      layout the browser has already laid out, badly.
 *   2. Fonts. An <svg> serialised into an <img> is an isolated document — it
 *      cannot see the page's fonts, so Marker Felt would silently become
 *      Times. Canvas draws with the fonts the document already has.
 *
 * And nothing here loads a remote image, so the canvas is never tainted and
 * `toBlob` always works. That is why the table is plates rather than photos.
 */

import { BUTTER, CREAM_WARM, INK, INK_SOFT, LAV, LIME, MUSTARD_SOFT, PAPER, PINK, SURFACE, TOMATO } from "@/lib/theme";
import type { TablePlate } from "./PotluckTable";

const W = 1080, H = 1350;
const COLOURS = [LIME, BUTTER, LAV, MUSTARD_SOFT, PINK, CREAM_WARM];
const MAX_PLATES = 11;

/** The real family list behind `var(--font-chaos)`, which canvas cannot read. */
function family(varName: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v || fallback;
}

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > max) s = s.slice(0, -1);
  return `${s}…`;
}

export type CardInput = {
  theme: string;
  tableName: string;
  plates: TablePlate[];
  /** e.g. "3 coming · 1 cooked" — the same line the card shows on screen. */
  status: string;
  open: boolean;
  /* A photograph of the real scene, when the card is being made from the room
     rather than from the list. Drawing the actual table — its guests, its
     bunting, its seasonal cloth — beats re-drawing an approximation of it, and
     it is only possible because nothing in that scene is cross-origin. The
     drawn version below stays for the list card, which has no scene. */
  scene?: HTMLCanvasElement | null;
};

export function drawCard(canvas: HTMLCanvasElement, input: CardInput) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = W; canvas.height = H;

  const disp = family("--font-chaos", "Georgia, serif");
  const hand = family("--font-hand", "cursive");

  // paper
  ctx.fillStyle = SURFACE;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(23,20,16,0.05)";
  for (let y = 20; y < H; y += 34) for (let x = 20; x < W; x += 34) { ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill(); }

  // the card itself, with the hard offset shadow
  const cx = 64, cy = 64, cw = W - 128, ch = H - 128;
  ctx.fillStyle = INK;
  rounded(ctx, cx + 11, cy + 13, cw, ch, 38); ctx.fill();
  ctx.fillStyle = PAPER;
  rounded(ctx, cx, cy, cw, ch, 38); ctx.fill();
  ctx.lineWidth = 7; ctx.strokeStyle = INK;
  rounded(ctx, cx, cy, cw, ch, 38); ctx.stroke();

  // theme
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.font = `700 ${input.theme.length > 22 ? 64 : 78}px ${disp}`;
  ctx.fillText(ellipsize(ctx, input.theme, cw - 120), W / 2, 230);

  ctx.fillStyle = TOMATO;
  ctx.font = `44px ${hand}`;
  ctx.fillText(ellipsize(ctx, `${input.tableName} · ${input.status}`, cw - 120), W / 2, 296);

  // The real table, if we were handed one.
  if (input.scene && input.scene.width > 0) {
    const box = { x: cx + 36, y: 350, w: cw - 72, h: 560 };
    const r = Math.min(box.w / input.scene.width, box.h / input.scene.height);
    const dw = input.scene.width * r, dh = input.scene.height * r;
    ctx.drawImage(input.scene, box.x + (box.w - dw) / 2, box.y + (box.h - dh) / 2, dw, dh);
    drawLegend(ctx, input, cx, cw, disp);
    ctx.textAlign = "center";
    ctx.fillStyle = TOMATO;
    ctx.font = `700 34px ${disp}`;
    ctx.fillText("marco", W / 2, H - 112);
    return;
  }

  // the table
  const TCX = W / 2, TCY = 740, TR = 300, RING = 246;
  ctx.fillStyle = CREAM_WARM;
  ctx.beginPath(); ctx.arc(TCX, TCY, TR, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke();
  ctx.lineWidth = 2; ctx.globalAlpha = 0.25;
  ctx.beginPath(); ctx.arc(TCX, TCY, TR - 24, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;

  const shown = input.plates.slice(0, MAX_PLATES);
  const spares = input.open ? 2 : 0;
  const total = shown.length + spares;
  const pr = total <= 6 ? 70 : total <= 9 ? 60 : 52;

  const at = (i: number) => {
    const a = ((-90 + (360 / Math.max(total, 1)) * i) * Math.PI) / 180;
    return { x: TCX + RING * Math.cos(a), y: TCY + RING * Math.sin(a) };
  };

  shown.forEach((p, i) => {
    const { x, y } = at(i);
    ctx.beginPath(); ctx.arc(x, y, pr, 0, Math.PI * 2);
    ctx.fillStyle = p.cooked ? COLOURS[i % COLOURS.length] : PAPER;
    ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = INK;
    ctx.stroke();
    // A promised plate is laid but empty — solid edge, no colour. Only the
    // spare rings are dashed, so the two never read as the same thing.
    ctx.globalAlpha = p.cooked ? 1 : 0.55;
    ctx.fillStyle = INK;
    ctx.font = `700 ${Math.round(pr * 0.74)}px ${disp}`;
    ctx.fillText(p.label.slice(0, 1).toUpperCase(), x, y + pr * 0.26);
    ctx.globalAlpha = 1;
  });

  for (let k = 0; k < spares; k++) {
    const { x, y } = at(shown.length + k);
    ctx.beginPath(); ctx.arc(x, y, pr, 0, Math.PI * 2);
    ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.globalAlpha = 0.4;
    ctx.setLineDash([7, 14]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  }

  // middle: the count
  ctx.fillStyle = INK;
  ctx.font = `700 110px ${disp}`;
  ctx.fillText(String(input.plates.length), TCX, TCY + 18);
  ctx.fillStyle = INK_SOFT;
  ctx.font = `700 34px ${disp}`;
  ctx.fillText(input.plates.length === 1 ? "DISH" : "DISHES", TCX, TCY + 64);

  drawLegend(ctx, input, cx, cw, disp);

  // wordmark
  ctx.textAlign = "center";
  ctx.fillStyle = TOMATO;
  ctx.font = `700 34px ${disp}`;
  ctx.fillText("marco", W / 2, H - 112);
}

/** Who brought what, two columns, up to eight. */
function drawLegend(ctx: CanvasRenderingContext2D, input: CardInput, cx: number, cw: number, disp: string) {
  ctx.textAlign = "left";
  const list = input.plates.slice(0, 8);
  list.forEach((p, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = cx + 58 + col * ((cw - 116) / 2);
    const y = 1105 + row * 46;
    ctx.beginPath(); ctx.arc(x + 11, y - 11, 11, 0, Math.PI * 2);
    ctx.fillStyle = p.cooked ? COLOURS[i % COLOURS.length] : PAPER;
    ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = `700 26px ${disp}`;
    // Trim the DISH, never the person. "Sticky toffee pudding — y…" tells you
    // nothing; "Sticky toffee pud… — you" tells you who is bringing it.
    const room = (cw - 140) / 2 - 40;
    const tail = ` — ${p.who}`;
    const label = ellipsize(ctx, p.label, Math.max(60, room - ctx.measureText(tail).width));
    ctx.fillText(label + tail, x + 32, y);
  });
}

async function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

export type ShareResult = "shared" | "downloaded" | "failed";

/** Share the poster as a PNG, or save it when the browser cannot share files. */
export async function sharePotluckCard(input: CardInput): Promise<ShareResult> {
  try {
    const canvas = document.createElement("canvas");
    drawCard(canvas, input);
    const blob = await toBlob(canvas);
    if (!blob) return "failed";
    const file = new File([blob], `potluck-${input.theme.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "table"}.png`, { type: "image/png" });

    // canShare({files}) is the only honest test — Safari and Chrome both have
    // navigator.share without necessarily accepting files.
    if (navigator.canShare?.({ files: [file] }) && navigator.share) {
      await navigator.share({ files: [file], title: input.theme, text: `${input.tableName} · ${input.status}` });
      return "shared";
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return "downloaded";
  } catch (e) {
    // A share the person cancelled is not a failure worth shouting about.
    if (e instanceof DOMException && e.name === "AbortError") return "shared";
    return "failed";
  }
}
