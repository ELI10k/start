// Derives the Android launcher icons and launch splash from the released iOS
// app icon, so the Android app shows the same LIFE FIT mark as the iPhone app.
//
//   node scripts/android/generate-android-assets.mjs
//
// The iOS icon is full bleed: the wheel on black, no alpha. Android draws its
// own mask, so the legacy icons are the same square (and a circle for the round
// variant), while the adaptive foreground shrinks the mark into the middle 61%
// that every launcher shape keeps.

import sharp from "sharp";
import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const source = join(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png");
const res = join(root, "android/app/src/main/res");

const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const circle = (size) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`);
const rounded = (size) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * 0.22}"/></svg>`);

for (const [density, scale] of Object.entries(densities)) {
  const dir = join(res, `mipmap-${density}`);
  const legacy = Math.round(48 * scale);
  const adaptive = Math.round(108 * scale);
  // The wheel spans 64% of the source; at 92% it spans 59%, inside the 61% safe zone.
  const mark = Math.round(adaptive * 0.92);

  await sharp(source).resize(legacy, legacy).png().toFile(join(dir, "ic_launcher.png"));
  await sharp(source)
    .resize(legacy, legacy)
    .composite([{ input: circle(legacy), blend: "dest-in" }])
    .png()
    .toFile(join(dir, "ic_launcher_round.png"));
  await sharp({ create: { width: adaptive, height: adaptive, channels: 4, background: "#000000" } })
    .composite([{ input: await sharp(source).resize(mark, mark).png().toBuffer(), gravity: "centre" }])
    .png()
    .toFile(join(dir, "ic_launcher_foreground.png"));
}

// The pre-Android 12 launch background: the icon, rounded, centred on white.
for (const entry of await readdir(res)) {
  if (!entry.startsWith("drawable")) continue;
  const file = join(res, entry, "splash.png");
  let meta;
  try {
    meta = await sharp(file).metadata();
  } catch {
    continue;
  }
  const size = Math.round(Math.min(meta.width, meta.height) * 0.28);
  const icon = await sharp(source)
    .resize(size, size)
    .composite([{ input: rounded(size), blend: "dest-in" }])
    .png()
    .toBuffer();
  await sharp({ create: { width: meta.width, height: meta.height, channels: 3, background: "#FFFFFF" } })
    .composite([{ input: icon, gravity: "centre" }])
    .png()
    .toFile(file);
}

console.log("Android icons and splash regenerated from the iOS app icon.");
