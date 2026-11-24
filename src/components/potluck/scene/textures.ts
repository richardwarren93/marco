/* The sprite set, loaded rather than drawn.
 *
 * This file used to BE the artwork: a switch statement of Graphics calls that
 * produced ellipses and rounded rectangles. That was a greybox, and no amount
 * of better circles would have fixed it, because a flat ellipse is not a table
 * seen from anywhere.
 *
 * The art is now rendered in Blender through one fixed orthographic camera
 * (tools/blender/potluck_assets.py) and loaded here. Two numbers travel with
 * each sprite and they are what make the set usable:
 *
 *   metres — how wide its frame is in the modelled room, so a candle and a
 *            dining table can be sized against EACH OTHER rather than each
 *            being stretched to fill its own frame.
 *   anchor — where the object's own origin sits inside that frame, so a chair
 *            can be placed by the spot it stands on instead of by eye.
 *
 * The one thing still drawn here is the contact shadow: a soft radial blob is
 * cheaper as a gradient than as a render, and it needs to be tinted and
 * squashed per object anyway.
 */

import { Assets, Graphics, Texture, type Renderer } from "pixi.js";

export type SpriteName =
  | "floor" | "rug" | "table" | "cloth" | "chair"
  | "plate" | "cloche" | "food"
  | "candle" | "plant" | "flowers"
  /* Four people, not one person tinted four ways: a tint multiplies the whole
     sprite, so recolouring one render gave a red guest with red skin and red
     hair. See GUEST_LOOKS in tools/blender/potluck_assets.py. */
  | "guest1" | "guest2" | "guest3" | "guest4";

export const GUEST_SPRITES: SpriteName[] = ["guest1", "guest2", "guest3", "guest4"];

/* What is still DRAWN, and why each one earns it.
 *
 * The spec's objection is to geometric shapes standing in for artwork — a
 * flat ellipse pretending to be a table. None of these pretend to be an
 * object in the room:
 *
 *   nameCard  UI, not furniture: a paper tag with a name typeset on it. It
 *             has to take arbitrary text, so it cannot be a fixed render.
 *   spark / steam / confetti / heart
 *             particles, spawned by the dozen and tinted and scaled per
 *             instance. A rendered sprite would be heavier and no truer.
 *   shadow    a soft radial gradient, squashed and tinted per object.
 */
export type EffectName = "nameCard" | "spark" | "steam" | "confetti" | "heart" | "shadow";

export type SpriteInfo = {
  texture: Texture;
  /** Width of the rendered frame, in metres of the modelled room. */
  metres: number;
  /** The object's own origin within the frame, 0..1 across and down. */
  anchor: [number, number];
};

export type Basis = { right: [number, number, number]; up: [number, number, number] };

export type SpriteBank = {
  sprites: Record<SpriteName, SpriteInfo>;
  /** The handful of things still drawn — see the note above. */
  fx: Record<EffectName, Texture>;
  /** The camera axes the set was rendered through. */
  basis: Basis;
};

type Manifest = {
  pixels: number;
  right: [number, number, number];
  up: [number, number, number];
  sprites: Record<string, { metres: number; anchor: [number, number] }>;
};

const NAMES: SpriteName[] = [
  "floor", "rug", "table", "cloth", "chair",
  "plate", "cloche", "food", "candle", "plant", "flowers",
  ...GUEST_SPRITES,
];

const INK = 0x171410;
const PAPER = 0xfbf7ee;
const BUTTER = 0xffd84d;
const PINK = 0xff4d9d;

function drawEffect(name: Exclude<EffectName, "shadow">): Graphics {
  const g = new Graphics();
  switch (name) {
    case "nameCard":
      g.moveTo(-28, 0).lineTo(28, 0).lineTo(26, -17).lineTo(-26, -17).closePath();
      g.fill({ color: PAPER }).stroke({ width: 2.5, color: INK, alignment: 0.5 });
      g.moveTo(-16, -7).lineTo(16, -7).stroke({ width: 2, color: INK, alpha: 0.28 });
      return g;
    case "spark":
      g.star(0, 0, 4, 7, 2.6).fill({ color: BUTTER });
      return g;
    // An ink curl, not a white puff. White steam over a cream tabletop is
    // invisible — it was drawn, it rose, and nobody could see it.
    case "steam":
      g.moveTo(0, 14)
        .bezierCurveTo(-9, 6, 9, 0, 0, -8)
        .bezierCurveTo(-8, -14, 6, -18, 2, -24)
        .stroke({ width: 3, color: INK, alpha: 0.55, cap: "round" });
      return g;
    case "confetti":
      g.rect(-4, -7, 8, 14).fill({ color: 0xffffff });
      return g;
    case "heart":
      g.moveTo(0, 7)
        .bezierCurveTo(-11, -1, -7, -11, 0, -5)
        .bezierCurveTo(7, -11, 11, -1, 0, 7)
        .closePath();
      g.fill({ color: PINK }).stroke({ width: 2.4, color: INK, alignment: 0.5 });
      return g;
  }
}

/** A soft dark blob. Drawn into a canvas because Graphics has no gradients. */
function makeShadow(): Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Texture.EMPTY;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(23,20,16,0.42)");
  g.addColorStop(0.55, "rgba(23,20,16,0.20)");
  g.addColorStop(1, "rgba(23,20,16,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(canvas);
}

/* Loaded once per page. Pixi's Assets cache means a second potluck opens
   instantly, and the browser cache means a second visit does too. */
export async function loadSprites(renderer: Renderer, base = "/potluck"): Promise<SpriteBank> {
  const manifest = (await fetch(`${base}/manifest.json`).then((r) => r.json())) as Manifest;

  const textures = await Promise.all(
    NAMES.map((name) => Assets.load<Texture>(`${base}/${name}.png`)),
  );

  const sprites = {} as Record<SpriteName, SpriteInfo>;
  NAMES.forEach((name, i) => {
    const entry = manifest.sprites[name];
    sprites[name] = {
      texture: textures[i],
      // A missing manifest entry would silently place a sprite at the wrong
      // size and the wrong spot, which is hard to see and easy to blame on
      // the art. Fall back to something obviously wrong instead.
      metres: entry?.metres ?? 1,
      anchor: entry?.anchor ?? [0.5, 0.5],
    };
  });

  const fx = { shadow: makeShadow() } as Record<EffectName, Texture>;
  for (const name of ["nameCard", "spark", "steam", "confetti", "heart"] as const) {
    const g = drawEffect(name);
    fx[name] = renderer.generateTexture(g);
    g.destroy();
  }

  return {
    sprites,
    fx,
    basis: { right: manifest.right, up: manifest.up },
  };
}

export function destroySprites(bank: SpriteBank) {
  for (const t of Object.values(bank.fx ?? {})) t?.destroy(true);
  // The sprite textures belong to Pixi's Assets cache, which is shared with
  // the next potluck opened in this session — destroying them here would make
  // the second visit re-download everything.
}
