import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const publicDir = join(rootDir, "public");

const svgBuffer = readFileSync(join(publicDir, "marco-icon.svg"));

async function generate() {
  // Generate 512x512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(join(publicDir, "marco-icon-512.png"));
  console.log("✓ marco-icon-512.png");

  // Generate 192x192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(join(publicDir, "marco-icon-192.png"));
  console.log("✓ marco-icon-192.png");

  // Generate 32x32 favicon
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(join(publicDir, "favicon-32.png"));
  console.log("✓ favicon-32.png");

  // Generate 180x180 apple-touch-icon
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(join(publicDir, "apple-touch-icon.png"));
  console.log("✓ apple-touch-icon.png");

  // Generate ICO (use 32x32 PNG as base, save as ico-compatible PNG)
  // For favicon.ico, we create a multi-size ICO
  const ico16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();
  const ico32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  const ico48 = await sharp(svgBuffer).resize(48, 48).png().toBuffer();

  // Create ICO file manually (ICO format with PNG payloads)
  const images = [
    { size: 16, data: ico16 },
    { size: 32, data: ico32 },
    { size: 48, data: ico48 },
  ];

  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * images.length;
  let offset = headerSize + dirSize;

  // ICO header
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);       // Reserved
  header.writeUInt16LE(1, 2);       // Type: 1 = ICO
  header.writeUInt16LE(images.length, 4); // Count

  const dirEntries = [];
  for (const img of images) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 0);  // Width
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 1);  // Height
    entry.writeUInt8(0, 2);          // Color palette
    entry.writeUInt8(0, 3);          // Reserved
    entry.writeUInt16LE(1, 4);       // Color planes
    entry.writeUInt16LE(32, 6);      // Bits per pixel
    entry.writeUInt32LE(img.data.length, 8);  // Size of image data
    entry.writeUInt32LE(offset, 12); // Offset to image data
    dirEntries.push(entry);
    offset += img.data.length;
  }

  const icoBuffer = Buffer.concat([header, ...dirEntries, ...images.map((i) => i.data)]);
  writeFileSync(join(rootDir, "src", "app", "favicon.ico"), icoBuffer);
  console.log("✓ favicon.ico");

  console.log("\nAll icons generated!");
}

generate().catch(console.error);
