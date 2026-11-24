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
  | "plateEmpty" | "plateCovered" | "plateFood"
  | "nameCard" | "glass" | "candle" | "flame"
  | "spark";

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
    case "plateCovered": {
      g.ellipse(0, 4, 30, 19);
      inked(g, PAPER);
      // the cloche
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
  }
}

export type TextureBank = Record<TextureName, Texture>;

const NAMES: TextureName[] = ["chair", "chairBack", "plateEmpty", "plateCovered", "plateFood", "nameCard", "glass", "candle", "flame", "spark"];

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
