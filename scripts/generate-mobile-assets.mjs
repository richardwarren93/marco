// Generate the source PNGs that @capacitor/assets consumes to produce the
// per-platform icon and splash sizes. Run this whenever the brand icon SVG
// changes; output goes to assets/ which is then fed into `cap-assets generate`.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const root = dirname(fileURLToPath(import.meta.url)) + "/..";
const SOURCE_SVG = join(root, "public/marco-icon.svg");
const OUT = join(root, "assets");

const ICON_SIZE = 1024;
const SPLASH_SIZE = 2732;
// Logo on the splash should be ~24% of the canvas — comfortable for both
// landscape and portrait, well inside Apple's 1330x1330 launch-screen zone.
const SPLASH_LOGO_SIZE = Math.round(SPLASH_SIZE * 0.24);

const CREAM = { r: 0xf5, g: 0xee, b: 0xe2, alpha: 1 };

async function main() {
  await mkdir(OUT, { recursive: true });
  const svgBuf = await readFile(SOURCE_SVG);

  // 1) Full-bleed app icon — iOS uses this as-is (it masks the corners
  //    itself), Android uses it as the legacy launcher icon.
  const iconPng = await sharp(svgBuf, { density: 512 })
    .resize(ICON_SIZE, ICON_SIZE)
    .png()
    .toBuffer();
  await writeFile(join(OUT, "icon.png"), iconPng);

  // 2) Splash — cream canvas with the icon centered. The logo asset for the
  //    splash is the same SVG but a hair smaller; cream surround so the
  //    rounded tomato square reads as a logo, not as a clipped background.
  const splashLogo = await sharp(svgBuf, { density: 512 })
    .resize(SPLASH_LOGO_SIZE, SPLASH_LOGO_SIZE)
    .png()
    .toBuffer();
  const splash = await sharp({
    create: {
      width: SPLASH_SIZE,
      height: SPLASH_SIZE,
      channels: 4,
      background: CREAM,
    },
  })
    .composite([{ input: splashLogo, gravity: "center" }])
    .png()
    .toBuffer();
  await writeFile(join(OUT, "splash.png"), splash);
  // Same image for dark — Marco doesn't have a dark theme yet so we don't
  // distinguish; keeps the cream consistent with the in-app palette.
  await writeFile(join(OUT, "splash-dark.png"), splash);

  console.log(`✓ wrote ${OUT}/icon.png (${ICON_SIZE}x${ICON_SIZE})`);
  console.log(`✓ wrote ${OUT}/splash.png (${SPLASH_SIZE}x${SPLASH_SIZE})`);
  console.log(`✓ wrote ${OUT}/splash-dark.png (${SPLASH_SIZE}x${SPLASH_SIZE})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
