/* Squeeze the rendered sprites, without touching how they look.
 *
 * Blender writes 16-bit-ish truecolour PNGs with a full alpha channel. The art
 * is flat fills and one ink line, so almost all of that range is unused: a
 * 512x512 guest came out at 155KB and there are fifteen of them. Four guest
 * variants pushed public/potluck past two megabytes, on a route a phone opens
 * from a text message.
 *
 * Palette quantisation is the right tool for exactly this kind of image — flat
 * colour plus an antialiased outline — and 128 colours is far more than the
 * handful each sprite actually contains. The edges stay smooth because the
 * alpha channel is quantised with them rather than thresholded.
 *
 *   node tools/blender/optimize_sprites.mjs
 *
 * Run it after potluck_assets.py. Running it twice is harmless: the second
 * pass re-encodes an already-small file to the same size.
 */

import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const DIR = path.join(process.cwd(), "public", "potluck");

const files = (await readdir(DIR)).filter((f) => f.endsWith(".png"));
let before = 0;
let after = 0;

for (const name of files) {
  const file = path.join(DIR, name);
  const was = (await stat(file)).size;
  const out = await sharp(await readFile(file))
    .png({ palette: true, colours: 128, effort: 10, compressionLevel: 9 })
    .toBuffer();

  // Never make a file bigger in the name of making it smaller.
  if (out.length < was) await writeFile(file, out);
  before += was;
  after += Math.min(out.length, was);
  console.log(`${name.padEnd(14)} ${(was / 1024).toFixed(0)}K → ${(Math.min(out.length, was) / 1024).toFixed(0)}K`);
}

console.log(`\ntotal ${(before / 1024).toFixed(0)}K → ${(after / 1024).toFixed(0)}K`);
