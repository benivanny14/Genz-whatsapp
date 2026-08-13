#!/usr/bin/env node
/**
 * generate-ios-icons.js — brands the iOS app icon + splash with the real GENZ
 * icon (from public/icons/genz-icon-master.svg), matching the Android assets.
 *
 * Generates (writes into ios/App/App/Assets.xcassets):
 *   - AppIcon.appiconset/AppIcon-512@2x.png   → 1024×1024 (Xcode 14+ single-size)
 *   - Splash.imageset/splash-2732x2732{,-1,-2}.png → 2732×2732 dark #0c0a1e
 *     background + centered icon (same look as the Android splash screens)
 *
 * Requires `sharp` (available in backend/node_modules — the repo's standard
 * install runs `npm install --prefix backend` via root postinstall).
 *
 * Usage: node scripts/generate-ios-icons.js   (then `npx cap sync ios` if the
 * native project was just created — the assets live in the repo, not in dist)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// sharp lives in backend/node_modules — resolve it there first, fall back to a local install.
let sharp;
try {
  sharp = require('sharp');
} catch {
  sharp = require(resolve(root, '../backend/node_modules/sharp'));
}

const masterSvg = readFileSync(resolve(root, 'public/icons/genz-icon-master.svg'), 'utf8');

const appIconPath = resolve(
  root, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'
);
const splashDir = resolve(root, 'ios/App/App/Assets.xcassets/Splash.imageset');

async function render(svg, size) {
  return sharp(Buffer.from(svg), { density: 300 }).resize(size, size).png().toBuffer();
}

async function renderSplash(size) {
  const iconSize = Math.round(size * 0.3);
  const iconBuf = await render(masterSvg, iconSize);
  const bg = sharp({ create: { width: size, height: size, channels: 4, background: { r: 12, g: 10, b: 30, alpha: 1 } } }); // #0c0a1e
  return bg
    .composite([{ input: iconBuf, left: Math.round((size - iconSize) / 2), top: Math.round((size - iconSize) / 2) }])
    .png()
    .toBuffer();
}

async function main() {
  console.log('[ios-icons] app icon → 1024×1024');
  mkdirSync(dirname(appIconPath), { recursive: true });
  writeFileSync(appIconPath, await render(masterSvg, 1024));

  console.log('[ios-icons] splash → 2732×2732 (dark #0c0a1e + centered icon)');
  mkdirSync(splashDir, { recursive: true });
  const splashBuf = await renderSplash(2732);
  writeFileSync(resolve(splashDir, 'splash-2732x2732.png'), splashBuf);
  writeFileSync(resolve(splashDir, 'splash-2732x2732-1.png'), splashBuf);
  writeFileSync(resolve(splashDir, 'splash-2732x2732-2.png'), splashBuf);

  console.log('[ios-icons] done ✓ (rebuild in Xcode to see it)');
}

main().catch((err) => {
  console.error('[ios-icons] FAILED:', err.message);
  process.exit(1);
});
