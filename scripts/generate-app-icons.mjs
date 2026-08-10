// Generates the app icon and the splash images from one SVG source, so the
// brand mark exists in exactly one place and every size is derived from it.
//
//   node scripts/generate-app-icons.mjs
//
// The mark is the START wordmark: black on white, with the green that the rest
// of the app uses as the single accent. No gradients and no transparency - iOS
// rejects an alpha channel in an app icon, and a flat mark stays legible at 40px.

import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const GREEN = "#16A34A";
const INK = "#0B0B0B";
const SURFACE = "#FFFFFF";

// Full bleed, no rounding of our own: iOS and Android both apply their own mask,
// and a pre-rounded square inside a white margin renders as a small icon
// floating in a white tile on the home screen.
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${INK}"/>
  <text x="512" y="470" fill="${SURFACE}" font-family="Helvetica, Arial, sans-serif" font-size="228"
        font-weight="700" letter-spacing="38" text-anchor="middle" dominant-baseline="central">START</text>
  <rect x="332" y="626" width="360" height="30" rx="15" fill="${GREEN}"/>
</svg>`;

// Android's adaptive foreground is masked to a shape and can be zoomed, so the
// mark has to sit inside the middle two thirds or the launcher will crop it.
const foreground = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <text x="512" y="486" fill="${INK}" font-family="Helvetica, Arial, sans-serif" font-size="150"
        font-weight="700" letter-spacing="25" text-anchor="middle" dominant-baseline="central">START</text>
  <rect x="392" y="590" width="240" height="20" rx="10" fill="${GREEN}"/>
</svg>`;

// The splash is wider than tall on some devices and taller on others, so the
// mark sits in the middle of a large square that is safe to centre-crop.
const splash = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2732 2732">
  <rect width="2732" height="2732" fill="${SURFACE}"/>
  <text x="1366" y="1366" fill="${INK}" font-family="Helvetica, Arial, sans-serif" font-size="300"
        font-weight="700" letter-spacing="52" text-anchor="middle" dominant-baseline="central">START</text>
  <rect x="1136" y="1520" width="460" height="30" rx="15" fill="${GREEN}"/>
</svg>`;

// An app icon with an alpha channel is rejected at upload, so everything is
// flattened - except the adaptive foreground, which is required to be
// transparent so the launcher can put its own background behind it.
const png = (svg, size, { transparent = false } = {}) => {
  const image = sharp(Buffer.from(svg)).resize(size, size);
  return (transparent ? image : image.flatten({ background: SURFACE })).png().toBuffer();
};

const targets = [
  // iOS asks for one 1024 master and generates the rest.
  { path: "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png", svg: icon, size: 1024 },
  { path: "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png", svg: splash, size: 2732 },
  { path: "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png", svg: splash, size: 2732 },
  { path: "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png", svg: splash, size: 2732 },
  // Android's launcher densities.
  { path: "android/app/src/main/res/mipmap-mdpi/ic_launcher.png", svg: icon, size: 48 },
  { path: "android/app/src/main/res/mipmap-hdpi/ic_launcher.png", svg: icon, size: 72 },
  { path: "android/app/src/main/res/mipmap-xhdpi/ic_launcher.png", svg: icon, size: 96 },
  { path: "android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png", svg: icon, size: 144 },
  { path: "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png", svg: icon, size: 192 },
  { path: "android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png", svg: icon, size: 48 },
  { path: "android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png", svg: icon, size: 72 },
  { path: "android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png", svg: icon, size: 96 },
  { path: "android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png", svg: icon, size: 144 },
  { path: "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png", svg: icon, size: 192 },
  { path: "android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png", svg: foreground, size: 108, transparent: true },
  { path: "android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png", svg: foreground, size: 162, transparent: true },
  { path: "android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png", svg: foreground, size: 216, transparent: true },
  { path: "android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png", svg: foreground, size: 324, transparent: true },
  { path: "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png", svg: foreground, size: 432, transparent: true },
  { path: "android/app/src/main/res/drawable/splash.png", svg: splash, size: 1280 },
  // The browser tab and the iOS home-screen bookmark.
  { path: "public/icon-192.png", svg: icon, size: 192 },
  { path: "public/icon-512.png", svg: icon, size: 512 },
  { path: "public/apple-touch-icon.png", svg: icon, size: 180 },
];

for (const target of targets) {
  const absolute = join(root, target.path);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, await png(target.svg, target.size, { transparent: target.transparent }));
  console.log(`${target.path}  ${target.size}px`);
}

// Kept alongside the exports so a future change starts from the mark, not from
// a resized PNG.
await writeFile(join(root, "public/brand-icon.svg"), icon);
console.log("public/brand-icon.svg");
