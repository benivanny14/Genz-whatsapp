#!/usr/bin/env node
/**
 * generate-maskable-icons.js — produces PWA maskable icons with safe-zone
 * padding from the existing full-bleed icon.
 *
 * Android/iOS mask the outer ~20% of a maskable icon (circle/rounded-square),
 * so any important artwork must live inside the central safe zone. The plain
 * icon-512 is full-bleed, so we rebuild a dedicated maskable variant: the
 * source icon scaled to 60% centered on the theme background (#075E54).
 *
 *   node scripts/generate-maskable-icons.js
 *
 * Writes public/icons/maskable-icon-192x192.png and maskable-icon-512x512.png,
 * then prints the manifest entries to use (they are also what public/
 * manifest.json now references).
 */
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(root, 'public/icons/icon-512x512.png');
const OUT_DIR = resolve(root, 'public/icons');
const BACKGROUND = '#075E54'; // WhatsApp green (matches splash + manifest bg)
const SIZES = [192, 512];
// Fraction of the canvas the source icon occupies (leaves safe-zone padding).
const SCALE = 0.6;

if (!existsSync(SRC)) {
  console.error(`❌ Source icon not found: ${SRC} — run the PWA icon generation first.`);
  process.exit(1);
}

for (const size of SIZES) {
  const inner = Math.round(size * SCALE);
  const resized = await sharp(SRC).resize(inner, inner).png().toBuffer();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BACKGROUND
    }
  })
    .composite([
      {
        input: resized,
        left: Math.round((size - inner) / 2),
        top: Math.round((size - inner) / 2)
      }
    ])
    .png()
    .toFile(resolve(OUT_DIR, `maskable-icon-${size}x${size}.png`));
  console.log(`  ✓ maskable-icon-${size}x${size}.png (safe-zone scaled to ${SCALE * 100}%)`);
}

console.log('\nManifest entries (already wired into public/manifest.json):');
console.log(`  { "src": "/icons/maskable-icon-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" }`);
console.log(`  { "src": "/icons/maskable-icon-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }`);
