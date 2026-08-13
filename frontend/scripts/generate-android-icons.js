#!/usr/bin/env node
/**
 * generate-android-icons.js — brands the Android launcher icon + splash with
 * the real GENZ icon (from public/icons/genz-icon-master.svg).
 *
 * Generates (writes into android/app/src/main/res):
 *   - Legacy launcher icons  mipmap-{dpi}/ic_launcher.png + ic_launcher_round.png
 *   - Adaptive foreground    mipmap-{dpi}/ic_launcher_foreground.png (glyph at ~56% width)
 *   - Adaptive background    values/ic_launcher_background.xml  → #04785c (brand teal)
 *   - Splash screens         drawable{, -port-*, -land-*}/splash.png
 *                            (#0c0a1e dark bg + centered icon, matching the app's login bg)
 *
 * Requires `sharp` (available in backend/node_modules — the repo's standard
 * install runs `npm install --prefix backend` via root postinstall).
 *
 * Usage: node scripts/generate-android-icons.js
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

// ── Glyph-only SVG (bubble + typing dots + spark, no gradient background) ──
// Keeps the original defs (glass gradients, clip path) but drops the two
// full-square background rects so the adaptive foreground is transparent.
const glyphSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow" cx="50%" cy="38%" r="65%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35"/>
      <stop offset="55%" stop-color="#ffffff" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="glassFill" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.16"/>
    </linearGradient>
    <linearGradient id="shine" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>
      <stop offset="35%" stop-color="#ffffff" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff8dc"/>
      <stop offset="100%" stop-color="#ffd166"/>
    </linearGradient>
    <clipPath id="bubbleClip">
      <path d="M256 108c88.4 0 160 60.7 160 135.6 0 74.9-71.6 135.6-160 135.6-16.3 0-32-2.1-46.8-6l-46.3 27.6c-6.9 4.1-15.5-2.1-13.6-9.9l11.9-49.2C165 316.4 96 285.4 96 243.6 96 168.7 167.6 108 256 108z"/>
    </clipPath>
  </defs>
  <path d="M256 108c88.4 0 160 60.7 160 135.6 0 74.9-71.6 135.6-160 135.6-16.3 0-32-2.1-46.8-6l-46.3 27.6c-6.9 4.1-15.5-2.1-13.6-9.9l11.9-49.2C165 316.4 96 285.4 96 243.6 96 168.7 167.6 108 256 108z"
        fill="url(#glassFill)" stroke="#ffffff" stroke-opacity="0.65" stroke-width="4"/>
  <g clip-path="url(#bubbleClip)">
    <polygon points="120,120 260,120 160,300 100,300" fill="url(#shine)"/>
  </g>
  <circle cx="211" cy="243" r="15" fill="#0a3d3a"/>
  <circle cx="256" cy="243" r="15" fill="#0a3d3a"/>
  <circle cx="301" cy="243" r="15" fill="#0a3d3a"/>
  <path d="M372 336l14-40 10 28 30-12-22 34 26 10-38 4 6 30-20-24-24 18 8-30-32-6z"
        fill="url(#sparkGrad)" opacity="0.95"/>
</svg>`;

const res = (rel) => resolve(root, 'android/app/src/main/res', rel);

// Glyph content spans x:96→426 (330px wide) within the 512 canvas.
const GLYPH_W = 330;
const SAFE_FRAC = 0.56; // adaptive foreground glyph ≈ 56% of the 108dp canvas

async function render(svg, size) {
  return sharp(Buffer.from(svg), { density: 300 }).resize(size, size).png().toBuffer();
}

async function renderGlyphOnCanvas(canvasPx) {
  // Render the glyph at the size that makes its content ≈ SAFE_FRAC of the canvas, centered.
  const renderPx = Math.round((SAFE_FRAC * canvasPx * 512) / GLYPH_W);
  const glyphBuf = await render(glyphSvg, renderPx);
  const canvas = sharp({ create: { width: canvasPx, height: canvasPx, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  const offset = Math.round((canvasPx - renderPx) / 2);
  return canvas.composite([{ input: glyphBuf, left: offset, top: offset }]).png().toBuffer();
}

async function renderSplash(width, height) {
  const iconSize = Math.round(Math.min(width, height) * 0.3);
  const iconBuf = await render(masterSvg, iconSize);
  const bg = sharp({ create: { width, height, channels: 4, background: { r: 12, g: 10, b: 30, alpha: 1 } } }); // #0c0a1e
  return bg.composite([{ input: iconBuf, left: Math.round((width - iconSize) / 2), top: Math.round((height - iconSize) / 2) }]).png().toBuffer();
}

const DENSITIES = [
  { dpi: 'mdpi', px: 48, canvas: 108 },
  { dpi: 'hdpi', px: 72, canvas: 162 },
  { dpi: 'xhdpi', px: 96, canvas: 216 },
  { dpi: 'xxhdpi', px: 144, canvas: 324 },
  { dpi: 'xxxhdpi', px: 192, canvas: 432 },
];

const SPLASH_SIZES = [
  ['drawable', 480, 320],
  ['drawable-port-mdpi', 320, 480],
  ['drawable-port-hdpi', 480, 800],
  ['drawable-port-xhdpi', 720, 1280],
  ['drawable-port-xxhdpi', 960, 1600],
  ['drawable-port-xxxhdpi', 1280, 1920],
  ['drawable-land-mdpi', 480, 320],
  ['drawable-land-hdpi', 800, 480],
  ['drawable-land-xhdpi', 1280, 720],
  ['drawable-land-xxhdpi', 1600, 960],
  ['drawable-land-xxxhdpi', 1920, 1280],
];

async function main() {
  console.log('[icons] legacy launcher icons + adaptive foregrounds');
  for (const { dpi, px, canvas } of DENSITIES) {
    const dir = res(`mipmap-${dpi}`);
    mkdirSync(dir, { recursive: true });
    const legacy = await render(masterSvg, px);
    writeFileSync(resolve(dir, 'ic_launcher.png'), legacy);
    writeFileSync(resolve(dir, 'ic_launcher_round.png'), legacy);
    const fg = await renderGlyphOnCanvas(canvas);
    writeFileSync(resolve(dir, 'ic_launcher_foreground.png'), fg);
    console.log(`  mipmap-${dpi}: launcher ${px}px, foreground ${canvas}px`);
  }

  console.log('[icons] adaptive background color → brand teal #04785c');
  writeFileSync(
    res('values/ic_launcher_background.xml'),
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#04785C</color>\n</resources>\n'
  );

  console.log('[icons] splash screens (dark #0c0a1e + centered icon)');
  for (const [folder, w, h] of SPLASH_SIZES) {
    const dir = res(folder);
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, 'splash.png'), await renderSplash(w, h));
    console.log(`  ${folder}: ${w}x${h}`);
  }

  console.log('[icons] done ✓');
}

main().catch((err) => {
  console.error('[icons] FAILED:', err.message);
  process.exit(1);
});
