/* The placeholder art, drawn once and reused as textures.
 *
 * The spec asks for transparent sprites with a consistent perspective, grouped
 * into atlases, and explicitly allows temporary illustrated assets so long as
 * swapping them does not touch interaction logic. This is that seam: every
 * object in the scene asks this factory for a Texture by name and knows
 * nothing about where it came from. Replacing these with real PNGs means
 * changing `make()` and nothing else.
 *
 * They are drawn rather than emoji on purpose — the spec rules emoji out as
 * final artwork, and a glyph cannot carry the ink outline and flat fills the
 * rest of Marco is built from.
 *
 * One Texture per kind, shared by every Sprite that uses it, which is the
 * atlas benefit without an atlas.
 */

import { Graphics, Texture, type Renderer } from "pixi.js";

export type TextureName =
  | "chair" | "chairBack"
  | "plateEmpty" | "cloche" | "plateFood"
  | "nameCard" | "glass" | "candle" | "flame"
  | "spark" | "steam"
  | "body" | "head" | "eyes" | "blink" | "smile"
  | "flowers" | "cutlery";

const INK = 0x171410;
const PAPER = 0xfbf7ee;
const CREAM_WARM = 0xefe5d2;
const BUTTER = 0xffd84d;
const WOOD = 0xc9a227;

/** Flat fill, ink outline — the same two moves as everything else in the app. */
function inked(g: Graphics, fill: number, width = 3) {
  g.fill({ color: fill }).stroke({ width, color: INK, alignment: 0.5 });
}

function draw(name: TextureName): Graphics {
  const g = new Graphics();
  switch (name) {
    case "chair": {
      g.roundRect(-26, -18, 52, 36, 7);
      inked(g, WOOD);
      g.roundRect(-20, -12, 40, 10, 4).fill({ color: 0x000000, alpha: 0.08 });
      return g;
    }
    case "chairBack": {
      g.roundRect(-24, -34, 48, 30, 8);
      inked(g, WOOD);
      g.moveTo(-10, -30).lineTo(-10, -8).stroke({ width: 2.5, color: INK, alpha: 0.5 });
      g.moveTo(10, -30).lineTo(10, -8).stroke({ width: 2.5, color: INK, alpha: 0.5 });
      return g;
    }
    case "plateEmpty": {
      g.ellipse(0, 0, 30, 20);
      inked(g, PAPER);
      g.ellipse(0, 0, 21, 13).stroke({ width: 2, color: INK, alpha: 0.25 });
      return g;
    }
    // The cloche is its OWN texture, not part of a "covered plate". A lid that
    // cannot be lifted away from the plate under it is not a reveal, and the
    // reveal is the moment the whole feature is built around.
    case "cloche": {
      g.moveTo(-24, 3).arc(0, 3, 24, Math.PI, 0).closePath();
      inked(g, CREAM_WARM, 3);
      g.circle(0, -22, 4);
      inked(g, CREAM_WARM, 2.5);
      return g;
    }
    case "plateFood": {
      g.ellipse(0, 0, 30, 20);
      inked(g, PAPER);
      g.ellipse(0, -1, 19, 12);
      inked(g, BUTTER, 2.5);
      return g;
    }
    case "nameCard": {
      g.moveTo(-28, 0).lineTo(28, 0).lineTo(26, -17).lineTo(-26, -17).closePath();
      inked(g, PAPER, 2.5);
      g.moveTo(-16, -7).lineTo(16, -7).stroke({ width: 2, color: INK, alpha: 0.28 });
      return g;
    }
    case "glass": {
      g.moveTo(-7, -16).lineTo(7, -16).lineTo(5, 6).lineTo(-5, 6).closePath();
      inked(g, 0xdfeef2, 2.2);
      return g;
    }
    case "candle": {
      g.roundRect(-5, -20, 10, 26, 3);
      inked(g, PAPER, 2.2);
      return g;
    }
    case "flame": {
      g.ellipse(0, 0, 4.5, 7).fill({ color: 0xffb020 });
      g.ellipse(0, 1.5, 2.2, 3.6).fill({ color: 0xffe9a8 });
      return g;
    }
    case "spark": {
      g.star(0, 0, 4, 7, 2.6).fill({ color: BUTTER });
      return g;
    }
    // An ink curl, not a white puff. White steam over a cream tabletop is
    // invisible — it was drawn, it rose, and nobody could see it. Everything
    // else in Marco is an ink line on paper; so is this.
    // ── the people ────────────────────────────────────────────────────────
    // Tinted per seat, so one body texture dresses the whole table.
    case "body": {
      g.moveTo(-20, 26).bezierCurveTo(-22, -2, 22, -2, 20, 26).closePath();
      inked(g, 0xffffff, 3);
      return g;
    }
    case "head": {
      g.circle(0, 0, 17);
      inked(g, 0xf6d9bd, 3);
      return g;
    }
    case "eyes": {
      g.circle(-6, 0, 2.6).fill({ color: INK });
      g.circle(6, 0, 2.6).fill({ color: INK });
      return g;
    }
    // The same two eyes, shut. Swapping textures reads better at this size
    // than squashing a sprite, which just makes two grey smears.
    case "blink": {
      g.moveTo(-9, 0).lineTo(-3, 0).stroke({ width: 2.6, color: INK, cap: "round" });
      g.moveTo(3, 0).lineTo(9, 0).stroke({ width: 2.6, color: INK, cap: "round" });
      return g;
    }
    case "smile": {
      g.moveTo(-5, 0).quadraticCurveTo(0, 5, 5, 0).stroke({ width: 2.2, color: INK, cap: "round" });
      return g;
    }
    // ── the table's furniture ─────────────────────────────────────────────
    case "flowers": {
      g.moveTo(0, 22).lineTo(0, 2).stroke({ width: 2.5, color: 0x5b7a3a });
      g.moveTo(0, 14).lineTo(-7, 8).stroke({ width: 2, color: 0x5b7a3a });
      g.moveTo(0, 10).lineTo(7, 4).stroke({ width: 2, color: 0x5b7a3a });
      for (const [cx, cy, c] of [[0, -4, 0xff4d9d], [-8, 6, BUTTER], [8, 2, 0xc9b8ff]] as [number, number, number][]) {
        g.circle(cx, cy, 5.5);
        inked(g, c, 2.2);
      }
      return g;
    }
    case "cutlery": {
      g.moveTo(-2, -9).lineTo(-2, 9).stroke({ width: 2.4, color: INK, alpha: 0.5, cap: "round" });
      g.moveTo(3, -9).lineTo(3, 9).stroke({ width: 2.4, color: INK, alpha: 0.5, cap: "round" });
      return g;
    }
    case "steam": {
      g.moveTo(0, 14)
        .bezierCurveTo(-9, 6, 9, 0, 0, -8)
        .bezierCurveTo(-8, -14, 6, -18, 2, -24)
        .stroke({ width: 3, color: INK, alpha: 0.55, cap: "round" });
      return g;
    }
  }
}

export type TextureBank = Record<TextureName, Texture>;

const NAMES: TextureName[] = ["chair", "chairBack", "plateEmpty", "cloche", "plateFood", "nameCard", "glass", "candle", "flame", "spark", "steam", "body", "head", "eyes", "blink", "smile", "flowers", "cutlery"];

export function makeTextures(renderer: Renderer): TextureBank {
  const bank = {} as TextureBank;
  for (const name of NAMES) {
    const g = draw(name);
    // Generated at 2x so the sprites stay crisp when the camera zooms in.
    bank[name] = renderer.generateTexture({ target: g, resolution: 2, antialias: true });
    g.destroy();
  }
  return bank;
}

export function destroyTextures(bank: TextureBank) {
  for (const name of NAMES) bank[name]?.destroy(true);
}
